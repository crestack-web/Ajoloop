-- AjoLoop full live backend (idempotent) — run once in Supabase SQL Editor
create extension if not exists "pgcrypto";

-- ========== Core ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null default '',
  avatar jsonb,
  area text,
  lat double precision,
  lng double precision,
  trust real default 50,
  rep real default 50,
  interests text[] default '{}',
  business_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_username_idx on public.profiles (lower(username));
create index if not exists profiles_area_idx on public.profiles (area);

create table if not exists public.game_states (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique (from_id, to_id)
);
create index if not exists friendships_to_idx on public.friendships (to_id, status);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_thread_idx on public.messages (from_id, to_id, created_at);

create table if not exists public.groups_public (
  id text primary key,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  description text default '',
  category text,
  area text,
  member_count int default 1,
  vis text default 'public',
  updated_at timestamptz not null default now()
);

-- ========== Wallets ==========
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  currency text not null default 'NGN',
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null,
  balance_after numeric(14,2) not null,
  kind text not null,
  reference text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists wallet_ledger_user_idx on public.wallet_ledger (user_id, created_at desc);

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending','completed','failed','cancelled')),
  bachs_checkout_id text,
  bachs_payment_id text,
  reference text unique,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists payment_intents_user_idx on public.payment_intents (user_id, created_at desc);
create index if not exists payment_intents_checkout_idx on public.payment_intents (bachs_checkout_id);

-- ========== KYC / Bank / Withdraw ==========
create table if not exists public.kyc_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  nin_last4 text,
  nin_hash text,
  full_name text,
  status text not null default 'unverified'
    check (status in ('unverified','pending','verified','rejected')),
  doc_path text,
  reject_reason text,
  submitted_at timestamptz,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_code text not null,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  is_default boolean not null default true,
  bachs_destination_id text,
  created_at timestamptz not null default now(),
  unique (user_id, account_number, bank_code)
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'NGN',
  status text not null default 'pending'
    check (status in ('pending','processing','completed','failed')),
  bank_account_id uuid references public.bank_accounts(id),
  bachs_payout_id text,
  reference text unique,
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists withdrawals_user_idx on public.withdrawals (user_id, created_at desc);

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.game_states enable row level security;
alter table public.friendships enable row level security;
alter table public.messages enable row level security;
alter table public.groups_public enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.payment_intents enable row level security;
alter table public.kyc_profiles enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.withdrawals enable row level security;

-- Drop/recreate policies so migration is re-runnable
do $$ begin
  -- profiles
  drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
  drop policy if exists "Users update own profile" on public.profiles;
  drop policy if exists "Users insert own profile" on public.profiles;
  create policy "Profiles are readable by authenticated users" on public.profiles for select to authenticated using (true);
  create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
  create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

  drop policy if exists "Own game state select" on public.game_states;
  drop policy if exists "Own game state upsert" on public.game_states;
  drop policy if exists "Own game state update" on public.game_states;
  create policy "Own game state select" on public.game_states for select to authenticated using (auth.uid() = user_id);
  create policy "Own game state upsert" on public.game_states for insert to authenticated with check (auth.uid() = user_id);
  create policy "Own game state update" on public.game_states for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

  drop policy if exists "See own friendships" on public.friendships;
  drop policy if exists "Create friendship" on public.friendships;
  drop policy if exists "Update friendship as party" on public.friendships;
  create policy "See own friendships" on public.friendships for select to authenticated using (auth.uid() = from_id or auth.uid() = to_id);
  create policy "Create friendship" on public.friendships for insert to authenticated with check (auth.uid() = from_id);
  create policy "Update friendship as party" on public.friendships for update to authenticated using (auth.uid() = from_id or auth.uid() = to_id);

  drop policy if exists "See own messages" on public.messages;
  drop policy if exists "Send message" on public.messages;
  create policy "See own messages" on public.messages for select to authenticated using (auth.uid() = from_id or auth.uid() = to_id);
  create policy "Send message" on public.messages for insert to authenticated with check (auth.uid() = from_id);

  drop policy if exists "Public groups read" on public.groups_public;
  drop policy if exists "Public groups write owner" on public.groups_public;
  create policy "Public groups read" on public.groups_public for select to authenticated using (true);
  create policy "Public groups write owner" on public.groups_public for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

  drop policy if exists "Own wallet select" on public.wallets;
  drop policy if exists "Own ledger select" on public.wallet_ledger;
  drop policy if exists "Own payment intents select" on public.payment_intents;
  drop policy if exists "Own wallet insert" on public.wallets;
  create policy "Own wallet select" on public.wallets for select to authenticated using (auth.uid() = user_id);
  create policy "Own wallet insert" on public.wallets for insert to authenticated with check (auth.uid() = user_id);
  create policy "Own ledger select" on public.wallet_ledger for select to authenticated using (auth.uid() = user_id);
  create policy "Own payment intents select" on public.payment_intents for select to authenticated using (auth.uid() = user_id);

  drop policy if exists "Own kyc select" on public.kyc_profiles;
  drop policy if exists "Own kyc upsert" on public.kyc_profiles;
  drop policy if exists "Own bank select" on public.bank_accounts;
  drop policy if exists "Own bank write" on public.bank_accounts;
  drop policy if exists "Own withdrawals select" on public.withdrawals;
  create policy "Own kyc select" on public.kyc_profiles for select to authenticated using (auth.uid() = user_id);
  create policy "Own kyc upsert" on public.kyc_profiles for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "Own bank select" on public.bank_accounts for select to authenticated using (auth.uid() = user_id);
  create policy "Own bank write" on public.bank_accounts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "Own withdrawals select" on public.withdrawals for select to authenticated using (auth.uid() = user_id);
end $$;

-- ========== Functions ==========
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', coalesce(new.raw_user_meta_data->>'username', 'Player'))
  )
  on conflict (id) do nothing;
  insert into public.game_states (user_id, state) values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;
  insert into public.wallets (user_id, balance) values (new.id, 0)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.credit_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_kind text,
  p_reference text default null,
  p_meta jsonb default '{}'::jsonb
) returns numeric
language plpgsql security definer set search_path = public as $$
declare new_bal numeric;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive'; end if;
  insert into public.wallets (user_id, balance, updated_at)
  values (p_user_id, p_amount, now())
  on conflict (user_id) do update
    set balance = public.wallets.balance + excluded.balance, updated_at = now()
  returning balance into new_bal;
  insert into public.wallet_ledger (user_id, amount, balance_after, kind, reference, meta)
  values (p_user_id, p_amount, new_bal, p_kind, p_reference, p_meta);
  return new_bal;
end;
$$;

create or replace function public.debit_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_kind text,
  p_reference text default null,
  p_meta jsonb default '{}'::jsonb
) returns numeric
language plpgsql security definer set search_path = public as $$
declare new_bal numeric; cur numeric;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive'; end if;
  select balance into cur from public.wallets where user_id = p_user_id for update;
  if cur is null then raise exception 'wallet not found'; end if;
  if cur < p_amount then raise exception 'insufficient balance'; end if;
  update public.wallets set balance = balance - p_amount, updated_at = now()
    where user_id = p_user_id returning balance into new_bal;
  insert into public.wallet_ledger (user_id, amount, balance_after, kind, reference, meta)
  values (p_user_id, -p_amount, new_bal, p_kind, p_reference, p_meta);
  return new_bal;
end;
$$;

revoke all on function public.credit_wallet from public;
revoke all on function public.debit_wallet from public;
grant execute on function public.credit_wallet to service_role;
grant execute on function public.debit_wallet to service_role;

-- Backfill wallets for existing profiles
insert into public.wallets (user_id, balance)
select id, 0 from public.profiles
on conflict (user_id) do nothing;

insert into public.game_states (user_id, state)
select id, '{}'::jsonb from public.profiles
on conflict (user_id) do nothing;
