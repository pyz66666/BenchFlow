import assert from 'node:assert/strict'
import { ProxyConfigManager } from '../src/main/proxy-config-manager.ts'

const commands = []
const ssh = {
  async exec(_connectionId, command) {
    commands.push(command)
    if (command.includes('/etc/os-release')) {
      return { code: 0, stdout: 'ID=ubuntu', stderr: '' }
    }
    if (command.includes('echo "http_proxy=$http_proxy"')) {
      return { code: 0, stdout: 'http_proxy=http://192.168.64.1:8888\n', stderr: '' }
    }
    if (command.includes('99proxy')) {
      return { code: 0, stdout: 'Acquire::http::Proxy "http://192.168.64.1:8888";\n', stderr: '' }
    }
    if (command.includes('mirrors.aliyun.com')) {
      return { code: 0, stdout: '200', stderr: '' }
    }
    return { code: 0, stdout: '', stderr: '' }
  }
}

const manager = new ProxyConfigManager(ssh)
const result = await manager.applyProxy('conn_1', '192.168.64.1', 8888)
const applyCommand = commands.find(command => command.includes('cat > /etc/profile.d/proxy.sh'))

assert.equal(result.success, true)
assert.ok(applyCommand)
assert.match(applyCommand, /\nEOF\nchmod 644 \/etc\/profile\.d\/proxy\.sh/)
assert.match(applyCommand, /cat >> "\$HOME\/.bashrc" << 'EOF'/)
assert.match(applyCommand, /# >>> BenchFlow proxy >>>/)
assert.doesNotMatch(applyCommand, /EOF &&/)

console.log('Proxy configuration here-document check passed')
