import { useState } from 'react'
import type { JSX } from 'react'
import type { FieldDef, LyraRecord } from '@shared/types'
import { emptyValueFor, isTopClassification, resolveFieldValue } from '@shared/resolve'
import { useApp } from '../store'
import { FieldDisplay } from '../components/FieldDisplay'
import { FieldInput } from '../components/FieldInput'
import { FabricationPanel } from '../components/FabricationPanel'
import { isLocked, setTruth } from '../model'

export function Profile(): JSX.Element | null {
  const db = useApp((s) => s.db)!
  const route = useApp((s) => s.route)
  const viewAs = useApp((s) => s.viewAs)
  const authorMode = useApp((s) => s.authorMode)
  const navigate = useApp((s) => s.navigate)
  const mutate = useApp((s) => s.mutate)
  const [editing, setEditing] = useState(false)

  if (route.view !== 'profile') return null
  const type = db.recordTypes.find((t) => t.id === route.typeId)
  const record: LyraRecord | undefined = db.records.find((r) => r.id === route.recordId)
  if (!type || !record) {
    return (
      <div className="scroll">
        <p className="hint">Record not found.</p>
      </div>
    )
  }

  const titleField = type.fields.find((f) => f.id === type.titleFieldId)
  const viewingTop = isTopClassification(db, viewAs)

  // Group fields into sections, preserving schema order.
  const sections: { name: string; fields: FieldDef[] }[] = []
  for (const f of type.fields) {
    const name = f.section.trim() === '' ? 'General' : f.section
    let group = sections.find((g) => g.name === name)
    if (!group) {
      group = { name, fields: [] }
      sections.push(group)
    }
    group.fields.push(f)
  }

  const title =
    titleField
      ? String(resolveFieldValue(db, titleField, record.values[titleField.id], viewAs)) || 'Unregistered'
      : 'Unregistered'

  const deleteRecord = () => {
    if (!window.confirm(`Erase this ${type.name.toLowerCase()} from the system? This cannot be undone.`)) return
    mutate((draft) => {
      draft.records = draft.records.filter((r) => r.id !== record.id)
    })
    navigate({ view: 'browser', typeId: type.id })
  }

  return (
    <div className="scroll fade-in">
      <div className="profile-head">
        <h1>{title}</h1>
        <span className="badge">{type.name}</span>
        {authorMode && <span className="badge author">Author overlay</span>}
        {!viewingTop && !authorMode && (
          <span className="badge fab">Presented data</span>
        )}
        <span style={{ flex: 1 }} />
        <button className="btn" onClick={() => setEditing(!editing)}>
          {editing ? 'View' : 'Amend'}
        </button>
        <button className="btn danger" onClick={deleteRecord}>
          Erase
        </button>
      </div>
      {authorMode && (
        <p className="hint" style={{ margin: '8px 0 0' }}>
          Author overlay active — each field below can carry a fabricated version per clearance tier.
          Only the top tier ({db.classifications.length > 0 ? topName(db) : ''}) sees the true input.
        </p>
      )}

      {sections.map((section) => (
        <section key={section.name}>
          <div className="section-title">{section.name}</div>
          <div className="panel">
            {section.fields.map((field) => {
              const locked = isLocked(record, field)
              const resolved = resolveFieldValue(db, field, record.values[field.id], viewAs)
              const hasFabrications =
                authorMode && record.values[field.id]?.overrides !== undefined
              return (
                <div className="field-row" key={field.id}>
                  <div className="field-label">
                    {field.label}
                    {field.immutable && (
                      <span className="lock" title="Immutable — fixed at registration under imperial law">
                        immutable
                      </span>
                    )}
                    {hasFabrications && <span className="badge fab">presented views exist</span>}
                  </div>
                  <div className="field-value">
                    {editing ? (
                      <>
                        <FieldInput
                          field={field}
                          value={record.values[field.id]?.truth ?? emptyValueFor(field)}
                          db={db}
                          disabled={locked}
                          onChange={(v) =>
                            mutate((draft) => {
                              const r = draft.records.find((x) => x.id === record.id)
                              if (r) setTruth(r, field, v)
                            })
                          }
                        />
                        {locked && <span className="hint"> Locked — immutable fields cannot be amended.</span>}
                        {field.description && <span className="desc">{field.description}</span>}
                      </>
                    ) : (
                      <>
                        <FieldDisplay field={field} value={resolved} db={db} />
                        {field.description && <span className="desc">{field.description}</span>}
                      </>
                    )}
                    {authorMode && <FabricationPanel db={db} recordId={record.id} field={field} />}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function topName(db: { classifications: { name: string; rank: number }[] }): string {
  return db.classifications.reduce((a, b) => (b.rank > a.rank ? b : a), db.classifications[0]).name
}
