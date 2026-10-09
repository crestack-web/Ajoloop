# Roadmap

## Phase 0 — Done
- [x] Playable offline life-sim (Kano City)
- [x] Ajo circles with trust/reputation consequences
- [x] Social groups (privacy, roles, invites, events) separate from Ajo money
- [x] Headless tests for groups engine (249 checks)

## Phase 1 — Production foundation (this repo)
- [x] Modular Vite app (engine / UI / data / styles)
- [x] Dev server, production build, legacy HTML export
- [x] Architecture + env scaffold for backend
- [ ] Split UI into view modules (`life`, `town`, `ajo`, `groups`, …)
- [ ] Basic accessibility pass (focus, contrast, reduced motion already partial)
- [ ] PWA manifest + offline shell

## Phase 2 — Accounts & cloud save
- [ ] Auth (email / phone / OAuth)
- [ ] Cloud save of player snapshot
- [ ] Device sync; conflict policy (last-write or day-based)

## Phase 3 — Real multiplayer circles
- [ ] Real player-to-player groups (replace NPC-only chat where online)
- [ ] Server-validated Ajo contributions and payouts
- [ ] Moderation queue for reports
- [ ] Invite links that work across devices

## Phase 4 — Growth
- [ ] More locations / jobs / seasons
- [ ] Creator tools for community events
- [ ] Analytics (privacy-preserving) using existing `G.gev` event names
