-- Shared multiplayer Ajo circles (production core)
-- Run after 001_live_backend.sql

create table if not exists public.ajo_circles (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 64),
  purpose text not null default 'general',
  size int not null check (size between 2 and 20),
  amount numeric(14,2) not null check (amount > 0),
  freq_days int not null default 7 check (freq_days in (1,3,7,14,30)),
  status text not null default 'open'
    check (status in ('open','stones','active','done','cancelled')),
  vis text not null default 'public' check (vis in ('public','private')),
  cycle int not null default 0,
  fee_pct numeric(5,4) not null default 0.05,
  order_ids uuid[] default '{}',
  stones jsonb default '{}'::jsonb,
  rolled boolean not null default false,
  start_day int,
  invite_code text unique,
  whatsapp_link text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ajo_circles_status_idx on public.ajo_circles (status, vis);
create index if not exists ajo_circles_host_idx on public.ajo_circles (host_id);

create table if not exists public.ajo_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.ajo_circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('host','member')),
  join_reason text,
  joined_at timestamptz not null default now(),
  unique (circle_id, user_id)
);
create index if not exists ajo_members_user_idx on public.ajo_members (user_id);

create table if not exists public.ajo_invite_codes (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.ajo_circles(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references public.profiles(id),
  max_uses int not null default 10 check (max_uses between 1 and 100),
  uses int not null default 0,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ajo_contributions (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.ajo_circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  cycle int not null check (cycle >= 0),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('due','pending','confirmed','failed','refunded','skipped')),
  payment_ref text,
  wallet_ledger_ref text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (circle_id, user_id, cycle)
);
create index if not exists ajo_contrib_circle_idx on public.ajo_contributions (circle_id, cycle);

create table if not exists public.ajo_payouts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.ajo_circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  cycle int not null,
  amount numeric(14,2) not null check (amount >= 0),
  fee numeric(14,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending','claimed','paid','failed')),
  use_reason text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  unique (circle_id, cycle)
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 64),
  category text,
  area text,
  label text,
  bio text,
  img text,
  open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists businesses_owner_idx on public.businesses (owner_id);
create index if not exists businesses_area_idx on public.businesses (area);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  price numeric(14,2) not null check (price >= 0),
  stock int,
  available boolean not null default true,
  img text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  meta jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- RLS
alter table public.ajo_circles enable row level security;
alter table public.ajo_members enable row level security;
alter table public.ajo_invite_codes enable row level security;
alter table public.ajo_contributions enable row level security;
alter table public.ajo_payouts enable row level security;
alter table public.businesses enable row level security;
alter table public.products enable row level security;
alter table public.notifications enable row level security;

do $$ begin
  drop policy if exists "Public open circles readable" on public.ajo_circles;
  drop policy if exists "Host manages circle" on public.ajo_circles;
  drop policy if exists "Members read own circles" on public.ajo_circles;
  create policy "Public open circles readable" on public.ajo_circles
    for select to authenticated
    using (vis = 'public' or host_id = auth.uid() or exists (
      select 1 from public.ajo_members m where m.circle_id = id and m.user_id = auth.uid()
    ));
  create policy "Host inserts circle" on public.ajo_circles
    for insert to authenticated with check (host_id = auth.uid());
  create policy "Host updates circle" on public.ajo_circles
    for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());

  drop policy if exists "Members read membership" on public.ajo_members;
  drop policy if exists "User joins self" on public.ajo_members;
  create policy "Members read membership" on public.ajo_members
    for select to authenticated using (
      user_id = auth.uid() or exists (
        select 1 from public.ajo_members m2 where m2.circle_id = circle_id and m2.user_id = auth.uid()
      )
    );
  create policy "User joins self" on public.ajo_members
    for insert to authenticated with check (user_id = auth.uid());

  drop policy if exists "Read invite codes as member/host" on public.ajo_invite_codes;
  create policy "Read invite codes as member/host" on public.ajo_invite_codes
    for select to authenticated using (
      exists (select 1 from public.ajo_circles c where c.id = circle_id and c.host_id = auth.uid())
    );

  drop policy if exists "Own contributions read" on public.ajo_contributions;
  create policy "Own contributions read" on public.ajo_contributions
    for select to authenticated using (
      user_id = auth.uid() or exists (
        select 1 from public.ajo_members m where m.circle_id = circle_id and m.user_id = auth.uid()
      )
    );

  drop policy if exists "Own payouts read" on public.ajo_payouts;
  create policy "Own payouts read" on public.ajo_payouts
    for select to authenticated using (
      user_id = auth.uid() or exists (
        select 1 from public.ajo_members m where m.circle_id = circle_id and m.user_id = auth.uid()
      )
    );

  drop policy if exists "Businesses public read" on public.businesses;
  drop policy if exists "Owner manages business" on public.businesses;
  create policy "Businesses public read" on public.businesses for select to authenticated using (true);
  create policy "Owner inserts business" on public.businesses for insert to authenticated with check (owner_id = auth.uid());
  create policy "Owner updates business" on public.businesses for update to authenticated using (owner_id = auth.uid());

  drop policy if exists "Products public read" on public.products;
  drop policy if exists "Owner manages products" on public.products;
  create policy "Products public read" on public.products for select to authenticated using (true);
  create policy "Owner manages products" on public.products for all to authenticated
    using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
    with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

  drop policy if exists "Own notifications" on public.notifications;
  create policy "Own notifications" on public.notifications
    for select to authenticated using (user_id = auth.uid());
  create policy "Own notifications update" on public.notifications
    for update to authenticated using (user_id = auth.uid());
end $$;

-- Atomic join: prevent overfill
create or replace function public.ajo_join_circle(
  p_circle_id uuid,
  p_reason text default null
) returns public.ajo_members
language plpgsql security definer set search_path = public as $$
declare
  c public.ajo_circles;
  cnt int;
  mem public.ajo_members;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into c from public.ajo_circles where id = p_circle_id for update;
  if not found then raise exception 'circle not found'; end if;
  if c.status <> 'open' then raise exception 'circle not open'; end if;
  select count(*) into cnt from public.ajo_members where circle_id = p_circle_id;
  if cnt >= c.size then raise exception 'circle is full'; end if;
  insert into public.ajo_members (circle_id, user_id, role, join_reason)
  values (p_circle_id, auth.uid(), case when c.host_id = auth.uid() then 'host' else 'member' end, left(coalesce(p_reason,''), 200))
  on conflict (circle_id, user_id) do update set join_reason = excluded.join_reason
  returning * into mem;
  return mem;
end;
$$;

revoke all on function public.ajo_join_circle from public;
grant execute on function public.ajo_join_circle to authenticated;

-- Contribution confirmed only via service role after wallet debit
create or replace function public.ajo_record_contribution(
  p_circle_id uuid,
  p_user_id uuid,
  p_cycle int,
  p_amount numeric,
  p_payment_ref text default null
) returns public.ajo_contributions
language plpgsql security definer set search_path = public as $$
declare
  row public.ajo_contributions;
begin
  insert into public.ajo_contributions (circle_id, user_id, cycle, amount, status, payment_ref, confirmed_at)
  values (p_circle_id, p_user_id, p_cycle, p_amount, 'confirmed', p_payment_ref, now())
  on conflict (circle_id, user_id, cycle) do update
    set status = 'confirmed', payment_ref = excluded.payment_ref, confirmed_at = now(), amount = excluded.amount
  returning * into row;
  return row;
end;
$$;
revoke all on function public.ajo_record_contribution from public;
grant execute on function public.ajo_record_contribution to service_role;
