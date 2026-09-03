import { describe, expect, it } from 'vitest'
import { seedDatabase } from './defaults'
import { migrate } from './migrate'
import {
  displayValue,
  fabricatableClassifications,
  isTopClassification,
  resolveFieldValue,
  topClassification
} from './resolve'

function setup() {
  const db = seedDatabase()
  const emperor = db.classifications.find((c) => c.name === 'Emperor')!
  const officer = db.classifications.find((c) => c.name === 'Imperial Officer')!
  const nameField = db.recordTypes[0].fields[0]
  return { db, emperor, officer, nameField }
}

describe('topClassification', () => {
  it('returns the classification with the highest rank', () => {
    const { db, emperor } = setup()
    expect(topClassification(db)?.id).toBe(emperor.id)
  })
})

describe('isTopClassification', () => {
  it('is true only for the highest rank', () => {
    const { db, emperor, officer } = setup()
    expect(isTopClassification(db, emperor.id)).toBe(true)
    expect(isTopClassification(db, officer.id)).toBe(false)
  })
})

describe('resolveFieldValue', () => {
  it('always shows the truth to the top clearance', () => {
    const { db, emperor, officer, nameField } = setup()
    const stored = { truth: 'Real Name', overrides: { [officer.id]: 'Approved Name' } }
    expect(resolveFieldValue(db, nameField, stored, emperor.id)).toBe('Real Name')
  })

  it('shows the fabricated override to a lower tier', () => {
    const { db, officer, nameField } = setup()
    const stored = { truth: 'Real Name', overrides: { [officer.id]: 'Approved Name' } }
    expect(resolveFieldValue(db, nameField, stored, officer.id)).toBe('Approved Name')
  })

  it('falls back to the truth when a tier has no fabrication', () => {
    const { db, officer, nameField } = setup() // no override written
    const stored = { truth: 'Real Name' }
    expect(resolveFieldValue(db, nameField, stored, officer.id)).toBe('Real Name')
  })

  it('never hides data — overrides are additive, not redactions', () => {
    const { db, officer, nameField } = setup()
    const stored = { truth: 'Real Name', overrides: { [officer.id]: 'Approved Name' } }
    // Truth is still intact underneath the overlay.
    expect(stored.truth).toBe('Real Name')
    expect(resolveFieldValue(db, nameField, stored, officer.id)).not.toBe('Real Name')
  })

  it('returns an empty value when nothing is stored', () => {
    const { db, officer, nameField } = setup()
    expect(resolveFieldValue(db, nameField, undefined, officer.id)).toBe('')
  })
})

describe('fabricatableClassifications', () => {
  it('excludes only the top clearance', () => {
    const { db, emperor } = setup()
    const ids = fabricatableClassifications(db).map((c) => c.id)
    expect(ids).not.toContain(emperor.id)
    expect(ids).toHaveLength(db.classifications.length - 1)
  })
})

describe('displayValue', () => {
  it('renders a place as "Viceroyalty — City"', () => {
    const { db } = setup()
    const vic = db.viceroyalties[0]
    vic.cities.push({ id: 'city-1', name: 'Solmara' })
    const field = { id: 'f', label: 'f', type: 'place', section: 's' } as const
    expect(displayValue(field, { viceroyaltyId: vic.id, cityId: 'city-1' }, db)).toBe(
      'New Love — Solmara'
    )
  })

  it('renders logs as an entry count', () => {
    const field = { id: 'f', label: 'f', type: 'log', section: 's' } as const
    expect(displayValue(field, [{ id: '1', date: '0001-01-01', title: 'a', body: '' }], seedDatabase())).toBe(
      '1 entries'
    )
  })
})

describe('migrate', () => {
  it('passes current-version data through unchanged in shape', () => {
    const seeded = seedDatabase()
    const out = migrate(JSON.parse(JSON.stringify(seeded)))
    expect(out.schemaVersion).toBe(seeded.schemaVersion)
    expect(out.classifications).toHaveLength(seeded.classifications.length)
  })

  it('bumps a missing schemaVersion to the current one', () => {
    const raw = { settings: { systemName: 'X', tagline: '' }, records: [] }
    expect(migrate(raw).schemaVersion).toBe(1)
  })
})
