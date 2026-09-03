import type {
  Classification,
  FieldDef,
  FieldValue,
  FieldValueRecord,
  LyraDatabase,
  LogEntry,
  PlaceValue
} from './types'

/** The classification with the highest rank — the only one that sees the truth. */
export function topClassification(db: LyraDatabase): Classification | null {
  if (db.classifications.length === 0) return null
  return db.classifications.reduce((a, b) => (b.rank > a.rank ? b : a))
}

export function isTopClassification(db: LyraDatabase, classificationId: string | null): boolean {
  const top = topClassification(db)
  return top !== null && top.id === classificationId
}

export function emptyValueFor(field: FieldDef): FieldValue {
  switch (field.type) {
    case 'text':
    case 'longtext':
    case 'date':
    case 'select':
      return ''
    case 'number':
      return null
    case 'boolean':
      return false
    case 'place':
      return { viceroyaltyId: null, cityId: null }
    case 'log':
      return []
  }
}

/**
 * Resolve the value a viewer of the given classification sees.
 *
 * - Top clearance always sees `truth`.
 * - Anyone else sees the override written for their tier if one exists,
 *   otherwise the truth. Nothing is ever redacted — fabrication is a pure
 *   overlay on top of the raw input.
 */
export function resolveFieldValue(
  db: LyraDatabase,
  field: FieldDef,
  stored: FieldValueRecord | undefined,
  viewerClassificationId: string | null
): FieldValue {
  const empty = emptyValueFor(field)
  if (!stored) return empty
  if (isTopClassification(db, viewerClassificationId)) return stored.truth
  const override = stored.overrides?.[viewerClassificationId ?? '']
  return override !== undefined ? override : stored.truth
}

/** True when the given classification has a fabricated value written for this field. */
export function hasOverride(stored: FieldValueRecord | undefined, classificationId: string): boolean {
  return stored?.overrides?.[classificationId] !== undefined
}

/** Human-readable single-line rendering of any field value. */
export function displayValue(field: FieldDef, value: FieldValue, db: LyraDatabase): string {
  if (value === null || value === undefined) return ''
  switch (field.type) {
    case 'text':
    case 'longtext':
    case 'date':
    case 'select':
      return String(value)
    case 'number':
      return String(value)
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'place': {
      const place = value as PlaceValue
      const vic = db.viceroyalties.find((v) => v.id === place.viceroyaltyId)
      const city = vic?.cities.find((c) => c.id === place.cityId)
      if (!vic) return ''
      return city ? `${vic.name} — ${city.name}` : vic.name
    }
    case 'log':
      return `${(value as LogEntry[]).length} entries`
  }
}

export function displayPlace(db: LyraDatabase, place: PlaceValue | null | undefined): string {
  if (!place) return ''
  const vic = db.viceroyalties.find((v) => v.id === place.viceroyaltyId)
  const city = vic?.cities.find((c) => c.id === place.cityId)
  if (!vic) return ''
  return city ? `${vic.name} — ${city.name}` : vic.name
}

export function recordTitle(db: LyraDatabase, record: { typeId: string; values: Record<string, FieldValueRecord> }): string {
  const type = db.recordTypes.find((t) => t.id === record.typeId)
  if (!type) return 'Unknown record'
  const stored = record.values[type.titleFieldId]
  const field = type.fields.find((f) => f.id === type.titleFieldId)
  if (!field) return 'Unknown record'
  const value = stored?.truth
  return typeof value === 'string' && value.trim() !== '' ? value : 'Unregistered'
}

/** Sort classifications by rank, highest first. */
export function classificationsByRank(db: LyraDatabase): Classification[] {
  return [...db.classifications].sort((a, b) => b.rank - a.rank)
}

/** All classifications strictly below the top one — candidates for fabricated views. */
export function fabricatableClassifications(db: LyraDatabase): Classification[] {
  const top = topClassification(db)
  return classificationsByRank(db).filter((c) => c.id !== top?.id)
}
