# Places layer — Home, Business, Kano map

Offline-first model for the real-life geography vision. Same schema is intended for Supabase later.

## Principles

- **Approximate places only** — LGA / neighbourhood / landmark. No exact street pins for strangers.
- **Home** and **Business** are first-class nodes on a stylised Kano map.
- **Visit + chat + trade** build relationship and *shop trust* (game signals). Not Ajo credit.
- **Nearby** is opt-in and area-based (no live GPS in v1).
- **NPC businesses** seed the map until real multiplayer listings exist.

## Data model

```
player.home = { area, label, style, done }
player.nearbyOptIn = boolean
player.area = string          // mirrors home.area for group discovery

bizs[] = {
  id, owner, name, cat, area, label, ic, bio,
  open, closed?, trust, visits, created, products[{id,n,price}]
}

visits[] = { id, biz, by, day, hour, bought, ack }
chats = { "userA_userB": [{ by, t, day, hour }] }
```

## Kano map

- Areas: Fagge, Nasarawa, Dala, Gwale, Tarauni, Kano Municipal, Kumbotso, Ungogo
- Public nodes: Kasuwa, Mama Put Row, Suya Junction, Keke Park, Bank strip
- Pins: areas, public places, businesses, your home

## UI entry points

- **Town → City map** — pins, inspect, visit shops
- **Town → Businesses** — list / create player business
- **Set home** — area + private label + home style
- **Nearby** — met NPCs in same home area (demo)
- **Chat** — local thread with simulated replies

## Backend mapping (later)

| Client | Supabase |
|--------|----------|
| home | profiles.home_area, home_label_private |
| bizs | businesses |
| visits | business_visits |
| chats | messages |
| nearbyOptIn | profiles.nearby_opt_in |

Never auto-join Ajo from visit, chat, or group membership.
