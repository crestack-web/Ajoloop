# Payments (Bachs)

Real NGN top-ups use **Bachs** (`BATCHS_API_KEY` (or `BACHS_API_KEY`) on Vercel). The secret key never ships to the browser.

## Env (Vercel)

| Variable | Where | Purpose |
|----------|--------|---------|
| `BATCHS_API_KEY` | Server | Bachs secret (also `BACHS_API_KEY`) (`sk_live_…` or `sk_sandbox_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Credit wallets from webhooks |
| `SUPABASE_PROJECT_URL` or `VITE_SUPABASE_URL` | Server + client | Project URL |
| `SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY` | Client | Auth |
| `APP_URL` | Server | Success/cancel base URL |

## Flow

1. User taps **Pay with Bachs** → `POST /api/payments/checkout`
2. Server creates a Bachs checkout session (NGN card / bank transfer)
3. Browser redirects to `checkout_url`
4. Bachs webhook → `POST /api/payments/webhook` → `credit_wallet`
5. User returns with `?payment=success` → client syncs `wallets.balance` into game cash

## SQL

Run the wallet section at the end of `supabase/schema.sql` in the Supabase SQL editor.

## Webhook URL

In Bachs dashboard: `https://YOUR_DOMAIN/api/payments/webhook`
