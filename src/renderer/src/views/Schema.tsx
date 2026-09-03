import { useState } from 'react'
import type { JSX } from 'react'
import type {
  Classification,
  FieldDef,
  FieldType,
  FieldValue,
  LyraDatabase,
  PlaceValue,
  RecordType,
  Viceroyalty
} from '@shared/types'
import { uid } from '@shared/defaults'
import { classificationsByRank, topClassification } from '@shared/resolve'
import { useApp, type SchemaTab } from '../store'

const TABS: { id: SchemaTab; label: string }[] = [
  { id: 'types', label: 'Record Types' },
  { id: 'clearances', label: 'Clearances' },
  { id: 'geography', label: 'Geography' },
  { id: 'settings', label: 'Data & Settings' }
]

const FIELD_TYPES: { id: FieldType; label: string }[] = [
  { id: 'text', label: 'Short text' },
  { id: 'longtext', label: 'Long text' },
  { id: 'number', label: 'Number' },
  { id: 'date', label: 'Date' },
  { id: 'boolean', label: 'Yes / No' },
  { id: 'select', label: 'Selection list' },
  { id: 'place', label: 'Viceroyalty & City' },
  { id: 'log', label: 'Dated log entries' }
]

export function Schema(): JSX.Element {
  const route = useApp((s) => s.route)
  const tab = route.view === 'schema' ? route.tab : 'types'
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div className="viewbar">
        <h1>System Configuration</h1>
        <span className="spacer" />
        <div className="tabs">
          {TABS.map((t) => (
            <TabButton key={t.id} tab={t.id} label={t.label} active={tab} />
          ))}
        </div>
      </div>
      <div className="scroll" style={{ display: 'flex', flexDirection: 'column' }}>
        {tab === 'types' && <TypesTab />}
        {tab === 'clearances' && <ClearancesTab />}
        {tab === 'geography' && <GeographyTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}

function TabButton({ tab, label, active }: { tab: SchemaTab; label: string; active: SchemaTab }): JSX.Element {
  const navigate = useApp((s) => s.navigate)
  return (
    <button className={`tab${tab === active ? ' active' : ''}`} onClick={() => navigate({ view: 'schema', tab })}>
      {label}
    </button>
  )
}

/* ————————————————— Record Types ————————————————— */

function TypesTab(): JSX.Element {
  const db = useApp((s) => s.db)!
  const mutate = useApp((s) => s.mutate)
  const [selectedId, setSelectedId] = useState<string>(db.recordTypes[0]?.id ?? '')
  const [openField, setOpenField] = useState<string | null>(null)
  const type = db.recordTypes.find((t) => t.id === selectedId) ?? db.recordTypes[0]

  const addType = () => {
    mutate((draft) => {
      const f: FieldDef = { id: uid(), label: 'Name', type: 'text', section: 'General', required: true }
      draft.recordTypes.push({
        id: uid(),
        name: 'New Type',
        plural: 'New Types',
        titleFieldId: f.id,
        fields: [f]
      })
    })
  }

  if (!type) {
    return (
      <div>
        <p className="hint">No record types defined.</p>
        <button className="btn primary" onClick={addType}>
          + Add record type
        </button>
      </div>
    )
  }

  const deleteType = () => {
    if (!window.confirm(`Delete record type "${type.name}" and all its records?`)) return
    mutate((draft) => {
      draft.recordTypes = draft.recordTypes.filter((t) => t.id !== type.id)
      draft.records = draft.records.filter((r) => r.typeId !== type.id)
    })
    setSelectedId('')
    setOpenField(null)
  }

  const patchType = (patch: Partial<RecordType>) =>
    mutate((draft) => {
      const t = draft.recordTypes.find((x) => x.id === type.id)
      if (t) Object.assign(t, patch)
    })

  const addField = () =>
    mutate((draft) => {
      const t = draft.recordTypes.find((x) => x.id === type.id)
      if (t) t.fields.push({ id: uid(), label: 'New field', type: 'text', section: 'General' })
    })

  const removeField = (fieldId: string) => {
    if (!window.confirm('Remove this field? Its stored values in all records will be deleted.')) return
    mutate((draft) => {
      const t = draft.recordTypes.find((x) => x.id === type.id)
      if (!t) return
      t.fields = t.fields.filter((f) => f.id !== fieldId)
      if (t.titleFieldId === fieldId) t.titleFieldId = t.fields[0]?.id ?? ''
      for (const r of draft.records) {
        if (r.typeId === t.id) delete r.values[fieldId]
      }
    })
    setOpenField(null)
  }

  const moveField = (fieldId: string, dir: -1 | 1) =>
    mutate((draft) => {
      const t = draft.recordTypes.find((x) => x.id === type.id)
      if (!t) return
      const i = t.fields.findIndex((f) => f.id === fieldId)
      const j = i + dir
      if (i < 0 || j < 0 || j >= t.fields.length) return
      ;[t.fields[i], t.fields[j]] = [t.fields[j], t.fields[i]]
    })

  return (
    <div className="split">
      <div className="panel list-col">
        <span className="label">Record types</span>
        {db.recordTypes.map((t) => (
          <button
            key={t.id}
            className={`nav-item${t.id === type.id ? ' active' : ''}`}
            onClick={() => {
              setSelectedId(t.id)
              setOpenField(null)
            }}
          >
            {t.plural}
            <span className="count">{db.records.filter((r) => r.typeId === t.id).length}</span>
          </button>
        ))}
        <button className="btn small" style={{ marginTop: 8 }} onClick={addType}>
          + Add type
        </button>
      </div>

      <div className="edit-col">
        <div className="panel" style={{ padding: 16 }}>
          <div className="form-grid">
            <label>Singular name</label>
            <input type="text" value={type.name} onChange={(e) => patchType({ name: e.target.value })} />
            <label>Plural name</label>
            <input type="text" value={type.plural} onChange={(e) => patchType({ plural: e.target.value })} />
            <label>Title field</label>
            <select value={type.titleFieldId} onChange={(e) => patchType({ titleFieldId: e.target.value })}>
              {type.fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>
            The title field names each record in lists and profile headers.
          </p>
          <div style={{ marginTop: 12 }}>
            <button className="btn danger small" onClick={deleteType}>
              Delete this type
            </button>
          </div>
        </div>

        <div className="section-title">Fields</div>
        <div className="field-list">
          {type.fields.map((f, i) => (
            <div key={f.id}>
              <div className="field-item">
                <span className="order">
                  <button title="Move up" onClick={() => moveField(f.id, -1)} disabled={i === 0}>
                    ▲
                  </button>
                  <button
                    title="Move down"
                    onClick={() => moveField(f.id, 1)}
                    disabled={i === type.fields.length - 1}
                  >
                    ▼
                  </button>
                </span>
                <span className="f-label">{f.label}</span>
                {f.immutable && <span className="badge">immutable</span>}
                {f.required && <span className="badge">required</span>}
                <span className="f-type">{fieldTypeLabel(f.type)}</span>
                <button className="btn small" onClick={() => setOpenField(openField === f.id ? null : f.id)}>
                  {openField === f.id ? 'Close' : 'Edit'}
                </button>
              </div>
              {openField === f.id && (
                <div className="panel" style={{ margin: '6px 0 2px 26px', padding: 14 }}>
                  <FieldEditor
                    field={f}
                    onChange={(patch) =>
                      mutate((draft) => {
                        const t = draft.recordTypes.find((x) => x.id === type.id)
                        const target = t?.fields.find((x) => x.id === f.id)
                        if (target) Object.assign(target, patch)
                      })
                    }
                  />
                  <div style={{ marginTop: 10 }}>
                    <button className="btn danger small" onClick={() => removeField(f.id)}>
                      Remove field
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="btn primary small" onClick={addField}>
            + Add field
          </button>
        </div>
        <p className="hint" style={{ marginTop: 14 }}>
          Changing a field's type keeps stored values as-is — clear the values afterwards if they no longer fit.
        </p>
      </div>
    </div>
  )
}

function fieldTypeLabel(type: FieldType): string {
  return FIELD_TYPES.find((t) => t.id === type)?.label ?? type
}

function FieldEditor({ field, onChange }: { field: FieldDef; onChange: (patch: Partial<FieldDef>) => void }): JSX.Element {
  return (
    <div className="form-grid">
      <label>Label</label>
      <input type="text" value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
      <label>Type</label>
      <select value={field.type} onChange={(e) => onChange({ type: e.target.value as FieldType })}>
        {FIELD_TYPES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <label>Section</label>
      <input
        type="text"
        value={field.section}
        placeholder="General"
        onChange={(e) => onChange({ section: e.target.value })}
      />
      <label>Immutable</label>
      <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={field.immutable ?? false}
          onChange={(e) => onChange({ immutable: e.target.checked || undefined })}
        />
        <span className="hint">Lore-locked once set (e.g. place of origin)</span>
      </label>
      <label>Required</label>
      <input
        type="checkbox"
        checked={field.required ?? false}
        onChange={(e) => onChange({ required: e.target.checked || undefined })}
      />
      <label>Description</label>
      <input type="text" value={field.description ?? ''} onChange={(e) => onChange({ description: e.target.value })} />
      {field.type === 'select' && (
        <>
          <label>Options</label>
          <textarea
            value={(field.options ?? []).join('\n')}
            placeholder="One option per line"
            onChange={(e) => onChange({ options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
          />
        </>
      )}
    </div>
  )
}

/* ————————————————— Clearances ————————————————— */

function ClearancesTab(): JSX.Element {
  const db = useApp((s) => s.db)!
  const mutate = useApp((s) => s.mutate)
  const viewAs = useApp((s) => s.viewAs)
  const setViewAs = useApp((s) => s.setViewAs)
  const top = topClassification(db)
  const ordered = classificationsByRank(db)

  const add = () =>
    mutate((draft) => {
      const minRank = draft.classifications.length > 0 ? Math.min(...draft.classifications.map((c) => c.rank)) : 1
      draft.classifications.push({
        id: uid(),
        name: 'New Clearance',
        rank: minRank - 1,
        color: '#8a93a6'
      })
    })

  const remove = (c: Classification) => {
    if (!window.confirm(`Delete clearance "${c.name}"? Fabricated views written for it will be removed.`)) return
    mutate((draft) => {
      draft.classifications = draft.classifications.filter((x) => x.id !== c.id)
      for (const r of draft.records) {
        for (const key of Object.keys(r.values)) {
          const stored = r.values[key]
          if (stored.overrides) delete stored.overrides[c.id]
        }
      }
    })
    if (viewAs === c.id) {
      const remaining = db.classifications.filter((x) => x.id !== c.id)
      const newTop = remaining.length > 0 ? remaining.reduce((a, b) => (b.rank > a.rank ? b : a)) : null
      if (newTop) setViewAs(newTop.id)
    }
  }

  const patch = (id: string, p: Partial<Classification>) =>
    mutate((draft) => {
      const c = draft.classifications.find((x) => x.id === id)
      if (c) Object.assign(c, p)
    })

  return (
    <div style={{ maxWidth: 720 }}>
      <p className="hint" style={{ marginTop: 0 }}>
        Officers of every clearance can query the system — but only the highest rank (<strong>{top?.name ?? '—'}</strong>)
        sees the true data. Every other tier may be shown fabricated values, set per field on each record's profile.
      </p>
      <div className="panel" style={{ padding: 8 }}>
        {ordered.map((c, i) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderBottom: i < ordered.length - 1 ? '1px solid var(--border)' : 'none'
            }}
          >
            <input type="color" value={c.color} onChange={(e) => patch(c.id, { color: e.target.value })} />
            <input
              type="text"
              value={c.name}
              style={{ width: 220 }}
              onChange={(e) => patch(c.id, { name: e.target.value })}
            />
            <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              rank
              <input
                type="number"
                value={c.rank}
                style={{ width: 70 }}
                onChange={(e) => patch(c.id, { rank: Number(e.target.value) })}
              />
            </label>
            {top?.id === c.id && <span className="badge author">sees the truth</span>}
            <span style={{ flex: 1 }} />
            <button className="btn small danger" onClick={() => remove(c)}>
              Delete
            </button>
          </div>
        ))}
      </div>
      <button className="btn primary small" style={{ marginTop: 10 }} onClick={add}>
        + Add clearance
      </button>
    </div>
  )
}

/* ————————————————— Geography ————————————————— */

function GeographyTab(): JSX.Element {
  const db = useApp((s) => s.db)!
  const mutate = useApp((s) => s.mutate)

  const addViceroyalty = () =>
    mutate((draft) => {
      draft.viceroyalties.push({ id: uid(), name: 'New Viceroyalty', cities: [] })
    })

  const removeViceroyalty = (v: Viceroyalty) => {
    if (!window.confirm(`Remove "${v.name}" and its cities? Place fields referencing it will be cleared.`)) return
    mutate((draft) => {
      draft.viceroyalties = draft.viceroyalties.filter((x) => x.id !== v.id)
      scrubPlaces(draft, v.id, undefined)
    })
  }

  const addCity = (viceroyaltyId: string) =>
    mutate((draft) => {
      const v = draft.viceroyalties.find((x) => x.id === viceroyaltyId)
      if (v) v.cities.push({ id: uid(), name: 'New City' })
    })

  const removeCity = (viceroyaltyId: string, cityId: string) =>
    mutate((draft) => {
      const v = draft.viceroyalties.find((x) => x.id === viceroyaltyId)
      if (v) v.cities = v.cities.filter((c) => c.id !== cityId)
      scrubPlaces(draft, undefined, cityId)
    })

  return (
    <div style={{ maxWidth: 760 }}>
      <p className="hint" style={{ marginTop: 0 }}>
        The Empire's three viceroyalties and their cities. "Viceroyalty &amp; City" fields draw their options from here.
      </p>
      {db.viceroyalties.map((v) => (
        <div className="panel" key={v.id} style={{ padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="text"
              value={v.name}
              style={{ width: 260, fontWeight: 600 }}
              onChange={(e) =>
                mutate((draft) => {
                  const t = draft.viceroyalties.find((x) => x.id === v.id)
                  if (t) t.name = e.target.value
                })
              }
            />
            <span className="badge">{v.cities.length} cities</span>
            <span style={{ flex: 1 }} />
            <button className="btn small danger" onClick={() => removeViceroyalty(v)}>
              Remove
            </button>
          </div>
          <div style={{ margin: '10px 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {v.cities.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  value={c.name}
                  style={{ width: 220 }}
                  onChange={(e) =>
                    mutate((draft) => {
                      const t = draft.viceroyalties.find((x) => x.id === v.id)?.cities.find((x) => x.id === c.id)
                      if (t) t.name = e.target.value
                    })
                  }
                />
                <button className="btn small danger" onClick={() => removeCity(v.id, c.id)}>
                  ✕
                </button>
              </div>
            ))}
            <button className="btn small" style={{ alignSelf: 'flex-start' }} onClick={() => addCity(v.id)}>
              + Add city
            </button>
          </div>
        </div>
      ))}
      <button className="btn primary small" onClick={addViceroyalty}>
        + Add viceroyalty
      </button>
    </div>
  )
}

function scrubPlaces(draft: LyraDatabase, vicId: string | undefined, cityId: string | undefined): void {
  const fix = (v: FieldValue): FieldValue => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return v
    if ('viceroyaltyId' in v) {
      const p = v as PlaceValue
      if (vicId !== undefined && p.viceroyaltyId === vicId) return { viceroyaltyId: null, cityId: null }
      if (cityId !== undefined && p.cityId === cityId) return { ...p, cityId: null }
    }
    return v
  }
  for (const r of draft.records) {
    for (const key of Object.keys(r.values)) {
      const stored = r.values[key]
      stored.truth = fix(stored.truth)
      if (stored.overrides) {
        for (const k of Object.keys(stored.overrides)) stored.overrides[k] = fix(stored.overrides[k])
      }
    }
  }
}

/* ————————————————— Settings & data ————————————————— */

function SettingsTab(): JSX.Element {
  const db = useApp((s) => s.db)!
  const mutate = useApp((s) => s.mutate)
  const dataPath = useApp((s) => s.dataPath)
  const replaceDb = useApp((s) => s.replaceDb)

  const importDb = async () => {
    const result = await window.lyra.importDb()
    if (result.ok && result.db !== undefined) {
      replaceDb(result.db)
    }
  }

  const reset = async () => {
    if (!window.confirm('Reset the ENTIRE database to the initial template? All records, fields and fabrications will be lost.'))
      return
    const seeded = await window.lyra.reset()
    replaceDb(seeded)
  }

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="panel" style={{ padding: 16 }}>
        <div className="section-title" style={{ marginTop: 0 }}>
          System identity
        </div>
        <div className="form-grid">
          <label>System name</label>
          <input
            type="text"
            value={db.settings.systemName}
            onChange={(e) => mutate((draft) => void (draft.settings.systemName = e.target.value))}
          />
          <label>Tagline</label>
          <input
            type="text"
            value={db.settings.tagline}
            onChange={(e) => mutate((draft) => void (draft.settings.tagline = e.target.value))}
          />
        </div>
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <div className="section-title" style={{ marginTop: 0 }}>
          Data file
        </div>
        <p className="hint" style={{ marginTop: 0 }}>
          Everything — schema, records, fabrications — lives in a single JSON file, autosaved as you edit:
        </p>
        <p className="mono" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', overflowWrap: 'anywhere' }}>
          {dataPath ?? '—'}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => void window.lyra.openFolder()}>
            Open folder
          </button>
          <button className="btn" onClick={() => void window.lyra.exportDb(db)}>
            Export a copy…
          </button>
          <button className="btn" onClick={() => void importDb()}>
            Import from file…
          </button>
          <button className="btn danger" onClick={() => void reset()}>
            Reset database…
          </button>
        </div>
        <p className="hint" style={{ marginBottom: 0 }}>
          Automatic backups are kept in <span style={{ fontFamily: 'var(--mono)' }}>data/backups/</span>.
        </p>
      </div>
    </div>
  )
}
