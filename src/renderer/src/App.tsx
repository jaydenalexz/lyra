import { useEffect } from 'react'
import type { JSX } from 'react'
import { useApp, flushSave } from './store'
import { isTopClassification, topClassification } from '@shared/resolve'
import { Browser } from './views/Browser'
import { Profile } from './views/Profile'
import { Schema } from './views/Schema'

export function App(): JSX.Element | null {
  const db = useApp((s) => s.db)
  const route = useApp((s) => s.route)
  const init = useApp((s) => s.init)

  useEffect(() => {
    void init()
    const onHide = () => flushSave()
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [init])

  if (!db) {
    return (
      <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="sigil" style={{ fontFamily: 'var(--mono)', letterSpacing: '0.4em', color: 'var(--accent)' }}>
          LYRA
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Topbar />
      <div className="content">
        {route.view !== 'schema' && <Sidebar />}
        <div className="main">
          <MainView />
        </div>
      </div>
    </div>
  )
}

function Topbar(): JSX.Element {
  const db = useApp((s) => s.db)!
  const viewAs = useApp((s) => s.viewAs)
  const setViewAs = useApp((s) => s.setViewAs)
  const authorMode = useApp((s) => s.authorMode)
  const setAuthorMode = useApp((s) => s.setAuthorMode)
  const navigate = useApp((s) => s.navigate)
  const route = useApp((s) => s.route)
  const saveState = useApp((s) => s.saveState)

  const ordered = [...db.classifications].sort((a, b) => b.rank - a.rank)
  const viewingTop = isTopClassification(db, viewAs)

  return (
    <div className="topbar">
      <div className="brand">
        <span className="sigil">{db.settings.systemName}</span>
        <span className="tagline">{db.settings.tagline}</span>
      </div>
      <span className="spacer" />
      <select
        value={viewAs ?? ''}
        onChange={(e) => setViewAs(e.target.value)}
        title="Simulate the system view for this clearance"
        style={{ maxWidth: 200 }}
      >
        {ordered.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.id === topClassification(db)?.id ? '  ·  truth' : ''}
          </option>
        ))}
      </select>
      {viewingTop ? (
        <span className="badge" style={{ color: 'var(--ok)', borderColor: 'rgba(89,212,153,0.4)' }}>
          <span className="dot" />
          True data
        </span>
      ) : (
        <span className="badge" style={{ color: 'var(--danger)', borderColor: 'rgba(224,92,92,0.4)' }}>
          <span className="dot" />
          Presented data
        </span>
      )}
      <button
        className={`btn small${authorMode ? ' primary' : ''}`}
        onClick={() => setAuthorMode(!authorMode)}
        title="Show author overlay: edit fabricated views per clearance"
      >
        Author overlay
      </button>
      <button
        className={`btn small${route.view === 'schema' ? ' primary' : ''}`}
        onClick={() => navigate({ view: 'schema', tab: 'types' })}
      >
        Configuration
      </button>
      <span className={`save-dot${saveState === 'saving' ? ' saving' : ''}`}>
        <span className="pulse" />
        {saveState === 'saving' ? 'syncing' : saveState === 'saved' ? 'synced' : 'ready'}
      </span>
    </div>
  )
}

function Sidebar(): JSX.Element {
  const db = useApp((s) => s.db)!
  const route = useApp((s) => s.route)
  const navigate = useApp((s) => s.navigate)

  const activeType = route.view === 'browser' || route.view === 'profile' ? route.typeId : null

  return (
    <div className="sidebar">
      <span className="label">Records</span>
      {db.recordTypes.map((t) => (
        <button
          key={t.id}
          className={`nav-item${activeType === t.id ? ' active' : ''}`}
          onClick={() => navigate({ view: 'browser', typeId: t.id })}
        >
          {t.plural}
          <span className="count">{db.records.filter((r) => r.typeId === t.id).length}</span>
        </button>
      ))}
    </div>
  )
}

function MainView(): JSX.Element {
  const route = useApp((s) => s.route)
  if (route.view === 'schema') return <Schema />
  if (route.view === 'profile') return <Profile />
  return <Browser />
}
