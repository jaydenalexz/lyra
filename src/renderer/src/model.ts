import type { FieldDef, FieldValue, FieldValueRecord, LyraRecord, LogEntry } from '@shared/types'
import { emptyValueFor } from '@shared/resolve'
import { uid } from '@shared/defaults'

/** Get or create the stored value record for a field. */
export function ensureValue(record: LyraRecord, field: FieldDef): FieldValueRecord {
  if (!record.values[field.id]) {
    record.values[field.id] = { truth: emptyValueFor(field) }
  }
  return record.values[field.id]
}

export function setTruth(record: LyraRecord, field: FieldDef, value: FieldValue): void {
  ensureValue(record, field).truth = value
}

export function setOverride(
  record: LyraRecord,
  field: FieldDef,
  classificationId: string,
  value: FieldValue
): void {
  const stored = ensureValue(record, field)
  stored.overrides = stored.overrides ?? {}
  stored.overrides[classificationId] = value
}

export function clearOverride(
  record: LyraRecord,
  field: FieldDef,
  classificationId: string
): void {
  const stored = record.values[field.id]
  if (!stored?.overrides) return
  delete stored.overrides[classificationId]
  if (Object.keys(stored.overrides).length === 0) delete stored.overrides
}

/** True when the immutable field has been filled and may no longer change. */
export function isLocked(record: LyraRecord, field: FieldDef): boolean {
  if (!field.immutable) return false
  const stored = record.values[field.id]
  if (!stored) return false
  const v = stored.truth
  if (v === null || v === '' || v === undefined) return false
  if (field.type === 'place') {
    const place = v as { viceroyaltyId: string | null }
    return place.viceroyaltyId !== null
  }
  if (field.type === 'log') return false
  return true
}

export function newLogEntry(): LogEntry {
  return { id: uid(), date: new Date().toISOString().slice(0, 10), title: '', body: '' }
}
