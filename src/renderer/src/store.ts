import { create } from 'zustand'
import type { LyraDatabase, LyraRecord } from '@shared/types'
import { migrate } from '@shared/migrate'
import { topClassification } from '@shared/resolve'

export type Route =
  | { view: 'browser'; typeId: string }
  | { view: 'profile'; typeId: string; recordId: string }
  | { view: 'schema'; tab: SchemaTab }

export type SchemaTab = 'types' | 'clearances' | 'geography' | 'settings'

export type SaveState = 'idle' | 'saving' | 'saved'

interface AppState {
  db: LyraDatabase | null
  viewAs: string | null
  authorMode: boolean
  route: Route
  saveState: SaveState
  savedAt: number | null
  dataPath: string | null

  init: () => Promise<void>
  setViewAs: (id: string) => void
  setAuthorMode: (on: boolean) => void
  navigate: (route: Route) => void
  /** Apply a mutation to the database and schedule an autosave. */
  mutate: (fn: (db: LyraDatabase) => void) => void
  saveNow: () => Promise<void>
  replaceDb: (raw: unknown) => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let currentDb: LyraDatabase | null = null

async function persist(db: LyraDatabase): Promise<{ ok: boolean; savedAt: number }> {
  return window.lyra.save(db)
}

function scheduleSave(set: (partial: Partial<AppState>) => void): void {
  if (saveTimer) clearTimeout(saveTimer)
  set({ saveState: 'saving' })
  saveTimer = setTimeout(async () => {
    const db = currentDb
    if (!db) return
    const result = await persist(db)
    set({ saveState: 'saved', savedAt: result.savedAt })
  }, 600)
}

/** Flush any pending debounced save (used on page hide / unload). */
export function flushSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
    if (currentDb) void persist(currentDb)
  }
}

function defaultViewAs(db: LyraDatabase): string | null {
  const stored = localStorage.getItem('lyra.viewAs')
  if (stored && db.classifications.some((c) => c.id === stored)) return stored
  return topClassification(db)?.id ?? null
}

export const useApp = create<AppState>((set, get) => ({
  db: null,
  viewAs: null,
  authorMode: localStorage.getItem('lyra.authorMode') === '1',
  route: { view: 'browser', typeId: 'type-citizen' },
  saveState: 'idle',
  savedAt: null,
  dataPath: null,

  init: async () => {
    const db = await window.lyra.load()
    currentDb = db
    const dataPath = await window.lyra.path()
    set({
      db,
      dataPath,
      viewAs: defaultViewAs(db),
      route: { view: 'browser', typeId: db.recordTypes[0]?.id ?? '' }
    })
  },

  setViewAs: (id) => {
    localStorage.setItem('lyra.viewAs', id)
    set({ viewAs: id })
  },

  setAuthorMode: (on) => {
    localStorage.setItem('lyra.authorMode', on ? '1' : '0')
    set({ authorMode: on })
  },

  navigate: (route) => set({ route }),

  mutate: (fn) => {
    const db = get().db
    if (!db) return
    const next = structuredClone(db)
    fn(next)
    currentDb = next
    set({ db: next })
    scheduleSave(set)
  },

  saveNow: async () => {
    flushSave()
    const db = currentDb
    if (!db) return
    const result = await persist(db)
    set({ saveState: 'saved', savedAt: result.savedAt })
  },

  replaceDb: (raw) => {
    const db = migrate(raw)
    currentDb = db
    set({
      db,
      viewAs: defaultViewAs(db),
      route: { view: 'browser', typeId: db.recordTypes[0]?.id ?? '' }
    })
    scheduleSave(set)
  }
}))

export function newRecord(typeId: string): LyraRecord {
  return {
    id: crypto.randomUUID(),
    typeId,
    createdAt: new Date().toISOString(),
    values: {}
  }
}
