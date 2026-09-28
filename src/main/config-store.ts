import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

export interface AppConfig {
  taskJsonPath: string
  testSuitDirPath: string
  execCommand: string
  execWorkDir: string
  fileBrowsePath: string
  downloadTxtPath: string
}

export const DEFAULT_CONFIG: AppConfig = {
  taskJsonPath: '/home/AutoBench/config/tasks.json',
  testSuitDirPath: '/home/AutoBench/config/test_suites',
  execCommand: 'bash bin/submit_task.sh',
  execWorkDir: '/home/AutoBench',
  fileBrowsePath: '/home/AutoBench/config',
  downloadTxtPath: '/home/AutoBench/download.txt'
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
    return DEFAULT_CONFIG
  }

  save(_config: Partial<AppConfig>): AppConfig {
    return DEFAULT_CONFIG
  }
}
