import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

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

const PRESET_TEMPLATES: TaskTemplate[] = [
  {
    id: 'preset_basic_no_netperf',
    name: '基础性能（不含netperf）',
    machineType: '通用',
    testCategory: '基础性能',
    isPreset: true,
    createdAt: 0,
    updatedAt: 0,
    tasks: [
      { suite: 'fio', ips: [], wait_time: 60 },
      { suite: 'stream', ips: [], wait_time: 60 },
      { suite: 'unixbench', ips: [], wait_time: 120 }
    ]
  },
  {
    id: 'preset_basic_with_netperf',
    name: '基础性能（含netperf）',
    machineType: '通用',
    testCategory: '基础性能',
    isPreset: true,
    createdAt: 0,
    updatedAt: 0,
    tasks: [
      { suite: 'fio', ips: [], wait_time: 60 },
      { suite: 'stream', ips: [], wait_time: 60 },
      { suite: 'unixbench', ips: [], wait_time: 120 },
      { suite: 'netperf', ips: [], wait_time: 60 }
    ]
  },
  {
    id: 'preset_scenario_no_bigdata',
    name: '场景化测试（不含大数据）',
    machineType: '通用',
    testCategory: '场景化测试',
    isPreset: true,
    createdAt: 0,
    updatedAt: 0,
    tasks: [
      { suite: 'fio', ips: [], wait_time: 60 },
      { suite: 'stream', ips: [], wait_time: 60 },
      { suite: 'unixbench', ips: [], wait_time: 120 },
      { suite: 'nginx', ips: [], wait_time: 60 },
      { suite: 'redis', ips: [], wait_time: 60 }
    ]
  },
  {
    id: 'preset_bigdata',
    name: '大数据测试',
    machineType: '通用',
    testCategory: '大数据测试',
    isPreset: true,
    createdAt: 0,
    updatedAt: 0,
    tasks: [
      { suite: 'hadoop', ips: [], wait_time: 300 },
      { suite: 'spark', ips: [], wait_time: 300 },
      { suite: 'kafka', ips: [], wait_time: 120 }
    ]
  }
]

export class TemplateStore {
  private filePath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }
    this.filePath = join(userDataPath, 'templates.json')
  }

  getAll(): TaskTemplate[] {
    let templates: TaskTemplate[] = []
    try {
      if (existsSync(this.filePath)) {
        const content = readFileSync(this.filePath, 'utf-8')
        templates = JSON.parse(content)
      }
    } catch {
      templates = []
    }

    // 合并预设模版（用户不能删除/修改预设）
    const presetIds = templates.filter(t => t.isPreset).map(t => t.id)
    for (const preset of PRESET_TEMPLATES) {
      if (!presetIds.includes(preset.id)) {
        templates.push(preset)
      }
    }

    return templates
  }

  save(template: TaskTemplate): TaskTemplate[] {
    const templates = this.getAll()
    const idx = templates.findIndex(t => t.id === template.id)
    const now = Date.now()
    template.updatedAt = now
    if (!template.createdAt) template.createdAt = now

    if (idx >= 0) {
      if (templates[idx].isPreset) {
        // 预设模版不可覆盖，创建副本
        template.id = `tpl_${now}`
        template.isPreset = false
        template.name = template.name + ' (副本)'
        templates.push(template)
      } else {
        templates[idx] = template
      }
    } else {
      templates.push(template)
    }

    // 只保存非预设模版
    const toSave = templates.filter(t => !t.isPreset)
    this.writeFile(toSave)
    return this.getAll()
  }

  remove(id: string): TaskTemplate[] {
    const templates = this.getAll()
    const target = templates.find(t => t.id === id)
    if (target?.isPreset) {
      // 预设模版不可删除
      return this.getAll()
    }
    const filtered = templates.filter(t => t.id !== id)
    const toSave = filtered.filter(t => !t.isPreset)
    this.writeFile(toSave)
    return this.getAll()
  }

  exportAll(): string {
    return JSON.stringify(this.getAll(), null, 2)
  }

  import(jsonStr: string): TaskTemplate[] {
    try {
      const data = JSON.parse(jsonStr)
      const imported: TaskTemplate[] = Array.isArray(data) ? data : [data]
      const current = this.getAll()
      const currentIds = current.map(t => t.id)

      for (const tpl of imported) {
        if (!tpl.id || !tpl.name || !tpl.tasks) continue
        if (tpl.isPreset) continue // 不导入预设
        // ID 冲突则重新生成
        if (currentIds.includes(tpl.id)) {
          tpl.id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        }
        tpl.isPreset = false
        current.push(tpl)
      }

      const toSave = current.filter(t => !t.isPreset)
      this.writeFile(toSave)
      return this.getAll()
    } catch (err: any) {
      throw new Error(`导入失败: ${err.message}`)
    }
  }

  private writeFile(templates: TaskTemplate[]): void {
    writeFileSync(this.filePath, JSON.stringify(templates, null, 2), 'utf-8')
  }
}
