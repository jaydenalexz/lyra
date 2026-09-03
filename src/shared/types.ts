/**
 * Lyra data model.
 *
 * Core mechanic: nothing in the system is redacted. Every field value stores
 * the TRUE input, plus optional per-classification override values (fabricated
 * data shown to officers below the top clearance to support the Empire's
 * agenda). Only the top classification sees the truth.
 */

export const SCHEMA_VERSION = 1

/** Field types supported by the schema editor. */
export type FieldType =
  | 'text' // single line
  | 'longtext' // paragraph
  | 'number'
  | 'date' // ISO yyyy-mm-dd
  | 'boolean'
  | 'select' // fixed options list defined on the field
  | 'place' // viceroyalty + city, options bound to geography
  | 'log' // dated entries (health records, crimes, ...)

export interface FieldDef {
  id: string
  label: string
  type: FieldType
  /** Section heading on the profile ("Identity", "Records", ...). */
  section: string
  /** Immutable fields are lore-locked after a value is set (e.g. place of origin). */
  immutable?: boolean
  required?: boolean
  /** Options for `select` fields. */
  options?: string[]
  /** Hint text shown in the UI. */
  description?: string
}

export interface RecordType {
  id: string
  /** Singular name, e.g. "Citizen". */
  name: string
  /** Plural name, e.g. "Citizens". */
  plural: string
  /** Field whose value is used as the record's display name. */
  titleFieldId: string
  fields: FieldDef[]
}

export interface Classification {
  id: string
  name: string
  /** Higher rank = more clearance. The single highest rank sees the truth. */
  rank: number
  /** Accent color for the badge. */
  color: string
}

export interface City {
  id: string
  name: string
}

export interface Viceroyalty {
  id: string
  name: string
  cities: City[]
}

export interface LyraSettings {
  systemName: string
  tagline: string
}

/** Viceroyalty + city pair ("Viceroyalty and city of origin" style fields). */
export interface PlaceValue {
  viceroyaltyId: string | null
  cityId: string | null
}

export interface LogEntry {
  id: string
  /** ISO date yyyy-mm-dd. */
  date: string
  title: string
  body: string
}

export type FieldValue = string | number | boolean | null | PlaceValue | LogEntry[]

/** A stored value: the truth plus fabricated overrides per classification. */
export interface FieldValueRecord {
  truth: FieldValue
  /** classificationId -> value shown to that classification. */
  overrides?: Record<string, FieldValue>
}

export interface LyraRecord {
  id: string
  typeId: string
  createdAt: string
  /** fieldId -> stored value. */
  values: Record<string, FieldValueRecord>
}

export interface LyraDatabase {
  schemaVersion: number
  settings: LyraSettings
  classifications: Classification[]
  viceroyalties: Viceroyalty[]
  recordTypes: RecordType[]
  records: LyraRecord[]
}
