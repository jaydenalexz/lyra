import type { LyraDatabase, RecordType, FieldDef, Classification } from './types'
import { SCHEMA_VERSION } from './types'

export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function field(partial: Omit<FieldDef, 'id'> & { id?: string }): FieldDef {
  return { id: partial.id ?? uid(), ...partial }
}

const CITIZEN_TYPE: RecordType = {
  id: 'type-citizen',
  name: 'Citizen',
  plural: 'Citizens',
  titleFieldId: 'f-full-name',
  fields: [
    field({
      id: 'f-full-name',
      label: 'Full Name',
      type: 'text',
      section: 'Identity',
      required: true,
      description: 'Registered legal name.'
    }),
    field({
      id: 'f-citizen-id',
      label: 'Citizen ID',
      type: 'text',
      section: 'Identity',
      description: 'Imperial registry number.'
    }),
    field({
      id: 'f-origin',
      label: 'Viceroyalty & City of Origin',
      type: 'place',
      section: 'Origin',
      immutable: true,
      required: true,
      description: 'Fixed at registration. Immutable under imperial law.'
    }),
    field({
      id: 'f-current',
      label: 'Current Viceroyalty & City',
      type: 'place',
      section: 'Residence'
    }),
    field({
      id: 'f-credit-score',
      label: 'Social Credit Score',
      type: 'number',
      section: 'Standing',
      description: 'Numerical standing assigned by Lyra.'
    }),
    field({
      id: 'f-health',
      label: 'Health Records',
      type: 'log',
      section: 'Records'
    }),
    field({
      id: 'f-criminal',
      label: 'Criminal Record',
      type: 'log',
      section: 'Records'
    })
  ]
}

const CLASSIFICATIONS: Classification[] = [
  { id: 'cls-emperor', name: 'Emperor', rank: 4, color: '#e8b64c' },
  { id: 'cls-minister', name: 'High Minister', rank: 3, color: '#b18cf0' },
  { id: 'cls-officer', name: 'Imperial Officer', rank: 2, color: '#5aa9f0' },
  { id: 'cls-servant', name: 'Civil Servant', rank: 1, color: '#8a93a6' }
]

export function seedDatabase(): LyraDatabase {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      systemName: 'LYRA',
      tagline: 'Imperial Information System — Most Divine Empire of the Phoenix'
    },
    classifications: CLASSIFICATIONS.map((c) => ({ ...c })),
    viceroyalties: [
      { id: 'vic-new-love', name: 'New Love', cities: [] },
      { id: 'vic-new-dream', name: 'New Dream', cities: [] },
      { id: 'vic-new-hope', name: 'New Hope', cities: [] }
    ],
    recordTypes: [structuredClone(CITIZEN_TYPE)],
    records: []
  }
}
