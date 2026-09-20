import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { networkInterfaces } from 'os'
import { SSHManager } from './ssh-manager'
import { DeviceStore } from './device-store'
import { ConfigStore } from './config-store'
import { TunnelManager } from './tunnel-manager'
import { ProxyManager } from './proxy-manager'
import { ProxyConfigManager } from './proxy-config-manager'
import { TemplateStore } from './template-store'

const isDev = !app.isPackaged

function writeErrorLog(msg: string) {
  try {
    const fs = require('fs')
    const path = require('path')
    const logPath = path.join(app.getPath('userData'), 'error.log')
    const log = `[${new Date().toISOString()}] ${msg}\n`
    fs.appendFileSync(logPath, log)
  } catch {}
}

process.on('uncaughtException', (err) => {
  writeErrorLog(`uncaughtException: ${err.stack || err}`)
  try { dialog.showErrorBox('错误', err.stack || String(err)) } catch {}
})

process.on('unhandledRejection', (err: any) => {
  writeErrorLog(`unhandledRejection: ${err?.stack || err}`)
})

let mainWindow: BrowserWindow | null = null
const sshManager = new SSHManager()
const deviceStore = new DeviceStore()
const configStore = new ConfigStore()
const tunnelManager = new TunnelManager()
const proxyManager = new ProxyManager()
const proxyConfigManager = new ProxyConfigManager(sshManager)
const templateStore = new TemplateStore()

// 读取本机 IP
function getLocalIPs(): { category: string; ip: string; netmask: string }[] {
  const results: { category: string; ip: string; netmask: string }[] = []
  for (const interfaces of Object.values(networkInterfaces())) {
    for (const address of interfaces || []) {
      if (address.family !== 'IPv4' || address.internal) continue
      results.push({ category: categorizeIP(address.address), ip: address.address, netmask: address.netmask })
    }
  }
  return results
}

function categorizeIP(ip: string): string {
  if (ip.startsWith('10.')) return '10'
  if (ip.startsWith('141.')) return '141'
  if (ip.startsWith('90.')) return '90'
  return 'other'
}

function createWindow() {
  writeErrorLog('createWindow start')

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

  let devLoadAttempts = 0
  mainWindow.webContents.on('did-fail-load', (_event: any, errorCode: number, errorDescription: string) => {
    writeErrorLog(`did-fail-load: code=${errorCode} desc=${errorDescription}`)
    if (isDev && (errorCode === -102 || errorCode === -105) && devLoadAttempts < 20) {
      setTimeout(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return
        devLoadAttempts += 1
        mainWindow.loadURL('http://localhost:5173').catch(() => {})
      }, 250)
      return
    }
    const { dialog } = require('electron')
    const hint = isDev ? '\n\n开发模式请先运行 npm run electron:dev。' : ''
    dialog.showErrorBox('页面加载失败', `错误码: ${errorCode}\n描述: ${errorDescription}${hint}`)
  })

  if (isDev) {
    devLoadAttempts = 1
    mainWindow.loadURL('http://localhost:5173').catch(() => {})
    mainWindow.webContents.openDevTools()
  } else {
    // 打包后 dist/index.html 在 app 根目录
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  writeErrorLog('createWindow done')
}

app.whenReady().then(() => {
  writeErrorLog('app ready')
  try {
    createWindow()
  } catch (err: any) {
    writeErrorLog(`startup error: ${err?.stack || err}`)
    dialog.showErrorBox('启动失败', err?.stack || err?.message || String(err))
  }

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
ipcMain.handle('ssh:connect', async (_event, config: any) => {
  return sshManager.connect(config)
})

// IPC: SSH 断开
ipcMain.handle('ssh:disconnect', async (_event, id: string) => {
  return sshManager.disconnect(id)
})

// IPC: 读取文件
ipcMain.handle('ssh:readFile', async (_event, id: string, path: string) => {
  console.log(`[ssh:readFile] id=${id}, path=${path}`)
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

// IPC: 执行命令（流式输出）- 启动并返回 execId
const pendingExecs = new Map<string, { promise: Promise<any> }>()

ipcMain.handle('ssh:execStream', async (event, id: string, command: string) => {
  const { execId, promise } = sshManager.execStream(id, command, (data: string) => {
    event.sender.send(`ssh:stream:${id}:${execId}`, data)
  })
  // 不阻塞，把 promise 存起来
  pendingExecs.set(execId, { promise })
  return { execId }
})

// IPC: 等待执行完成
ipcMain.handle('ssh:execWait', async (_event, execId: string) => {
  const pending = pendingExecs.get(execId)
  if (!pending) return { code: -1, stdout: '', stderr: 'execId not found' }
  const result = await pending.promise
  pendingExecs.delete(execId)
  return result
})

// IPC: 中断执行
ipcMain.handle('ssh:execAbort', async (_event, id: string, execId: string) => {
  return sshManager.execAbort(id, execId)
})

// IPC: 设备管理
ipcMain.handle('device:getAll', async () => {
  return deviceStore.getAll()
})

ipcMain.handle('device:save', async (_event, device: any) => {
  return deviceStore.add(device)
})

ipcMain.handle('device:remove', async (_event, id: string) => {
  return deviceStore.remove(id)
})

ipcMain.handle('device:update', async (_event, id: string, patch: any) => {
  return deviceStore.update(id, patch)
})

// IPC: 配置管理
ipcMain.handle('config:get', async () => {
  return configStore.get()
})

ipcMain.handle('config:save', async (_event, config: any) => {
  return configStore.save(config)
})

// IPC: 本机 IP
ipcMain.handle('local:getIPs', async () => {
  return getLocalIPs()
})

// IPC: SSH 隧道管理
ipcMain.handle('tunnel:create', async (_event, config: any) => {
  return tunnelManager.create(config)
})

ipcMain.handle('tunnel:remove', async (_event, id: string) => {
  return tunnelManager.remove(id)
})

ipcMain.handle('tunnel:list', async () => {
  return tunnelManager.list()
})

ipcMain.handle('tunnel:removeAll', async () => {
  return tunnelManager.removeAll()
})

// IPC: 代理服务器
ipcMain.handle('proxy:start', async (_event, port: number) => {
  try {
    return await proxyManager.start(port)
  } catch (err: any) {
    console.error('[proxy:start]', err)
    return false
  }
})

ipcMain.handle('proxy:stop', async () => {
  proxyManager.stop()
  return true
})

ipcMain.handle('proxy:status', async () => {
  return proxyManager.isRunning()
})

ipcMain.handle('proxy:getLogs', async () => {
  return proxyManager.getLogs()
})

ipcMain.handle('proxy:clearLogs', async () => {
  proxyManager.clearLogs()
  return true
})

// 代理日志实时推送
proxyManager.onLog((log: any) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('proxy:log', log)
  }
})

// IPC: 代理配置（远程服务器）
ipcMain.handle('proxyConfig:apply', async (_event, connId: string, proxyIP: string, port: number) => {
  return proxyConfigManager.applyProxy(connId, proxyIP, port)
})

ipcMain.handle('proxyConfig:remove', async (_event, connId: string) => {
  return proxyConfigManager.removeProxy(connId)
})

ipcMain.handle('proxyConfig:detectOS', async (_event, connId: string) => {
  return proxyConfigManager.detectOS(connId)
})

// IPC: 任务模版管理
ipcMain.handle('template:getAll', async () => {
  return templateStore.getAll()
})

ipcMain.handle('template:save', async (_event, template: any) => {
  return templateStore.save(template)
})

ipcMain.handle('template:remove', async (_event, id: string) => {
  return templateStore.remove(id)
})

ipcMain.handle('template:export', async () => {
  return templateStore.exportAll()
})

ipcMain.handle('template:import', async (_event, jsonStr: string) => {
  return templateStore.import(jsonStr)
})
