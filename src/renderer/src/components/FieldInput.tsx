import type { FieldDef, FieldValue, LyraDatabase, LogEntry, PlaceValue } from '@shared/types'
import type { JSX } from 'react'
import { newLogEntry } from '../model'

interface Props {
  field: FieldDef
  /** The value being edited (truth or an override). */
  value: FieldValue
  db: LyraDatabase
  disabled?: boolean
  onChange: (value: FieldValue) => void
}

export function FieldInput({ field, value, db, disabled, onChange }: Props): JSX.Element {
  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%' }}
        />
      )
    case 'longtext':
      return (
        <textarea
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%' }}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          className="mono"
          value={typeof value === 'number' ? value : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          style={{ width: 160 }}
        />
      )
    case 'date':
      return (
        <input
          type="date"
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'boolean':
      return (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <input
            type="checkbox"
            checked={value === true}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>Yes</span>
        </label>
      )
    case 'select':
      return (
        <select
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )
    case 'place':
      return <PlaceInput value={value as PlaceValue} db={db} disabled={disabled} onChange={onChange} />
    case 'log':
      return <LogInput value={value as LogEntry[]} disabled={disabled} onChange={onChange} />
  }
}

function PlaceInput({
  value,
  db,
  disabled,
  onChange
}: {
  value: PlaceValue
  db: LyraDatabase
  disabled?: boolean
  onChange: (v: PlaceValue) => void
}): JSX.Element {
  const viceroyalty = db.viceroyalties.find((v) => v.id === value?.viceroyaltyId)
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <select
        value={value?.viceroyaltyId ?? ''}
        disabled={disabled}
        onChange={(e) => {
          const vicId = e.target.value || null
          const vic = db.viceroyalties.find((v) => v.id === vicId)
          const cityStillValid = vic?.cities.some((c) => c.id === value?.cityId)
          onChange({
            viceroyaltyId: vicId,
            cityId: vicId !== null && cityStillValid ? value.cityId : null
          })
        }}
      >
        <option value="">Viceroyalty…</option>
        {db.viceroyalties.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <select
        value={value?.cityId ?? ''}
        disabled={disabled || !viceroyalty}
        onChange={(e) => onChange({ viceroyaltyId: value.viceroyaltyId, cityId: e.target.value || null })}
      >
        <option value="">City…</option>
        {(viceroyalty?.cities ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function LogInput({
  value,
  disabled,
  onChange
}: {
  value: LogEntry[]
  disabled?: boolean
  onChange: (v: LogEntry[]) => void
}): JSX.Element {
  const entries = Array.isArray(value) ? value : []
  const update = (id: string, patch: Partial<LogEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }
  return (
    <div>
      <div className="loglist">
        {entries.length === 0 && <span className="hint">No entries.</span>}
        {entries.map((e) => (
          <div className="log-entry" key={e.id} style={{ flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <input
                type="date"
                value={e.date}
                disabled={disabled}
                onChange={(ev) => update(e.id, { date: ev.target.value })}
              />
              <input
                type="text"
                placeholder="Entry title"
                value={e.title}
                disabled={disabled}
                onChange={(ev) => update(e.id, { title: ev.target.value })}
                style={{ flex: 1 }}
              />
              <button
                className="btn small danger"
                disabled={disabled}
                onClick={() => onChange(entries.filter((x) => x.id !== e.id))}
              >
                Remove
              </button>
            </div>
            <textarea
              placeholder="Details…"
              value={e.body}
              disabled={disabled}
              onChange={(ev) => update(e.id, { body: ev.target.value })}
              style={{ width: '100%', minHeight: 44 }}
            />
          </div>
        ))}
      </div>
      <button className="btn small" disabled={disabled} onClick={() => onChange([...entries, newLogEntry()])}>
        + Add entry
      </button>
    </div>
  )
}
