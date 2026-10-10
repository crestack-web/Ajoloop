# AjoLoop live backend checklist

## 1. SQL
Run `supabase/migrations/001_live_backend.sql` (or `supabase/schema.sql`) in Supabase SQL Editor.

## 2. Vercel env
| Name | Purpose |
|------|---------|
| `SUPABASE_PROJECT_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhooks, credit/debit wallet |
| `BATCHS_API_KEY` | Bachs payments (server only) |
| `APP_URL` | Production site URL |
| `KYC_NIN_SALT` | Optional extra salt for NIN hash |

Client maps `SUPABASE_PROJECT_URL` + `SUPABASE_ANON_KEY` via `vite.config.js`.

## 3. Bachs webhook
`https://YOUR_DOMAIN/api/payments/webhook`

## 4. What is live vs local
| Feature | Live backend |
|---------|----------------|
| Auth (email/password) | Supabase Auth |
| Game progress | `game_states` JSON |
| Wallet balance | `wallets` + Bachs top-up/withdraw |
| KYC NIN | `kyc_profiles` |
| Bank accounts | `bank_accounts` |
| Friendships / DMs | tables |
| Ajo circles, stones, pots | Still in each user’s `game_states` (shared multiplayer Ajo tables = next phase) |

## 5. After deploy
Hard refresh. Sign in. Top up / KYC / bank should hit `/api/*` and Supabase.
