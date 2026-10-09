# Launch readiness

## Current product (no demo path)

Users go through **Next steps** on Home:

1. Set home area  
2. Meet someone  
3. Start a conversation  
4. Join or create an Ajo  

Ajo works app-wide (no travel to a center). Transport has no fees. Trust comes from chat, approved visits, and Ajo behaviour.

## Pipelines

| Pipeline | Command |
|----------|---------|
| Groups engine | `npm test` |
| Product smoke | `npm run test:smoke` |
| Build | `npm run build` |
| Legacy HTML | `npm run export:legacy` |
| CI | GitHub Actions on `main` |
| Host | Vercel |

## Next step (backend)

1. **Accounts** — phone/email auth  
2. **Sync** — replace localStorage via `src/data/client.js`  
3. **Realtime circle chat** — replace NPC replies  
4. **Payments** — contributions & payouts; fee on organizer pot  
5. **Server stone roll** — fair RNG  

Offline MVP validates UX and rules until those land.
