# Ajoloop — Build your circle

Life simulation set in **Kano, Nigeria**: work, trade, join **Ajo** savings circles, and form **social groups** with neighbours.

This repo is structured as a **production-ready web app**: offline play works today; UI and backend can evolve independently.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173).

```bash
npm test          # headless groups engine suite
npm run build     # production assets → dist/
npm run preview   # serve dist/
npm run export:legacy  # optional single-file kano-city.html
```

## Play offline (no install)

Open `kano-city.html` in a browser (legacy single-file build). After pulling modular changes, regenerate it with `npm run export:legacy`.

## Project layout

```
src/
  engine/game.js     # rules only (tested headlessly)
  engine/index.js    # loads engine into global scope
  ui/app.js          # screens & input
  styles/main.css    # design system
  data/client.js     # local now → remote later
  main.js            # entry
tests/groups.test.js
docs/ARCHITECTURE.md
docs/ROADMAP.md
```

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for how to change UI safely and how backend plugs in.

## What is in the game

- **Life loop** — energy, hunger, happiness, cash, savings, reputation, trust
- **Town** — Home, Kasuwa Market, Mama Put Kitchen, Keke Park, Workplace, Arewa Bank, Suya Spot, Ajo Center
- **Jobs & hustles** — employment, keke errands, mini shop
- **Ajo** — rotating savings with real contribution/payout rules
- **Social groups** — public/private, roles, invites, chat, meetups (not Ajo money)
- **NPCs** — simulated neighbours until multiplayer ships

## Backend later

Set nothing for offline mode. When you are ready:

```env
VITE_API_MODE=remote
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Implement the stubs in `src/data/client.js`. Engine state keys already mirror planned tables.

## License

All rights reserved unless otherwise noted.
