import type { SSHManager } from './ssh-manager'

export class ProxyConfigManager {
  private ssh: SSHManager

  constructor(ssh: SSHManager) {
    this.ssh = ssh
  }

  async detectOS(connId: string): Promise<{ type: string; pkgManager: string }> {
    const result = await this.ssh.exec(connId, 'cat /etc/os-release 2>/dev/null || cat /etc/redhat-release 2>/dev/null')
    const text = (result.stdout + result.stderr).toLowerCase()

    let type = 'unknown'
    let pkgManager = 'unknown'

    if (text.includes('ubuntu') || text.includes('debian')) {
      type = 'debian'
      pkgManager = 'apt'
    } else if (text.includes('centos') || text.includes('rhel') || text.includes('red hat') || text.includes('openeuler') || text.includes('fedora') || text.includes('rocky') || text.includes('almalinux')) {
      type = 'rhel'
      if (text.includes('fedora') || text.includes('rocky') || text.includes('almalinux') || text.includes('openeuler') || text.includes('version=8') || text.includes('version=9')) {
        pkgManager = 'dnf'
      } else {
        pkgManager = 'yum'
      }
    } else if (text.includes('arch') || text.includes('manjaro')) {
      type = 'arch'
      pkgManager = 'pacman'
    } else if (text.includes('suse') || text.includes('sles')) {
      type = 'suse'
      pkgManager = 'zypper'
    }

    // 兜底检测
    if (pkgManager === 'unknown') {
      const check = await this.ssh.exec(connId, 'which dnf yum apt pacman zypper 2>/dev/null')
      const paths = check.stdout
      if (paths.includes('dnf')) pkgManager = 'dnf'
      else if (paths.includes('yum')) pkgManager = 'yum'
      else if (paths.includes('apt')) pkgManager = 'apt'
      else if (paths.includes('pacman')) pkgManager = 'pacman'
      else if (paths.includes('zypper')) pkgManager = 'zypper'
    }

    return { type, pkgManager }
  }

  async applyProxy(connId: string, proxyIP: string, port: number): Promise<{ success: boolean; message: string }> {
    const proxyAddr = `http://${proxyIP}:${port}`
    const { type, pkgManager } = await this.detectOS(connId)
    const commands: string[] = []

    // 1. 全局环境变量 (/etc/environment)
    commands.push(`sed -i '/http_proxy/d' /etc/environment`)
    commands.push(`sed -i '/https_proxy/d' /etc/environment`)
    commands.push(`sed -i '/no_proxy/d' /etc/environment`)
    commands.push(`echo 'http_proxy="${proxyAddr}"' >> /etc/environment`)
    commands.push(`echo 'https_proxy="${proxyAddr}"' >> /etc/environment`)
    commands.push(`echo 'no_proxy="localhost,127.0.0.1,::1"' >> /etc/environment`)

    // 2. /etc/profile.d/proxy.sh
    commands.push(`cat > /etc/profile.d/proxy.sh << 'EOF'
export http_proxy=${proxyAddr}
export https_proxy=${proxyAddr}
export no_proxy=localhost,127.0.0.1,::1
export HTTP_PROXY=${proxyAddr}
export HTTPS_PROXY=${proxyAddr}
export NO_PROXY=localhost,127.0.0.1,::1
EOF`)
    commands.push(`chmod 644 /etc/profile.d/proxy.sh`)

    // 3. 当前 SSH 用户的交互式 Bash 环境
    commands.push(`sed -i '/# >>> BenchFlow proxy >>>/,/# <<< BenchFlow proxy <<</d' "$HOME/.bashrc" 2>/dev/null || true`)
    commands.push(`cat >> "$HOME/.bashrc" << 'EOF'
# >>> BenchFlow proxy >>>
export http_proxy=${proxyAddr}
export https_proxy=${proxyAddr}
export no_proxy=localhost,127.0.0.1,::1
export HTTP_PROXY=${proxyAddr}
export HTTPS_PROXY=${proxyAddr}
export NO_PROXY=localhost,127.0.0.1,::1
# <<< BenchFlow proxy <<<
EOF`)

    // 4. 包管理器配置
    if (pkgManager === 'dnf') {
      commands.push(`sed -i '/^proxy=/d' /etc/dnf/dnf.conf 2>/dev/null || true`)
      commands.push(`echo 'proxy=${proxyAddr}' >> /etc/dnf/dnf.conf`)
    } else if (pkgManager === 'yum') {
      commands.push(`sed -i '/^proxy=/d' /etc/yum.conf 2>/dev/null || true`)
      commands.push(`echo 'proxy=${proxyAddr}' >> /etc/yum.conf`)
    } else if (pkgManager === 'apt') {
      commands.push(`cat > /etc/apt/apt.conf.d/99proxy << 'EOF'
Acquire::http::Proxy "${proxyAddr}";
Acquire::https::Proxy "${proxyAddr}";
EOF`)
    } else if (pkgManager === 'pacman') {
      commands.push(`sed -i '/^XferCommand/d' /etc/pacman.conf 2>/dev/null || true`)
      commands.push(`sed -i '/\\[options\\]/a XferCommand = /usr/bin/curl -x ${proxyAddr} -fC - --retry 3 --retry-delay 3 -o %o %u' /etc/pacman.conf`)
    } else if (pkgManager === 'zypper') {
      commands.push(`sed -i '/proxy/d' /etc/zypp/zypp.conf 2>/dev/null || true`)
      commands.push(`echo 'proxy = ${proxyAddr}' >> /etc/zypp/zypp.conf`)
    }

    // 5. 当前会话生效
    commands.push(`export http_proxy=${proxyAddr} https_proxy=${proxyAddr} no_proxy=localhost,127.0.0.1,::1`)

    // 执行所有命令
    const fullCmd = commands.join('\n')
    try {
      const result = await this.ssh.exec(connId, fullCmd)
      if (result.code !== 0 && result.stderr) {
        // 部分命令可能失败，继续验证
      }
    } catch {}

    // 验证
    const verifyResult = await this.verifyProxy(connId, proxyAddr)
    return {
      success: verifyResult.success,
      message: `系统: ${type}, 包管理器: ${pkgManager}\n${verifyResult.message}`
    }
  }

  async removeProxy(connId: string): Promise<{ success: boolean; message: string }> {
    const { pkgManager } = await this.detectOS(connId)
    const commands: string[] = []

    // 清理 /etc/environment
    commands.push(`sed -i '/http_proxy/d' /etc/environment`)
    commands.push(`sed -i '/https_proxy/d' /etc/environment`)
    commands.push(`sed -i '/no_proxy/d' /etc/environment`)

    // 清理 profile.d
    commands.push(`rm -f /etc/profile.d/proxy.sh`)

    // 清理当前 SSH 用户的交互式 Bash 配置
    commands.push(`sed -i '/# >>> BenchFlow proxy >>>/,/# <<< BenchFlow proxy <<</d' "$HOME/.bashrc" 2>/dev/null || true`)

    // 清理包管理器配置
    if (pkgManager === 'dnf') {
      commands.push(`sed -i '/^proxy=/d' /etc/dnf/dnf.conf 2>/dev/null || true`)
    } else if (pkgManager === 'yum') {
      commands.push(`sed -i '/^proxy=/d' /etc/yum.conf 2>/dev/null || true`)
    } else if (pkgManager === 'apt') {
      commands.push(`rm -f /etc/apt/apt.conf.d/99proxy`)
    } else if (pkgManager === 'pacman') {
      commands.push(`sed -i '/^XferCommand/d' /etc/pacman.conf 2>/dev/null || true`)
    } else if (pkgManager === 'zypper') {
      commands.push(`sed -i '/proxy/d' /etc/zypp/zypp.conf 2>/dev/null || true`)
    }

    commands.push(`unset http_proxy https_proxy no_proxy HTTP_PROXY HTTPS_PROXY NO_PROXY 2>/dev/null || true`)

    const fullCmd = commands.join('\n')
    try {
      await this.ssh.exec(connId, fullCmd)
    } catch {}

    return { success: true, message: '代理配置已移除' }
  }

  async verifyProxy(connId: string, expectedProxy: string): Promise<{ success: boolean; message: string }> {
    const checks: string[] = []

    // 检查环境变量
    try {
      const result = await this.ssh.exec(connId, 'source /etc/profile.d/proxy.sh 2>/dev/null; echo "http_proxy=$http_proxy"')
      if (result.stdout.includes(expectedProxy)) {
        checks.push('✓ 环境变量 http_proxy 已配置')
      } else {
        checks.push('✗ 环境变量 http_proxy 未生效')
      }
    } catch {
      checks.push('✗ 环境变量检查失败')
    }

    // 检查包管理器
    const { pkgManager } = await this.detectOS(connId)
    if (pkgManager === 'dnf') {
      try {
        const result = await this.ssh.exec(connId, 'grep proxy /etc/dnf/dnf.conf 2>/dev/null')
        if (result.stdout.includes(expectedProxy)) {
          checks.push('✓ dnf.conf 已配置代理')
        } else {
          checks.push('✗ dnf.conf 代理未找到')
        }
      } catch {
        checks.push('✗ dnf.conf 检查失败')
      }
    } else if (pkgManager === 'yum') {
      try {
        const result = await this.ssh.exec(connId, 'grep proxy /etc/yum.conf 2>/dev/null')
        if (result.stdout.includes(expectedProxy)) {
          checks.push('✓ yum.conf 已配置代理')
        } else {
          checks.push('✗ yum.conf 代理未找到')
        }
      } catch {
        checks.push('✗ yum.conf 检查失败')
      }
    } else if (pkgManager === 'apt') {
      try {
        const result = await this.ssh.exec(connId, 'cat /etc/apt/apt.conf.d/99proxy 2>/dev/null')
        if (result.stdout.includes(expectedProxy)) {
          checks.push('✓ apt 代理已配置')
        } else {
          checks.push('✗ apt 代理未找到')
        }
      } catch {
        checks.push('✗ apt 检查失败')
      }
    }

    // 尝试通过代理访问测试
    try {
      const result = await this.ssh.exec(connId, `source /etc/profile.d/proxy.sh 2>/dev/null; curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 http://mirrors.aliyun.com 2>/dev/null || echo 'fail'`)
      if (result.stdout.trim() === '200' || result.stdout.trim() === '301' || result.stdout.trim() === '302') {
        checks.push('✓ 代理连通性测试通过')
      } else if (result.stdout.includes('fail')) {
        checks.push('⚠ 代理连通性测试失败（代理服务可能未开启）')
      } else {
        checks.push(`⚠ 代理测试返回: ${result.stdout.trim()}`)
      }
    } catch {
      checks.push('⚠ 代理连通性测试失败')
    }

    const success = checks.filter(c => c.startsWith('✓')).length >= 2
    return { success, message: checks.join('\n') }
  }
}
