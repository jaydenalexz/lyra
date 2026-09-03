# LYRA — Imperial Information System Terminal

A desktop app that simulates the in-universe **Lyra** information system of the **Most Divine Empire of the Phoenix** — a worldbuilding and writing tool for managing citizen records and previewing exactly what imperial officers of each clearance level are allowed to see.

Built with **Electron + React + TypeScript** (no database engine — one JSON file).

## The core mechanic: fabrication, not redaction

In-universe, Lyra never hides data. Every field stores the **true input**, and each clearance tier below the top may be shown a **fabricated version** of it — written by you, to support the Empire's and the Emperor's agenda. Only the highest clearance (the Emperor) sees the raw truth.

Concretely, every value on a profile is stored as:

```json
{
  "truth": "the real data",
  "overrides": { "<clearance-id>": "what this tier is shown instead" }
}
```

Switch the clearance selector in the top bar and every value in the app re-resolves: tier has an override → they see the fabrication; no override → they see the truth. Nothing is ever deleted.

## Features

- **Clearance switcher** — simulate the system view for any clearance tier.
- **Author overlay** — per-field panel showing what each tier currently sees, with "Fabricate / Edit / Clear" controls to write per-tier lies (editing starts from the true value).
- **Records** — searchable, sortable browser + full profile view with sections, immutable fields (lore-locked, e.g. *Viceroyalty & City of Origin*), and dated log fields (health records, criminal record).
- **Schema editor** (Configuration) — define record types and their fields (8 field types), clearance tiers (name, rank, color), the Empire's geography (viceroyalties + cities), and system identity. All in-app; no code changes needed.
- **Single data file** — everything lives in `data/lyra.data.json` (git-friendly, portable), autosaved with atomic writes and rotating backups in `data/backups/`. Export/import copies via dialog.

## Getting started

```bash
npm install
npm run dev
```

If `npm run dev` reports `Error: Electron uninstall`, the Electron binary wasn't downloaded during install (npm 11 skips postinstall scripts in non-interactive shells). Run:

```bash
node node_modules/electron/install.js
```

Other scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Run the app with HMR |
| `npm run build` | Production build to `out/` |
| `npm run preview` | Run the production build |
| `npm run typecheck` | Strict TS for main/preload/renderer |
| `npm run test` | Unit tests (view-resolution logic) |

## Data model

```
LyraDatabase
├── settings          system name + tagline
├── classifications   [{ id, name, rank, color }]   highest rank sees the truth
├── viceroyalties     [{ id, name, cities: [{ id, name }] }]
├── recordTypes       [{ id, name, plural, titleFieldId, fields: FieldDef[] }]
└── records           [{ id, typeId, values: { fieldId: { truth, overrides? } } }]
```

Field types: `text`, `longtext`, `number`, `date`, `boolean`, `select` (fixed options), `place` (viceroyalty + city bound to geography), `log` (dated entries). Field flags: `immutable` (locked once set), `required`.

The database is versioned with `schemaVersion`; future model changes go through `src/shared/migrate.ts`.

## Seeded defaults

The app starts with a **Citizen** record type (Full Name, Citizen ID, Viceroyalty & City of Origin *(immutable)*, Current Viceroyalty & City, Social Credit Score, Health Records *(log)*, Criminal Record *(log)*), the three viceroyalties (**New Love, New Dream, New Hope** — add your own cities), and four clearance tiers (Emperor → High Minister → Imperial Officer → Civil Servant). Everything is editable in-app.

## Codespaces

A devcontainer is included (`desktop-lite` feature + Electron runtime libraries). In a Codespace, run `npm run dev` and open port **6080** for the noVNC desktop to see the app window; the Vite dev server is on **5173**.
