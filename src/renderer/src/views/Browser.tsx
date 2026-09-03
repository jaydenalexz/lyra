import { useState } from 'react'
import type { JSX } from 'react'
import type { FieldDef, LyraRecord } from '@shared/types'
import { displayValue, resolveFieldValue, recordTitle } from '@shared/resolve'
import { useApp, newRecord } from '../store'

type SortDir = 'asc' | 'desc'

export function Browser(): JSX.Element | null {
  const db = useApp((s) => s.db)!
  const route = useApp((s) => s.route)
  const viewAs = useApp((s) => s.viewAs)
  const navigate = useApp((s) => s.navigate)
  const mutate = useApp((s) => s.mutate)
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  if (route.view !== 'browser') return null
  const type = db.recordTypes.find((t) => t.id === route.typeId)
  if (!type) {
    return (
      <div className="scroll">
        <p className="hint">No record type selected. Add one in Configuration → Record Types.</p>
      </div>
    )
  }

  const records = db.records.filter((r) => r.typeId === type.id)
  const columns = type.fields.filter((f) => f.id !== type.titleFieldId && f.type !== 'log').slice(0, 3)

  let rows: LyraRecord[] = records
  const q = query.trim().toLowerCase()
  if (q !== '') {
    rows = rows.filter((r) =>
      type.fields.some((f) => {
        const v = displayValue(f, resolveFieldValue(db, f, r.values[f.id], viewAs), db)
        return v.toLowerCase().includes(q)
      })
    )
  }
  if (sortKey !== null) {
    const field = type.fields.find((f) => f.id === sortKey)
    if (field) {
      const dir = sortDir === 'asc' ? 1 : -1
      rows = [...rows].sort((a, b) => {
        const av = displayValue(field, resolveFieldValue(db, field, a.values[field.id], viewAs), db)
        const bv = displayValue(field, resolveFieldValue(db, field, b.values[field.id], viewAs), db)
        if (av === '' && bv !== '') return 1
        if (bv === '' && av !== '') return -1
        const an = Number(av)
        const bn = Number(bv)
        if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== '' && bv !== '') return (an - bn) * dir
        return av.localeCompare(bv) * dir
      })
    }
  }

  const createRecord = () => {
    const record = newRecord(type.id)
    mutate((draft) => {
      draft.records.push(record)
    })
    navigate({ view: 'profile', typeId: type.id, recordId: record.id })
  }

  const erase = (record: LyraRecord) => {
    if (!window.confirm(`Erase ${recordTitle(db, record)} from the system? This cannot be undone.`)) return
    mutate((draft) => {
      draft.records = draft.records.filter((r) => r.id !== record.id)
    })
  }

  const headerClick = (fieldId: string) => {
    if (sortKey === fieldId) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(fieldId)
      setSortDir('asc')
    }
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div className="viewbar">
        <h1>{type.plural}</h1>
        <span className="badge">{records.length} on file</span>
        <span className="spacer" />
        <input
          type="text"
          placeholder={`Search ${type.plural.toLowerCase()}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: 260 }}
        />
        <button className="btn primary" onClick={createRecord}>
          + Register new
        </button>
      </div>
      <div className="scroll">
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => headerClick(type.titleFieldId)}>
                  {titleFieldLabel(type)} {sortKey === type.titleFieldId ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                {columns.map((f: FieldDef) => (
                  <th key={f.id} onClick={() => headerClick(f.id)}>
                    {f.label} {sortKey === f.id ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
                <th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2}>
                    <span className="hint">No records on file{query ? ' matching the search' : ''}.</span>
                  </td>
                </tr>
              )}
              {rows.map((record) => (
                <tr
                  className="row"
                  key={record.id}
                  onClick={() => navigate({ view: 'profile', typeId: type.id, recordId: record.id })}
                >
                  <td style={{ fontWeight: 600 }}>{recordTitle(db, record)}</td>
                  {columns.map((f) => (
                    <td key={f.id} className={f.type === 'number' || f.type === 'date' ? 'mono' : ''}>
                      {displayValue(f, resolveFieldValue(db, f, record.values[f.id], viewAs), db) || (
                        <span style={{ color: 'var(--faint)' }}>—</span>
                      )}
                    </td>
                  ))}
                  <td>
                    <button
                      className="btn small danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        erase(record)
                      }}
                    >
                      Erase
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function titleFieldLabel(type: { titleFieldId: string; fields: FieldDef[] }): string {
  return type.fields.find((f) => f.id === type.titleFieldId)?.label ?? 'Name'
}
