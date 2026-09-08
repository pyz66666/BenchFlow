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
    execAbort: (id: string, execId: string) => ipcRenderer.invoke('ssh:execAbort', id, execId),
    onStream: (id: string, callback: (data: string) => void) => {
      const handler = (_event: any, data: string) => callback(data)
      ipcRenderer.on(`ssh:stream:${id}`, handler)
      return () => ipcRenderer.removeListener(`ssh:stream:${id}`, handler)
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
  }
}

export type DoInPXEAPI = typeof api

contextBridge.exposeInMainWorld('api', api)
