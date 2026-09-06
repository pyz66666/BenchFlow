import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

export interface SavedDevice {
  id: string
  name: string
  host: string
  port: number
  username: string
  password: string
  lastConnected: number
}

export class DeviceStore {
  private filePath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }
    this.filePath = join(userDataPath, 'devices.json')
  }

  getAll(): SavedDevice[] {
    try {
      if (!existsSync(this.filePath)) return []
      const content = readFileSync(this.filePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return []
    }
  }

  save(devices: SavedDevice[]): void {
    writeFileSync(this.filePath, JSON.stringify(devices, null, 2), 'utf-8')
  }

  add(device: SavedDevice): SavedDevice[] {
    const devices = this.getAll()
    const idx = devices.findIndex(d => d.id === device.id)
    if (idx >= 0) {
      devices[idx] = device
    } else {
      devices.push(device)
    }
    this.save(devices)
    return devices
  }

  remove(id: string): SavedDevice[] {
    const devices = this.getAll().filter(d => d.id !== id)
    this.save(devices)
    return devices
  }

  update(id: string, patch: Partial<SavedDevice>): SavedDevice[] {
    const devices = this.getAll()
    const idx = devices.findIndex(d => d.id === id)
    if (idx >= 0) {
      devices[idx] = { ...devices[idx], ...patch }
      this.save(devices)
    }
    return devices
  }
}
