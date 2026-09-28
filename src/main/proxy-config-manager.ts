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
    const { type, pkgManager } = await this.detectOS(connId)

    const script = `proxy_server="${proxyIP}"
echo "proxy_server=\${proxy_server}" >> ~/.bashrc
echo "export http_proxy=http://\\\${proxy_server}:${port}" >> ~/.bashrc
echo "export https_proxy=http://\\\${proxy_server}:${port}" >> ~/.bashrc
echo "proxy_server=\${proxy_server}" >> /etc/profile
echo "export http_proxy=http://\\\${proxy_server}:${port}" >> /etc/profile
echo "export https_proxy=http://\\\${proxy_server}:${port}" >> /etc/profile
echo "sslverify=0" >> /etc/yum.conf
source ~/.bashrc`

    try {
      const result = await this.ssh.exec(connId, script)
      if (result.code !== 0) {
        return {
          success: false,
          message: `系统: ${type}, 包管理器: ${pkgManager}\n写入代理配置失败: ${result.stderr || `退出码 ${result.code}`}`
        }
      }
      return {
        success: true,
        message: `系统: ${type}, 包管理器: ${pkgManager}\n已写入代理: proxy_server=${proxyIP}, http_proxy=http://${proxyIP}:${port}`
      }
    } catch (error: any) {
      return {
        success: false,
        message: `系统: ${type}, 包管理器: ${pkgManager}\n写入代理配置失败: ${error?.message || error}`
      }
    }
  }

  async removeProxy(connId: string): Promise<{ success: boolean; message: string }> {
    const commands: string[] = []

    commands.push(`sed -i '/proxy_server/d' ~/.bashrc 2>/dev/null || true`)
    commands.push(`sed -i '/http_proxy/d' ~/.bashrc 2>/dev/null || true`)
    commands.push(`sed -i '/https_proxy/d' ~/.bashrc 2>/dev/null || true`)
    commands.push(`sed -i '/proxy_server/d' /etc/profile 2>/dev/null || true`)
    commands.push(`sed -i '/http_proxy/d' /etc/profile 2>/dev/null || true`)
    commands.push(`sed -i '/https_proxy/d' /etc/profile 2>/dev/null || true`)
    commands.push(`sed -i '/sslverify/d' /etc/yum.conf 2>/dev/null || true`)
    commands.push(`unset http_proxy https_proxy proxy_server 2>/dev/null || true`)

    const fullCmd = commands.join('\n')
    try {
      await this.ssh.exec(connId, fullCmd)
    } catch {}

    return { success: true, message: '代理配置已移除' }
  }
}
