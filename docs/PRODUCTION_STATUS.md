# Ajoloop production status (implementation report)

## 1. Original state
- Hybrid architecture: Vite SPA + engine in `game.js` with **localStorage** game snapshot; Supabase used for auth, optional `game_states`, wallets, KYC.
- **Core Ajo circles, members, contributions, stones, pots, games** lived only in per-user JSON (`G.ajos`) — not shared between real users.
- NPCs, seeded businesses, and many social flows are intentionally simulated for the life-sim layer.
- Payments: Bachs checkout/webhook + wallet ledger partially real; contributions still spent local `G.p.cash` unless wired to wallet APIs.

### Critical issues found
- Multiplayer Ajo not in database (race conditions, no shared membership).
- Contribution “paid” could mean local button only.
- Client could not be trusted for amounts (must read circle.amount server-side).
- Service role correctly limited to API routes (not browser) — keep this invariant.

## 2. What was implemented (this pass)
### Database (`supabase/migrations/002_ajo_core.sql`)
- `ajo_circles`, `ajo_members`, `ajo_invite_codes`, `ajo_contributions`, `ajo_payouts`
- `businesses`, `products`, `notifications`
- RLS policies (member/host scoped reads; host create; self-join)
- `ajo_join_circle()` — atomic join with row lock (prevents overfill)
- `ajo_record_contribution()` — service_role only

### APIs
- `POST /api/ajo/create` — authenticated create + host membership
- `POST /api/ajo/join` — by circleId or invite code + RPC join
- `POST /api/ajo/contribute` — **server reads amount from DB**, debits wallet via `debit_wallet`, records contribution; refunds on failure
- `GET /api/ajo/list` — open public + mine
- `POST /api/ajo/invite` — host invite codes
- Shared `api/_supabase.js` helpers

### Client / UI
- `api.ajoCreate / ajoJoin / ajoContribute / ajoList / ajoInviteCode`
- Online create/join-by-code/contribute paths; local engine still mirrors for existing UI
- Local-only contribution path remains for offline/dev (not presented as bank-settled)

## 3. What was not claimed as done
- Full migration of every local Ajo UI field to cloud-only
- Stones roll / cycle advance as DB transactions
- Shared multiplayer games
- Business CRUD fully wired to `businesses` table
- Password reset UI, email verification flows beyond Supabase defaults
- Webhook signature verification depends on Bachs secret being set (`BACHS_WEBHOOK_SECRET`)
- Legal/regulatory readiness for real-money Ajo in Nigeria

## 4. Verification
| Check | Result |
|-------|--------|
| Schema migration authored | PASS (file present; run in Supabase required) |
| Service role not in browser bundle | PASS (API-only) |
| Contribution amount from client | PASS (server uses circle.amount) |
| Production build | see CI/local run |
| E2E two-user join | NOT RUN (needs live Supabase project) |
| RLS multi-account tests | NOT RUN |
| Payment webhook live | BLOCKED without production events |

## 5. Remaining blockers
| Item | Severity |
|------|----------|
| Run `002_ajo_core.sql` on Supabase | CRITICAL |
| Wire stones/cycle/payout claim to DB + wallet credit | CRITICAL for real-money Ajo |
| E2E tests with two accounts | HIGH |
| Confirm Bachs webhook secret + idempotency in prod | HIGH |
| Replace NPC-only social discovery with real profiles for “people” | MEDIUM |
| Business/products UI → `businesses`/`products` tables | MEDIUM |
| Nigerian regulatory/legal review before public real-money circles | CRITICAL (process, not code) |

## 6. Launch recommendation
**READY FOR STAGING** — core online Ajo create/join/contribute foundation is implementable after migration is applied and env vars are set.  
**NOT READY** for unsupervised public production with real pooled Ajo payouts until cycle/payout DB logic and E2E verification are complete.

### Required env (Vercel)
- `SUPABASE_PROJECT_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BATCHS_API_KEY`
- `APP_URL`
- Optional: `BACHS_WEBHOOK_SECRET`, `KYC_NIN_SALT`
