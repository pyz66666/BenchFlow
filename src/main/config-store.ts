import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

export interface AppConfig {
  taskJsonPath: string
  testSuitDirPath: string
  execCommand: string
  execWorkDir: string
  fileBrowsePath: string
}

const DEFAULT_CONFIG: AppConfig = {
  taskJsonPath: '/home/AutoBench/config/task.json',
  testSuitDirPath: '/home/AutoBench/config/testsuit',
  execCommand: 'cd /home/AutoBench && ./run.sh',
  execWorkDir: '/home/AutoBench',
  fileBrowsePath: '/home/AutoBench/config'
}

export class ConfigStore {
  private filePath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }
    this.filePath = join(userDataPath, 'config.json')
  }

  get(): AppConfig {
    try {
      if (!existsSync(this.filePath)) {
        this.save(DEFAULT_CONFIG)
        return DEFAULT_CONFIG
      }
      const content = readFileSync(this.filePath, 'utf-8')
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) }
    } catch {
      return DEFAULT_CONFIG
    }
  }

  save(config: Partial<AppConfig>): AppConfig {
    const current = this.get()
    const merged = { ...current, ...config }
    writeFileSync(this.filePath, JSON.stringify(merged, null, 2), 'utf-8')
    return merged
  }
}
