import { contextBridge, ipcRenderer } from 'electron'

const api = {
  ssh: {
    connect: (config: any) => ipcRenderer.invoke('ssh:connect', config),
    disconnect: (id: string) => ipcRenderer.invoke('ssh:disconnect', id),
    readFile: (id: string, path: string) => ipcRenderer.invoke('ssh:readFile', id, path),
    writeFile: (id: string, path: string, content: string) => ipcRenderer.invoke('ssh:writeFile', id, path, content),
    listDir: (id: string, path: string) => ipcRenderer.invoke('ssh:listDir', id, path),
    exec: (id: string, command: string) => ipcRenderer.invoke('ssh:exec', id, command),
    execStream: (id: string, command: string) => ipcRenderer.invoke('ssh:execStream', id, command),
    execWait: (execId: string) => ipcRenderer.invoke('ssh:execWait', execId),
    execAbort: (id: string, execId: string) => ipcRenderer.invoke('ssh:execAbort', id, execId),
    onStream: (id: string, execId: string, callback: (data: string) => void) => {
      const channel = `ssh:stream:${id}:${execId}`
      const handler = (_event: any, data: string) => callback(data)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    }
  },
  device: {
    getAll: () => ipcRenderer.invoke('device:getAll'),
    save: (device: any) => ipcRenderer.invoke('device:save', device),
    remove: (id: string) => ipcRenderer.invoke('device:remove', id),
    update: (id: string, patch: any) => ipcRenderer.invoke('device:update', id, patch)
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    save: (config: any) => ipcRenderer.invoke('config:save', config)
  },
  local: {
    getIPs: () => ipcRenderer.invoke('local:getIPs')
  },
  tunnel: {
    create: (config: any) => ipcRenderer.invoke('tunnel:create', config),
    remove: (id: string) => ipcRenderer.invoke('tunnel:remove', id),
    list: () => ipcRenderer.invoke('tunnel:list'),
    removeAll: () => ipcRenderer.invoke('tunnel:removeAll')
  },
  proxy: {
    start: (port: number) => ipcRenderer.invoke('proxy:start', port),
    stop: () => ipcRenderer.invoke('proxy:stop'),
    status: () => ipcRenderer.invoke('proxy:status'),
    getLogs: () => ipcRenderer.invoke('proxy:getLogs'),
    clearLogs: () => ipcRenderer.invoke('proxy:clearLogs'),
    onLog: (callback: (log: any) => void) => {
      const handler = (_event: any, log: any) => callback(log)
      ipcRenderer.on('proxy:log', handler)
      return () => ipcRenderer.removeListener('proxy:log', handler)
    }
  },
  proxyConfig: {
    apply: (connId: string, proxyIP: string, port: number) => ipcRenderer.invoke('proxyConfig:apply', connId, proxyIP, port),
    remove: (connId: string) => ipcRenderer.invoke('proxyConfig:remove', connId),
    detectOS: (connId: string) => ipcRenderer.invoke('proxyConfig:detectOS', connId)
  },
  template: {
    getAll: () => ipcRenderer.invoke('template:getAll'),
    save: (template: any) => ipcRenderer.invoke('template:save', template),
    remove: (id: string) => ipcRenderer.invoke('template:remove', id),
    exportAll: () => ipcRenderer.invoke('template:export'),
    import: (jsonStr: string) => ipcRenderer.invoke('template:import', jsonStr)
  }
}

export type DoInPXEAPI = typeof api

contextBridge.exposeInMainWorld('api', api)
