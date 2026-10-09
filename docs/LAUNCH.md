# Launch readiness (offline MVP)

## Pipelines

| Pipeline | Command | Status |
|----------|---------|--------|
| Unit / groups engine | `npm test` | 249 checks |
| Product smoke | `npm run test:smoke` | Core flow |
| Dev server | `npm run dev` | Vite |
| Production build | `npm run build` | `dist/` |
| Legacy HTML | `npm run export:legacy` | `kano-city.html` |
| Hosting | Vercel via `vercel.json` | SPA rewrite |

## User flows covered

1. Onboarding (name, age, gender)  
2. Demo path unlock  
3. Home checklist  
4. Home area + nearby  
5. Business list + visit request/approve  
6. People + chat + trust acts  
7. Groups create/join  
8. Public Ajo list + join request  
9. Circle chat + activities  
10. Create Ajo → fill → stones → roll → start → payout + fee  

## Not live yet (honest)

- Real multiplayer accounts  
- Real bank / mobile-money payments  
- Server-side stone roll RNG  
- Push notifications  

Offline demo proves UX and rules before those connect.
