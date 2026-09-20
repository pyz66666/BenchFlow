export interface SSHConfig {
  id: string
  host: string
  port?: number
  username: string
  password: string
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

export interface TaskItem {
  id: string
  name: string
  type: 'perAuto' | 'testResult'
  config: Record<string, any>
  enabled: boolean
}

export interface TestSuite {
  id: string
  name: string
  description: string
  cases: TestCase[]
}

export interface TestCase {
  id: string
  name: string
  enabled: boolean
  params: Record<string, any>
}

export interface DoInPXEAPI {
  ssh: {
    connect: (config: SSHConfig) => Promise<boolean>
    disconnect: (id: string) => Promise<boolean>
    readFile: (id: string, path: string) => Promise<string>
    writeFile: (id: string, path: string, content: string) => Promise<boolean>
    listDir: (id: string, path: string) => Promise<DirEntry[]>
    exec: (id: string, command: string) => Promise<ExecResult>
    execStream: (id: string, command: string) => Promise<{ execId: string }>
    execWait: (execId: string) => Promise<ExecResult>
    execAbort: (id: string, execId: string) => Promise<boolean>
    onStream: (id: string, execId: string, callback: (data: string) => void) => () => void
  }
  device: {
    getAll: () => Promise<SavedDevice[]>
    save: (device: SavedDevice) => Promise<SavedDevice[]>
    remove: (id: string) => Promise<SavedDevice[]>
    update: (id: string, patch: Partial<SavedDevice>) => Promise<SavedDevice[]>
  }
  config: {
    get: () => Promise<AppConfig>
    save: (config: Partial<AppConfig>) => Promise<AppConfig>
  }
  local: {
    getIPs: () => Promise<LocalIP[]>
  }
  tunnel: {
    create: (config: TunnelConfig) => Promise<TunnelInfo>
    remove: (id: string) => Promise<boolean>
    list: () => Promise<TunnelInfo[]>
    removeAll: () => Promise<boolean>
  }
  proxy: {
    start: (port: number) => Promise<boolean>
    stop: () => Promise<boolean>
    status: () => Promise<boolean>
    getLogs: () => Promise<ProxyLogEntry[]>
    clearLogs: () => Promise<boolean>
    onLog: (callback: (log: ProxyLogEntry) => void) => () => void
  }
  proxyConfig: {
    apply: (connId: string, proxyIP: string, port: number) => Promise<{ success: boolean; message: string }>
    remove: (connId: string) => Promise<{ success: boolean; message: string }>
    detectOS: (connId: string) => Promise<{ type: string; pkgManager: string }>
  }
  template: {
    getAll: () => Promise<TaskTemplate[]>
    save: (template: TaskTemplate) => Promise<TaskTemplate[]>
    remove: (id: string) => Promise<TaskTemplate[]>
    exportAll: () => Promise<string>
    import: (jsonStr: string) => Promise<TaskTemplate[]>
  }
}

export interface TaskTemplateItem {
  suite: string
  ips: string[]
  wait_time: number
  [key: string]: any
}

export interface TaskTemplate {
  id: string
  name: string
  machineType: 'AMD' | 'Intel' | '920B' | '950' | '通用'
  testCategory: '基础性能' | '基础性能+nginx-redis' | '场景化测试' | '大数据测试'
  tasks: TaskTemplateItem[]
  isPreset: boolean
  createdAt: number
  updatedAt: number
}

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

export interface LocalIP {
  category: string
  ip: string
  netmask: string
}

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

export interface AppConfig {
  taskJsonPath: string
  testSuitDirPath: string
  execCommand: string
  execWorkDir: string
  fileBrowsePath: string
  downloadTxtPath: string
}

export interface SavedDevice {
  id: string
  name: string
  host: string
  port: number
  username: string
  password: string
  lastConnected: number
}
