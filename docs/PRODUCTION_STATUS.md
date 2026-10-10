# Ajoloop production status

Last updated: financial integrity pass (migration 003 + atomic contribute/cycle/claim).

## 1. Original state (pre-foundation)
- Hybrid SPA: local life-sim engine + Supabase auth/wallet.
- Ajo membership and contributions largely local JSON.
- Contribute API debited wallet then recorded contribution in two steps (refund on failure — race window).

## 2. Implemented (this pass)

### Database — `supabase/migrations/003_financial_integrity.sql`
| Change | Purpose |
|--------|---------|
| Unique index on `wallet_ledger.reference` | No double ledger entry for same ref |
| `credit_wallet` / `debit_wallet` idempotent on reference | Safe retries |
| `ajo_contribute_atomic()` | One transaction: auth → member check → balance → debit → contribution |
| `ajo_start_circle()` | Host starts full circle; sets `order_ids` (host first) |
| `ajo_advance_cycle()` | Host only; requires all confirmed/skipped; creates **pending** payout from `order_ids[cycle]` |
| `ajo_claim_payout()` | Recipient only; credits wallet once; marks claimed |

### Payout model (documented, not invented)
**Traditional rotating pot** (matches existing engine):
- Recipient = `order_ids[cycle]` (host is index 0 / first).
- Pot = sum of **confirmed** contribution amounts for that cycle.
- Platform fee = `fee_pct` of pot **only on cycle 0**.
- Claim moves funds wallet→user via `credit_wallet` with fixed reference `ajo_payout_{circle}_c{cycle}`.
- **Need-based prioritization is NOT implemented** — requires an explicit product decision before coding.

### APIs
- `POST /api/ajo/contribute` → `ajo_contribute_atomic` (no multi-step refund path)
- `POST /api/ajo/start` → start active circle
- `POST /api/ajo/advance` → close cycle + pending payout
- `POST /api/ajo/claim` → claim payout to wallet
- Webhook: signature check when secret set; refuses credit without `reference`; prefers `payment_intents.amount`

### Client
- `ajoStart`, `ajoAdvance`, `ajoClaim`
- Contribute sends stable `idempotencyKey`

### Local simulation
- Offline `payAjo` / local `G.ajos` unchanged for life-sim.
- Online path uses `cloudId` + wallet APIs; simulated pay is not a bank settlement.

## 3. Wallet / ledger integrity
- Single wallets table + ledger (no second wallet).
- Debit refuses overdraft (`insufficient balance`).
- Ledger reference uniqueness + function-level short-circuit on duplicate reference.
- Clients never call `credit_wallet` / `debit_wallet` (service_role / security definer only as granted).

## 4. Contribution atomicity
Single Postgres function under the caller’s JWT (`auth.uid()`):
1. Lock circle row  
2. Verify membership + `status = active`  
3. Amount from `circle.amount` only  
4. Host cycle 0 → `skipped` (no debit)  
5. Already `confirmed` → return duplicate (no second debit)  
6. `debit_wallet` + insert/upsert contribution in same transaction  

## 5. Cycle completion
- Host calls `ajo_advance_cycle` only when count of confirmed/skipped ≥ required payers.
- Advances `cycle` or marks `done` when `cycle+1 >= size`.
- Creates `ajo_payouts` row `pending` (not “paid externally”).

## 6. Payout processing
- **Internal wallet claim only** (not Bachs bank transfer in this pass).
- Bank withdrawal remains separate (`/api/payments/withdraw`) after claim.
- Duplicate claim returns existing state without double credit.

## 7. Payment provider (Bachs)
- Checkout creates `payment_intents` + session.
- Webhook credits only on success-like events.
- Signature: HMAC-SHA256 or static token vs `BACHS_WEBHOOK_SECRET` / `BATCHS_WEBHOOK_SECRET`.
- Production can force secret via `REQUIRE_WEBHOOK_SECRET=1`.
- Browser `?payment=success` is **not** treated as proof of payment (wallet sync only).

## 8. Tests executed
| Test | Result |
|------|--------|
| `node tests/financial_invariants.test.cjs` | **PASS** |
| Live Supabase RPC E2E (two users) | **NOT RUN** (no staging DB credentials in this environment) |
| Production `vite build` | **NOT RUN** (registry/network limits in agent environment) |
| Forged webhook without secret in prod | **NOT RUN** live; code returns 401 when secret configured |

## 9. Environment variables
| Variable | Required |
|----------|----------|
| `SUPABASE_PROJECT_URL` | Yes |
| `SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (webhooks, withdraw) |
| `BATCHS_API_KEY` | Yes for live checkout/payouts |
| `APP_URL` | Yes |
| `BACHS_WEBHOOK_SECRET` or `BATCHS_WEBHOOK_SECRET` | **Strongly recommended**; required if `REQUIRE_WEBHOOK_SECRET=1` |
| `KYC_NIN_SALT` | Optional |

### Manual steps
1. Run `001_live_backend.sql` (if not already).  
2. Run `002_ajo_core.sql`.  
3. Run **`003_financial_integrity.sql`**.  
4. Set webhook URL to `/api/payments/webhook` and shared secret in Bachs + Vercel.  
5. Redeploy Vercel.

## 10. Outstanding business-rule decisions
| Decision | Severity |
|----------|----------|
| Confirm traditional order-only payouts vs need-based prioritization | CRITICAL before marketing “need-based” |
| Whether host must always receive cycle 0 | HIGH (currently yes) |
| Late/missed contribution penalties beyond block | MEDIUM |
| External bank payout of pot without wallet claim step | MEDIUM |

## 11. Regulatory / operational blockers
| Item | Severity |
|------|----------|
| Nigerian payments / ROSCA regulatory review | CRITICAL |
| Staging E2E with two real accounts + funded wallets | CRITICAL |
| Webhook secret configured in production | HIGH |
| Monitoring/alerts on failed webhooks & debit errors | HIGH |
| Stones UI fully driven by `order_ids` from DB | MEDIUM |

## 12. Recommendation

**READY FOR STAGING**

Not **READY FOR PRODUCTION REVIEW** for public real-money Ajo until:
- Migration 003 applied on the project,
- Webhook secret verified end-to-end,
- Two-account contribution → advance → claim tested on staging,
- Explicit sign-off on payout recipient rules and legal review.
