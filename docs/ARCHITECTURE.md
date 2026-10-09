# Architecture

Ajoloop is structured so you can ship the offline life-sim today and grow into a real multiplayer product without rewriting the rules.

## Layers

```
┌─────────────────────────────────────────┐
│  UI  (src/ui)                           │  DOM, screens, input
├─────────────────────────────────────────┤
│  Engine  (src/engine)                   │  Pure game rules + state
├─────────────────────────────────────────┤
│  Data client  (src/data)                │  local today · remote later
├─────────────────────────────────────────┤
│  Persistence                            │  localStorage · Supabase
└─────────────────────────────────────────┘
```

### Engine (`src/engine/game.js`)

- All rules for life loop, jobs, Ajo, social groups, NPCs, reputation, trust.
- **No DOM.** Tests run this file headlessly.
- Markers `//#ENGINE-START` / `//#ENGINE-END` are required by `tests/groups.test.js`.
- State shape is intentionally close to future tables:
  `players`, `npcs`, `relationships`, `transactions`, `jobs`, `businesses`,
  `ajos`, `ajo_members`, `ajo_contributions`, `ajo_payouts`, `events`,
  `notifications`, `groups`, `group_members`, `posts`, …

### UI (`src/ui/app.js`)

- Renders from engine state (`G`) and dispatches actions (`travel`, `work`, `joinAjo`, …).
- Safe to redesign screens without touching rules.
- Keep side effects in the engine; UI should stay thin.

### Data client (`src/data/client.js`)

- Single seam for backend work.
- **Phase 1 (now):** `VITE_API_MODE=local` — engine `Store` + localStorage.
- **Phase 2:** auth + cloud save (`pullState` / `pushEvent`).
- **Phase 3:** real multiplayer groups; NPCs remain for solo play.

## Running modes

| Mode | Command | Notes |
|------|---------|--------|
| Dev | `npm run dev` | Vite HMR, module source |
| Build | `npm run build` | Static assets in `dist/` |
| Preview | `npm run preview` | Serve production build |
| Tests | `npm test` | Node, no browser |
| Legacy HTML | `npm run export:legacy` | Single-file `kano-city.html` |

## Adding a backend later

1. Implement auth in `src/data/client.js` (e.g. Supabase session).
2. Map engine tables → Postgres; start with `players` + `groups` + `ajos`.
3. Move **authoritative** actions (Ajo payments, group bans) to API routes; keep simulation client-side for offline.
4. Feature-flag with `VITE_API_MODE=remote`.

Do not put secrets in the client. Use a small backend or Supabase RLS.

## UI change workflow

1. Edit `src/ui/app.js` or split views into `src/ui/views/*.js` as the file grows.
2. Styles live in `src/styles/main.css` (design tokens in `:root`).
3. Run `npm run dev` and iterate.
4. Keep engine imports free of DOM so tests stay green: `npm test`.

## Design tokens

CSS variables in `:root` — `--ink`, `--danfo`, `--keke`, `--hib`, `--sky`, `--txt`, `--mut`. Prefer these over hard-coded colours so themes stay consistent.
