# Backend setup (launch online)

AjoLoop ships offline by default. Online mode uses **Supabase** (Auth + Postgres + RLS).

## 1. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) → New project  
2. Copy **Project URL** and **anon public** key  

## 2. Run the schema

In Supabase → **SQL Editor**, paste and run:

`supabase/schema.sql`

This creates:

- `profiles` — public discovery fields  
- `game_states` — full save snapshot per user  
- `friendships` / `messages` — real social graph  
- `groups_public` — discoverable groups  
- Row Level Security so users only write their own data  

## 3. Auth settings

Supabase → **Authentication → Providers**

- Enable **Email**  
- For production: confirm email as you prefer  
- Site URL: your Vercel domain (e.g. `https://oop-one.vercel.app`)  

## 4. Environment variables

### Local (`.env`)

```
VITE_API_MODE=remote
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Vercel

Project → Settings → Environment Variables → same three keys → Redeploy.

## 5. Install & run

```bash
npm install
npm run dev
```

With remote mode:

- Register with **email + password + username**  
- Progress saves to the cloud (and still caches locally)  
- Sign in on another device to resume  

## 6. What is online today

| Feature | Online behaviour |
|---------|------------------|
| Accounts | Supabase Auth email/password |
| Save / resume | `game_states` JSON snapshot |
| Profile discovery | `profiles` table |
| Friend requests | `friendships` table |
| DMs | `messages` table |
| Public groups list | `groups_public` |

NPC neighbours still run client-side for solo play. Real users appear through profiles + friends.

## 7. Launch checklist

- [ ] Schema applied  
- [ ] Env vars on Vercel  
- [ ] Email auth enabled  
- [ ] Test register → play → sign out → sign in → state restored  
- [ ] Privacy policy / terms (required for stores)  
- [ ] Payment partner before **real-money** Ajo (not in this schema)  

## Security notes

- Never put the **service role** key in the frontend  
- RLS is required (included in schema)  
- Ajo cash in the app is still **demo currency** until a licensed payment flow exists  
