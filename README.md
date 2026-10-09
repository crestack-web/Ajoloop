# Ajoloop — Kano City

**Build your circle.** A life-simulation game set in Kano, Nigeria: work, trade, join Ajo savings circles, and form social groups with neighbours.

## Play

Open [`kano-city.html`](./kano-city.html) in a browser. Everything runs client-side (localStorage). No server required for the offline demo.

## What is in the game

- **Life loop** — energy, hunger, happiness, cash, savings, reputation, and trust
- **Town map** — Home, Kasuwa Market, Mama Put Kitchen, Keke Park, Workplace, Arewa Bank, Suya Spot, Ajo Center
- **Jobs & hustles** — shop assistant, delivery rider, salesperson, keke errands, mini shop
- **Ajo (rotating savings)** — join or host circles, vote for early payout, keep (or break) contributions
- **Social groups** — public/private communities, invitations, codes, chat, meetups, challenges — separate from Ajo money circles
- **NPCs** — simulated neighbours with relationship, trust, and reputation dynamics

## Tests

Headless checks for the social-groups engine (extracted from the HTML between `//#ENGINE-START` and `//#ENGINE-END`):

```bash
node groups_test.js kano-city.html
```

## Repo layout

| File | Purpose |
|------|---------|
| `kano-city.html` | Full offline game (UI + engine) |
| `groups_test.js` | Node test runner for the groups engine |
| `README.md` | This file |

## License

All rights reserved unless otherwise noted.
