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
    execStream: (id: string, command: string) => Promise<ExecResult>
    execAbort: (id: string, execId: string) => Promise<boolean>
    onStream: (id: string, callback: (data: string) => void) => () => void
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
}

export interface AppConfig {
  taskJsonPath: string
  testSuitDirPath: string
  execCommand: string
  execWorkDir: string
  fileBrowsePath: string
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
