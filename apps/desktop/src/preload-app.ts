/** Startup controls for shell documents; application documents receive analytics track. */

import { contextBridge, ipcRenderer } from 'electron'
import { DESKTOP_IPC, type DshDesktopApplicationApi, type DshDesktopStartupApi } from './ipc.ts'
import type { DesktopBackendState } from './backend-controller.ts'

const startup: DshDesktopStartupApi = {
  protocolVersion: 1,
  locale: () => ipcRenderer.invoke(DESKTOP_IPC.localeGet) as ReturnType<DshDesktopStartupApi['locale']>,
  backend: {
    status: () => ipcRenderer.invoke(DESKTOP_IPC.backendStatus) as ReturnType<DshDesktopStartupApi['backend']['status']>,
    subscribe(listener) {
      const handle = (_event: Electron.IpcRendererEvent, state: DesktopBackendState): void => { listener(state) }
      ipcRenderer.on(DESKTOP_IPC.backendState, handle)
      return () => { ipcRenderer.off(DESKTOP_IPC.backendState, handle) }
    },
  },
  disablePlugins: () => ipcRenderer.invoke(DESKTOP_IPC.pluginsDisableAll) as Promise<void>,
  restart: () => ipcRenderer.invoke(DESKTOP_IPC.applicationRestart) as Promise<void>,
  resetConfiguration: () => ipcRenderer.invoke(DESKTOP_IPC.configurationReset) as Promise<void>,
}

const application: DshDesktopApplicationApi = {
  protocolVersion: 1,
  analytics: {
    track(name, props) {
      void ipcRenderer.invoke(DESKTOP_IPC.analyticsTrack, name, props)
    },
  },
  auth: {
    localLogin: () => ipcRenderer.invoke(DESKTOP_IPC.authLocalLogin) as Promise<boolean>,
    openWebsiteLogin: () => ipcRenderer.invoke(DESKTOP_IPC.authOpenLogin) as Promise<void>,
    subscribeAuthCode(listener) {
      const handle = (_event: Electron.IpcRendererEvent, code: string): void => { listener(code) }
      ipcRenderer.on(DESKTOP_IPC.authCode, handle)
      return () => { ipcRenderer.off(DESKTOP_IPC.authCode, handle) }
    },
  },
  mcp: {
    list: () => ipcRenderer.invoke(DESKTOP_IPC.mcpList) as ReturnType<DshDesktopApplicationApi['mcp']['list']>,
    save: servers => ipcRenderer.invoke(DESKTOP_IPC.mcpSave, servers) as Promise<void>,
  },
  skills: {
    list: () => ipcRenderer.invoke(DESKTOP_IPC.skillsList) as ReturnType<DshDesktopApplicationApi['skills']['list']>,
    save: skills => ipcRenderer.invoke(DESKTOP_IPC.skillsSave, skills) as Promise<void>,
  },
  importGithub: (url, kind) => ipcRenderer.invoke(DESKTOP_IPC.githubImport, url, kind) as Promise<string>,
}

const exposed = location.protocol === 'dsh-app:' && location.hostname === 'shell'
  ? startup
  : location.protocol === 'dsh-app:' && location.hostname === 'app'
    ? application
    : { protocolVersion: 1 }

contextBridge.exposeInMainWorld('dshDesktop', exposed)
