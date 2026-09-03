import type { LyraDatabase } from './types'
import { SCHEMA_VERSION } from './types'

type Migration = (db: Record<string, unknown>) => Record<string, unknown>

/**
 * Ordered migrations from older schemaVersions to the current one. When the
 * data model changes in a future version, push a function here: it receives
 * the raw parsed JSON at version N and must return it at version N+1.
 */
const MIGRATIONS: Migration[] = []

export function migrate(raw: unknown): LyraDatabase {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Data file is not a Lyra database (expected an object).')
  }
  let db = raw as Record<string, unknown>
  let version = typeof db.schemaVersion === 'number' ? db.schemaVersion : 0
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version - 1]
    if (!step) {
      // No migration registered for this gap; the seed step below will
      // fill in anything missing.
      version += 1
      continue
    }
    db = step(db)
    version = typeof db.schemaVersion === 'number' ? db.schemaVersion : version + 1
  }
  db.schemaVersion = SCHEMA_VERSION
  return db as unknown as LyraDatabase
}
