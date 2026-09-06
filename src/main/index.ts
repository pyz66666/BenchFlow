import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { SSHManager } from './ssh-manager'
import type { SSHConfig } from './ssh-manager'
import { DeviceStore } from './device-store'
import type { SavedDevice } from './device-store'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
const sshManager = new SSHManager()
const deviceStore = new DeviceStore()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'BenchFlow',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  sshManager.disconnectAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC: SSH 连接
ipcMain.handle('ssh:connect', async (_event, config: SSHConfig) => {
  return sshManager.connect(config)
})

// IPC: SSH 断开
ipcMain.handle('ssh:disconnect', async (_event, id: string) => {
  return sshManager.disconnect(id)
})

// IPC: 读取文件
ipcMain.handle('ssh:readFile', async (_event, id: string, path: string) => {
  return sshManager.readFile(id, path)
})

// IPC: 写入文件
ipcMain.handle('ssh:writeFile', async (_event, id: string, path: string, content: string) => {
  return sshManager.writeFile(id, path, content)
})

// IPC: 列出目录
ipcMain.handle('ssh:listDir', async (_event, id: string, path: string) => {
  return sshManager.listDir(id, path)
})

// IPC: 执行命令
ipcMain.handle('ssh:exec', async (_event, id: string, command: string) => {
  return sshManager.exec(id, command)
})

// IPC: 执行命令（流式输出）
ipcMain.handle('ssh:execStream', async (event, id: string, command: string) => {
  return sshManager.execStream(id, command, (data: string) => {
    event.sender.send(`ssh:stream:${id}`, data)
  })
})

// IPC: 中断执行
ipcMain.handle('ssh:execAbort', async (_event, id: string, execId: string) => {
  return sshManager.execAbort(id, execId)
})

// IPC: 设备管理
ipcMain.handle('device:getAll', async () => {
  return deviceStore.getAll()
})

ipcMain.handle('device:save', async (_event, device: SavedDevice) => {
  return deviceStore.add(device)
})

ipcMain.handle('device:remove', async (_event, id: string) => {
  return deviceStore.remove(id)
})

ipcMain.handle('device:update', async (_event, id: string, patch: Partial<SavedDevice>) => {
  return deviceStore.update(id, patch)
})
