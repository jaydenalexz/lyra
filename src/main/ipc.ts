import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import type { LyraDatabase } from '@shared/types'
import { loadDatabase, writeDatabase, dataFilePath } from './datastore'
import { seedDatabase } from '@shared/defaults'

export function registerIpc(): void {
  ipcMain.handle('lyra:data:load', () => loadDatabase())

  ipcMain.handle('lyra:data:save', (_event, db: LyraDatabase) => {
    writeDatabase(db)
    return { ok: true, savedAt: Date.now() }
  })

  ipcMain.handle('lyra:data:path', () => dataFilePath())

  ipcMain.handle('lyra:data:openFolder', () => {
    shell.openPath(path.dirname(dataFilePath()))
  })

  ipcMain.handle('lyra:data:export', async (_event, db: LyraDatabase) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: 'lyra.data.json',
      filters: [{ name: 'Lyra database', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { ok: false }
    fs.writeFileSync(result.filePath, JSON.stringify(db, null, 2), 'utf8')
    return { ok: true, path: result.filePath }
  })

  ipcMain.handle('lyra:data:import', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [{ name: 'Lyra database', extensions: ['json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return { ok: false }
    const raw = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'))
    return { ok: true, db: raw }
  })

  ipcMain.handle('lyra:data:reset', () => {
    const seeded = seedDatabase()
    writeDatabase(seeded)
    return seeded
  })
}
