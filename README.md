# Ajoloop

**Build your circle.** Trust, community, businesses nearby, and traditional Ajo — offline-first MVP ready to plug into a backend.

## Product focus

- Character + home area + optional business  
- People, chat, closeness activities  
- Groups (social) separate from Ajo (money)  
- Public Ajo discovery, join requests, circle chat  
- Traditional Ajo: organizer round 1 + platform fee, stones for later rounds  
- Business visits: request → approval → trust (no transport fees)

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # groups engine (249 checks)
npm run test:smoke   # full product smoke path
npm run build        # production → dist/
npm run export:legacy  # single-file kano-city.html
```

## Demo path (for stakeholders)

1. Create a character  
2. Home → **Start demo path**  
3. Follow the checklist (home → people → chat → business → group → Ajo → payout)  
4. Ajo tab → public loops → Request → Chat  
5. Create Ajo → Demo fill → Roll stones → Start → resolve round  

## Deploy (Vercel)

- Connected to this repo: build `npm run build`, output `dist`  
- `vercel.json` included  
- Env (later): `VITE_API_MODE=remote`, `VITE_SUPABASE_URL`, keys — see `.env.example`

## Architecture

See `docs/ARCHITECTURE.md`, `docs/AJO_TRADITIONAL.md`, `docs/PLACES.md`, `docs/LAUNCH.md`.

Engine state is localStorage offline. `src/data/client.js` is the seam for auth/sync later.
