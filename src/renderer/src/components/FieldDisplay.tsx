import type { FieldDef, FieldValue, LyraDatabase, LogEntry, PlaceValue } from '@shared/types'
import type { JSX } from 'react'
import { displayPlace } from '@shared/resolve'

function isEmptyValue(field: FieldDef, value: FieldValue | undefined): boolean {
  if (value === null || value === undefined || value === '') return true
  if (field.type === 'place') {
    const p = value as PlaceValue
    return !p.viceroyaltyId
  }
  if (field.type === 'log') return (value as LogEntry[]).length === 0
  return false
}

export function FieldDisplay({
  field,
  value,
  db
}: {
  field: FieldDef
  value: FieldValue | undefined
  db: LyraDatabase
}): JSX.Element {
  if (isEmptyValue(field, value)) {
    return <span className="empty">—</span>
  }
  switch (field.type) {
    case 'text':
    case 'longtext':
      return <>{String(value)}</>
    case 'number':
      return <span className="mono">{String(value)}</span>
    case 'date':
      return <span className="mono">{String(value)}</span>
    case 'boolean':
      return <>{value ? 'Yes' : 'No'}</>
    case 'select':
      return <>{String(value)}</>
    case 'place':
      return <>{displayPlace(db, value as PlaceValue)}</>
    case 'log': {
      const entries = value as LogEntry[]
      if (entries.length === 0) return <span className="empty">—</span>
      return (
        <div className="loglist">
          {entries.map((e) => (
            <div className="log-entry" key={e.id}>
              <span className="date">{e.date}</span>
              <div className="body">
                <div className="t">{e.title || '(untitled)'}</div>
                {e.body && <div className="b">{e.body}</div>}
              </div>
            </div>
          ))}
        </div>
      )
    }
  }
}
