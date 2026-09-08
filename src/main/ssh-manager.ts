import { Client } from 'ssh2'

export interface SSHConfig {
  id: string
  host: string
  port?: number
  username: string
  password: string
}

interface SSHConnection {
  client: Client
  config: SSHConfig
  streams: Map<string, any>
  sftp: any
}

export class SSHManager {
  private connections = new Map<string, SSHConnection>()
  private execCounter = 0

  async connect(config: SSHConfig): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const client = new Client()
      client.on('ready', () => {
        this.connections.set(config.id, {
          client,
          config,
          streams: new Map(),
          sftp: null
        })
        resolve(true)
      })
      client.on('error', (err) => {
        reject(err)
      })
      client.connect({
        host: config.host,
        port: config.port || 22,
        username: config.username,
        password: config.password,
        readyTimeout: 10000
      })
    })
  }

  async disconnect(id: string): Promise<boolean> {
    const conn = this.connections.get(id)
    if (!conn) return false
    conn.streams.forEach((stream) => {
      try { stream.end() } catch {}
    })
    try { conn.sftp?.end() } catch {}
    conn.client.end()
    this.connections.delete(id)
    return true
  }

  disconnectAll() {
    for (const id of this.connections.keys()) {
      this.disconnect(id)
    }
  }

  private getConnection(id: string): SSHConnection {
    const conn = this.connections.get(id)
    if (!conn) throw new Error(`SSH connection ${id} not found`)
    return conn
  }

  private getSftp(conn: SSHConnection): Promise<any> {
    if (conn.sftp) return Promise.resolve(conn.sftp)
    return new Promise((resolve, reject) => {
      conn.client.sftp((err: Error | undefined, sftp: any) => {
        if (err) return reject(err)
        conn.sftp = sftp
        resolve(sftp)
      })
    })
  }

  async readFile(id: string, path: string): Promise<string> {
    const conn = this.getConnection(id)
    const sftp = await this.getSftp(conn)
    return new Promise((resolve, reject) => {
      sftp.readFile(path, 'utf-8', (err: Error | undefined, data: Buffer | string) => {
        if (err) {
          reject(new Error(`读取文件失败: ${path} (code: ${(err as any).code})`))
          return
        }
        resolve(typeof data === 'string' ? data : data.toString('utf-8'))
      })
    })
  }

  async writeFile(id: string, path: string, content: string): Promise<boolean> {
    const conn = this.getConnection(id)
    const sftp = await this.getSftp(conn)
    return new Promise((resolve, reject) => {
      sftp.writeFile(path, content, 'utf-8', (err: Error | undefined) => {
        if (err) return reject(err)
        resolve(true)
      })
    })
  }

  async listDir(id: string, path: string): Promise<DirEntry[]> {
    const conn = this.getConnection(id)
    const sftp = await this.getSftp(conn)
    return new Promise((resolve, reject) => {
      sftp.readdir(path, (err: Error | undefined, list: any[]) => {
        if (err) return reject(err)
        const entries: DirEntry[] = list.map(item => ({
          name: item.filename,
          isDir: item.attrs.isDirectory(),
          size: item.attrs.size,
          modifyTime: item.attrs.mtime * 1000
        }))
        resolve(entries)
      })
    })
  }

  async exec(id: string, command: string): Promise<ExecResult> {
    const conn = this.getConnection(id)
    return new Promise((resolve, reject) => {
      conn.client.exec(command, (err, stream) => {
        if (err) return reject(err)
        let stdout = ''
        let stderr = ''
        stream.on('close', (code: number) => {
          resolve({ stdout, stderr, code })
        })
        stream.on('data', (data: Buffer) => {
          stdout += data.toString()
        })
        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString()
        })
      })
    })
  }

  async execStream(
    id: string,
    command: string,
    onData: (data: string) => void
  ): Promise<ExecResult> {
    const conn = this.getConnection(id)
    const execId = `exec_${++this.execCounter}`
    return new Promise((resolve, reject) => {
      conn.client.exec(command, (err, stream) => {
        if (err) return reject(err)
        conn.streams.set(execId, stream)
        let stdout = ''
        let stderr = ''
        stream.on('close', (code: number) => {
          conn.streams.delete(execId)
          resolve({ stdout, stderr, code })
        })
        stream.on('data', (data: Buffer) => {
          const text = data.toString()
          stdout += text
          onData(text)
        })
        stream.stderr.on('data', (data: Buffer) => {
          const text = data.toString()
          stderr += text
          onData(text)
        })
      })
    })
  }

  async execAbort(id: string, execId: string): Promise<boolean> {
    const conn = this.getConnection(id)
    const stream = conn.streams.get(execId)
    if (!stream) return false
    try {
      stream.end()
      conn.streams.delete(execId)
      return true
    } catch {
      return false
    }
  }
}

export interface DirEntry {
  name: string
  isDir: boolean
  size: number
  modifyTime: number
}

export interface ExecResult {
  stdout: string
  stderr: string
  code: number
}
