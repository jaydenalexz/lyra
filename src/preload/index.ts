import { contextBridge, ipcRenderer } from 'electron'
import type { LyraDatabase } from '@shared/types'

const api = {
  load: (): Promise<LyraDatabase> => ipcRenderer.invoke('lyra:data:load'),
  save: (db: LyraDatabase): Promise<{ ok: boolean; savedAt: number }> =>
    ipcRenderer.invoke('lyra:data:save', db),
  path: (): Promise<string> => ipcRenderer.invoke('lyra:data:path'),
  openFolder: (): Promise<void> => ipcRenderer.invoke('lyra:data:openFolder'),
  exportDb: (db: LyraDatabase): Promise<{ ok: boolean; path?: string }> =>
    ipcRenderer.invoke('lyra:data:export', db),
  importDb: (): Promise<{ ok: boolean; db?: unknown }> => ipcRenderer.invoke('lyra:data:import'),
  reset: (): Promise<LyraDatabase> => ipcRenderer.invoke('lyra:data:reset')
}

export type LyraApi = typeof api

contextBridge.exposeInMainWorld('lyra', api)
