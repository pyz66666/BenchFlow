import { Server, Socket } from 'net'
import { createServer as httpCreateServer, request as httpRequest, IncomingMessage, ServerResponse } from 'http'
import { connect as netConnect } from 'net'

export interface ProxyLogEntry {
  timestamp: number
  sourceIP: string
  method: string
  targetHost: string
  targetPort: number
  status: 'connected' | 'error' | 'closed'
  bytesSent: number
  bytesReceived: number
}

export class ProxyManager {
  private server: Server | null = null
  private logs: ProxyLogEntry[] = []
  private running = false
  private port = 8888
  private onLogCallback: ((log: ProxyLogEntry) => void) | null = null

  async start(port: number = 8888): Promise<boolean> {
    if (this.running && this.port === port) return true
    if (this.running) this.stop()
    this.port = port
    this.logs = []

    this.server = httpCreateServer((req: IncomingMessage, res: ServerResponse) => {
      this.handleHttpRequest(req, res)
    })

    // CONNECT 方法用于 HTTPS 隧道
    this.server.on('connect', (req: IncomingMessage, socket: Socket, head: Buffer) => {
      this.handleConnect(req, socket, head)
    })

    this.server.on('error', () => {
      this.running = false
    })

    return new Promise((resolve) => {
      const onStartError = () => resolve(false)
      this.server!.once('error', onStartError)
      this.server!.listen(port, '0.0.0.0', () => {
        this.server!.off('error', onStartError)
        this.running = true
        resolve(true)
      })
    })
  }

  stop(): boolean {
    if (this.server) {
      this.server.close()
      this.server = null
    }
    this.running = false
    return true
  }

  isRunning(): boolean {
    return this.running
  }

  getLogs(): ProxyLogEntry[] {
    return this.logs
  }

  clearLogs(): void {
    this.logs = []
  }

  onLog(callback: (log: ProxyLogEntry) => void): void {
    this.onLogCallback = callback
  }

  private addLog(log: ProxyLogEntry): void {
    this.logs.push(log)
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500)
    }
    if (this.onLogCallback) {
      this.onLogCallback(log)
    }
  }

  // HTTP 请求代理（明文 HTTP）
  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    const sourceIP = req.socket.remoteAddress || 'unknown'
    const targetUrl = new URL(req.url || '')

    const proxyReq = httpRequest({
      hostname: targetUrl.hostname,
      port: targetUrl.port || 80,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: req.headers
    }, (proxyRes: any) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res)
    })

    proxyReq.on('error', () => {
      res.writeHead(502)
      res.end('Bad Gateway')
    })

    req.pipe(proxyReq)
  }

  // CONNECT 方法处理（HTTPS 隧道 / SOCKS 风格隧道）
  private handleConnect(req: IncomingMessage, socket: Socket, head: Buffer): void {
    const sourceIP = req.socket.remoteAddress || 'unknown'
    const [host, portStr] = (req.url || '').split(':')
    const port = parseInt(portStr) || 443

    const target = netConnect(port, host, () => {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
      if (head.length > 0) target.write(head)

      const logEntry: ProxyLogEntry = {
        timestamp: Date.now(),
        sourceIP,
        method: 'CONNECT',
        targetHost: host,
        targetPort: port,
        status: 'connected',
        bytesSent: 0,
        bytesReceived: 0
      }

      let bytesSent = 0
      let bytesReceived = 0

      socket.on('data', (data: Buffer) => {
        bytesSent += data.length
        target.write(data)
      })

      target.on('data', (data: Buffer) => {
        bytesReceived += data.length
        socket.write(data)
      })

      socket.on('close', () => {
        logEntry.bytesSent = bytesSent
        logEntry.bytesReceived = bytesReceived
        logEntry.status = 'closed'
        this.addLog(logEntry)
        target.destroy()
      })

      target.on('close', () => {
        logEntry.bytesSent = bytesSent
        logEntry.bytesReceived = bytesReceived
        logEntry.status = 'closed'
        this.addLog(logEntry)
        socket.destroy()
      })

      socket.on('error', () => {
        logEntry.status = 'error'
        logEntry.bytesSent = bytesSent
        logEntry.bytesReceived = bytesReceived
        this.addLog(logEntry)
        target.destroy()
      })

      target.on('error', () => {
        logEntry.status = 'error'
        logEntry.bytesSent = bytesSent
        logEntry.bytesReceived = bytesReceived
        this.addLog(logEntry)
        socket.destroy()
      })
    })

    target.on('error', () => {
      socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n')
      socket.destroy()
    })
  }
}
