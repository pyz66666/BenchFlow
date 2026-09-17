import { exec, ChildProcess } from 'child_process'

export interface TunnelConfig {
  id: string
  name: string
  localPort: number
  remoteHost: string
  remotePort: number
  sshHost: string
  sshPort: number
  sshUser: string
  sshPassword: string
  bindAddress: string
}

export interface TunnelInfo {
  id: string
  name: string
  localPort: number
  remoteHost: string
  remotePort: number
  sshHost: string
  status: 'running' | 'stopped' | 'error'
  bindAddress: string
}

interface TunnelEntry {
  config: TunnelConfig
  process: ChildProcess | null
  status: 'running' | 'stopped' | 'error'
}

export class TunnelManager {
  private tunnels = new Map<string, TunnelEntry>()

  async create(config: TunnelConfig): Promise<TunnelInfo> {
    if (this.tunnels.has(config.id)) {
      await this.remove(config.id)
    }

    const entry: TunnelEntry = {
      config,
      process: null,
      status: 'running'
    }

    const sshArgs = [
      '-N',
      '-L', `${config.bindAddress}:${config.localPort}:${config.remoteHost}:${config.remotePort}`,
      '-p', String(config.sshPort),
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      `${config.sshUser}@${config.sshHost}`
    ]

    const proc = exec('ssh ' + sshArgs.join(' '), {
      timeout: 0
    })

    entry.process = proc

    proc.on('error', () => {
      entry.status = 'error'
    })

    proc.on('exit', () => {
      entry.status = 'stopped'
    })

    this.tunnels.set(config.id, entry)

    return this.toInfo(entry)
  }

  async remove(id: string): Promise<boolean> {
    const entry = this.tunnels.get(id)
    if (!entry) return false
    if (entry.process) {
      try {
        entry.process.kill('SIGTERM')
      } catch {}
    }
    this.tunnels.delete(id)
    return true
  }

  list(): TunnelInfo[] {
    return Array.from(this.tunnels.values()).map(e => this.toInfo(e))
  }

  async removeAll(): Promise<boolean> {
    for (const id of this.tunnels.keys()) {
      await this.remove(id)
    }
    return true
  }

  private toInfo(entry: TunnelEntry): TunnelInfo {
    return {
      id: entry.config.id,
      name: entry.config.name,
      localPort: entry.config.localPort,
      remoteHost: entry.config.remoteHost,
      remotePort: entry.config.remotePort,
      sshHost: entry.config.sshHost,
      status: entry.status,
      bindAddress: entry.config.bindAddress
    }
  }
}
