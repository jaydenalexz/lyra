import { useState } from 'react'
import type { JSX } from 'react'
import type { FieldDef, FieldValue, LyraDatabase } from '@shared/types'
import { displayValue, fabricatableClassifications, hasOverride, resolveFieldValue } from '@shared/resolve'
import type { LyraRecord } from '@shared/types'
import { clearOverride, setOverride } from '../model'
import { useApp } from '../store'
import { FieldInput } from './FieldInput'

/**
 * Author overlay for a single field: shows what each non-top classification
 * currently sees, and lets the author write fabricated values per tier.
 */
export function FabricationPanel({
  db,
  recordId,
  field
}: {
  db: LyraDatabase
  recordId: string
  field: FieldDef
}): JSX.Element {
  const { mutate } = useApp()
  const [editingTier, setEditingTier] = useState<string | null>(null)
  const record = db.records.find((r) => r.id === recordId)
  if (!record) return <></>
  const stored = record.values[field.id]
  const tiers = fabricatableClassifications(db)

  const apply = (fn: (r: LyraRecord) => void) => {
    mutate((draft) => {
      const target = draft.records.find((r) => r.id === recordId)
      if (target) fn(target)
    })
  }

  return (
    <div className="fab-panel">
      <div className="fab-head">
        <span>Presented views — nothing is redacted, lower tiers may see fabricated data</span>
        {editingTier && (
          <button className="btn small" onClick={() => setEditingTier(null)}>
            Done
          </button>
        )}
      </div>
      {tiers.map((tier) => {
        const resolved = resolveFieldValue(db, field, stored, tier.id)
        const fabricated = hasOverride(stored, tier.id)
        const isEditing = editingTier === tier.id
        return (
          <div className="fab-tier" key={tier.id}>
            <span className="tier-name">
              <span className="badge" style={{ color: tier.color, borderColor: `${tier.color}55` }}>
                <span className="dot" />
                {tier.name}
              </span>
            </span>
            {isEditing ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <FieldInput
                  field={field}
                  value={stored?.overrides?.[tier.id] ?? (stored?.truth as FieldValue)}
                  db={db}
                  onChange={(v) => apply((r) => setOverride(r, field, tier.id, v))}
                />
                <div className="hint" style={{ marginTop: 4 }}>
                  Editing starts from the true value — change whatever the Empire prefers this tier to see.
                </div>
              </div>
            ) : (
              <>
                <span
                  className={`tier-value${fabricated ? ' fabricated' : ''}`}
                  title={fabricated ? 'Fabricated for this tier' : 'Shows the true value'}
                >
                  {fabricated && '▲ '}
                  {displayValue(field, resolved, db) || '—'}
                </span>
                <button className="btn small" onClick={() => setEditingTier(tier.id)}>
                  {fabricated ? 'Edit' : 'Fabricate'}
                </button>
                {fabricated && (
                  <button
                    className="btn small"
                    onClick={() => apply((r) => clearOverride(r, field, tier.id))}
                    title="Remove the fabrication; this tier will see the truth again"
                  >
                    Clear
                  </button>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
