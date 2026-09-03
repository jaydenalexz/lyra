import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { LyraDatabase } from '@shared/types'
import { seedDatabase } from '@shared/defaults'
import { migrate } from '@shared/migrate'

const BACKUP_KEEP = 10

/**
 * Data file location: inside the project while unpackaged (so the author's
 * story data is versioned with git), in the OS user-data dir when packaged.
 */
export function dataFilePath(): string {
  const base = app.isPackaged
    ? path.join(app.getPath('userData'), 'data')
    : path.join(app.getAppPath(), 'data')
  return path.join(base, 'lyra.data.json')
}

function backupsDir(): string {
  return path.join(path.dirname(dataFilePath()), 'backups')
}

export function ensureDataDir(): void {
  fs.mkdirSync(path.dirname(dataFilePath()), { recursive: true })
}

export function loadDatabase(): LyraDatabase {
  const file = dataFilePath()
  ensureDataDir()
  if (!fs.existsSync(file)) {
    const seeded = seedDatabase()
    writeDatabase(seeded)
    return seeded
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  return migrate(raw)
}

function writeBackup(): void {
  const file = dataFilePath()
  if (!fs.existsSync(file)) return
  const dir = backupsDir()
  fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  fs.copyFileSync(file, path.join(dir, `lyra-${stamp}.json`))
  const backups = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
  for (const old of backups.slice(0, Math.max(0, backups.length - BACKUP_KEEP))) {
    fs.rmSync(path.join(dir, old), { force: true })
  }
}

/** Atomic write: temp file + rename, with a rotating backup of the previous state. */
export function writeDatabase(db: LyraDatabase): void {
  ensureDataDir()
  writeBackup()
  const file = dataFilePath()
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8')
  fs.renameSync(tmp, file)
}
