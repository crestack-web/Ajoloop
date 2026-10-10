-- Financial integrity: atomic Ajo contribute, idempotent ledger, cycle + payout controls
-- Requires: 001 (wallets), 002 (ajo_*)

-- Idempotent ledger: same reference cannot debit/credit twice
create unique index if not exists wallet_ledger_reference_uidx
  on public.wallet_ledger (reference)
  where reference is not null and reference <> '';

-- Harden credit_wallet: skip duplicate reference
create or replace function public.credit_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_kind text,
  p_reference text default null,
  p_meta jsonb default '{}'::jsonb
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  new_bal numeric;
  existing_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  if p_reference is not null and p_reference <> '' then
    select id into existing_id from public.wallet_ledger where reference = p_reference limit 1;
    if existing_id is not null then
      select balance into new_bal from public.wallets where user_id = p_user_id;
      return coalesce(new_bal, 0);
    end if;
  end if;

  insert into public.wallets (user_id, balance, updated_at)
  values (p_user_id, p_amount, now())
  on conflict (user_id) do update
    set balance = public.wallets.balance + excluded.balance,
        updated_at = now()
  returning balance into new_bal;

  insert into public.wallet_ledger (user_id, amount, balance_after, kind, reference, meta)
  values (p_user_id, p_amount, new_bal, p_kind, p_reference, p_meta);

  return new_bal;
end;
$$;

-- Harden debit_wallet: skip duplicate reference (already debited)
create or replace function public.debit_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_kind text,
  p_reference text default null,
  p_meta jsonb default '{}'::jsonb
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  new_bal numeric;
  cur numeric;
  existing_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  if p_reference is not null and p_reference <> '' then
    select id into existing_id from public.wallet_ledger where reference = p_reference limit 1;
    if existing_id is not null then
      select balance into new_bal from public.wallets where user_id = p_user_id;
      return coalesce(new_bal, 0);
    end if;
  end if;

  select balance into cur from public.wallets where user_id = p_user_id for update;
  if cur is null then
    raise exception 'wallet not found';
  end if;
  if cur < p_amount then
    raise exception 'insufficient balance';
  end if;

  update public.wallets
    set balance = balance - p_amount, updated_at = now()
    where user_id = p_user_id
    returning balance into new_bal;

  insert into public.wallet_ledger (user_id, amount, balance_after, kind, reference, meta)
  values (p_user_id, -p_amount, new_bal, p_kind, p_reference, p_meta);

  return new_bal;
end;
$$;

revoke all on function public.credit_wallet from public;
revoke all on function public.debit_wallet from public;
grant execute on function public.credit_wallet to service_role;
grant execute on function public.debit_wallet to service_role;

-- Single atomic contribution: auth member, lock wallet, debit, record (or no-op if already confirmed)
create or replace function public.ajo_contribute_atomic(
  p_circle_id uuid,
  p_idempotency_key text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  c public.ajo_circles;
  mem_id uuid;
  amount numeric;
  cycle int;
  ref text;
  new_bal numeric;
  contrib public.ajo_contributions;
  existing public.ajo_contributions;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into c from public.ajo_circles where id = p_circle_id for update;
  if not found then
    raise exception 'circle not found';
  end if;
  if c.status <> 'active' then
    raise exception 'circle is not active';
  end if;

  select id into mem_id from public.ajo_members
    where circle_id = p_circle_id and user_id = uid;
  if mem_id is null then
    raise exception 'not a member';
  end if;

  amount := c.amount;
  cycle := c.cycle;

  -- Traditional round 1: host does not contribute (matches engine host_skip)
  if cycle = 0 and c.host_id = uid then
    insert into public.ajo_contributions (circle_id, user_id, cycle, amount, status, confirmed_at)
    values (p_circle_id, uid, cycle, 0, 'skipped', now())
    on conflict (circle_id, user_id, cycle) do update
      set status = 'skipped', confirmed_at = coalesce(public.ajo_contributions.confirmed_at, now())
    returning * into contrib;
    select balance into new_bal from public.wallets where user_id = uid;
    return jsonb_build_object(
      'ok', true,
      'skipped', true,
      'cycle', cycle,
      'amount', 0,
      'balance', coalesce(new_bal, 0),
      'contribution', to_jsonb(contrib)
    );
  end if;

  select * into existing from public.ajo_contributions
    where circle_id = p_circle_id and user_id = uid and cycle = cycle;

  if existing is not null and existing.status = 'confirmed' then
    select balance into new_bal from public.wallets where user_id = uid;
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'cycle', cycle,
      'amount', existing.amount,
      'balance', coalesce(new_bal, 0),
      'contribution', to_jsonb(existing),
      'reference', existing.payment_ref
    );
  end if;

  ref := coalesce(
    nullif(trim(p_idempotency_key), ''),
    'ajo_' || replace(p_circle_id::text, '-', '') || '_c' || cycle::text || '_' || replace(uid::text, '-', '')
  );

  -- Debit (locks wallet row inside debit_wallet)
  new_bal := public.debit_wallet(uid, amount, 'ajo_contribution', ref,
    jsonb_build_object('circle_id', p_circle_id, 'cycle', cycle));

  insert into public.ajo_contributions (
    circle_id, user_id, cycle, amount, status, payment_ref, confirmed_at
  ) values (
    p_circle_id, uid, cycle, amount, 'confirmed', ref, now()
  )
  on conflict (circle_id, user_id, cycle) do update
    set status = 'confirmed',
        amount = excluded.amount,
        payment_ref = excluded.payment_ref,
        confirmed_at = now()
  returning * into contrib;

  return jsonb_build_object(
    'ok', true,
    'cycle', cycle,
    'amount', amount,
    'balance', new_bal,
    'contribution', to_jsonb(contrib),
    'reference', ref
  );
end;
$$;

revoke all on function public.ajo_contribute_atomic from public;
grant execute on function public.ajo_contribute_atomic to authenticated;
grant execute on function public.ajo_contribute_atomic to service_role;

-- Open circle for contributions (host): open → requires stones rolled + order, or active already
-- Advance cycle only when all required contributions confirmed
create or replace function public.ajo_start_circle(p_circle_id uuid)
returns public.ajo_circles
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  c public.ajo_circles;
  mem_count int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into c from public.ajo_circles where id = p_circle_id for update;
  if not found then raise exception 'circle not found'; end if;
  if c.host_id <> uid then raise exception 'only host can start circle'; end if;
  if c.status not in ('open', 'stones') then raise exception 'circle cannot be started from current status'; end if;

  select count(*) into mem_count from public.ajo_members where circle_id = p_circle_id;
  if mem_count < c.size then raise exception 'circle is not full'; end if;

  -- Need payout order: host first, then remaining members
  if c.order_ids is null or cardinality(c.order_ids) < mem_count then
    select array_agg(user_id order by case when user_id = c.host_id then 0 else 1 end, joined_at)
      into c.order_ids
      from public.ajo_members where circle_id = p_circle_id;
  end if;

  update public.ajo_circles
    set status = 'active',
        cycle = 0,
        rolled = true,
        order_ids = c.order_ids,
        updated_at = now()
    where id = p_circle_id
    returning * into c;

  return c;
end;
$$;

revoke all on function public.ajo_start_circle from public;
grant execute on function public.ajo_start_circle to authenticated;

create or replace function public.ajo_advance_cycle(p_circle_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  c public.ajo_circles;
  required int;
  confirmed int;
  recipient uuid;
  pot numeric := 0;
  fee numeric := 0;
  pay numeric := 0;
  payout_row public.ajo_payouts;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into c from public.ajo_circles where id = p_circle_id for update;
  if not found then raise exception 'circle not found'; end if;
  if c.host_id <> uid then raise exception 'only host can advance cycle'; end if;
  if c.status <> 'active' then raise exception 'circle is not active'; end if;

  -- Required payers: all members except host on cycle 0
  if c.cycle = 0 then
    select count(*) into required from public.ajo_members
      where circle_id = p_circle_id and user_id <> c.host_id;
  else
    select count(*) into required from public.ajo_members where circle_id = p_circle_id;
  end if;

  select count(*) into confirmed from public.ajo_contributions
    where circle_id = p_circle_id and cycle = c.cycle and status in ('confirmed', 'skipped');

  if confirmed < required then
    raise exception 'cycle incomplete: % of % contributions recorded', confirmed, required;
  end if;

  -- Recipient from locked order (traditional rotating pot)
  if c.order_ids is null or cardinality(c.order_ids) <= c.cycle then
    raise exception 'payout order not set for this cycle';
  end if;
  recipient := c.order_ids[c.cycle + 1]; -- Postgres arrays are 1-indexed

  select coalesce(sum(amount), 0) into pot from public.ajo_contributions
    where circle_id = p_circle_id and cycle = c.cycle and status = 'confirmed';

  if c.cycle = 0 then
    fee := round(pot * coalesce(c.fee_pct, 0.05), 2);
  end if;
  pay := greatest(0, pot - fee);

  insert into public.ajo_payouts (circle_id, user_id, cycle, amount, fee, status)
  values (p_circle_id, recipient, c.cycle, pay, fee, 'pending')
  on conflict (circle_id, cycle) do update
    set amount = excluded.amount, fee = excluded.fee
  returning * into payout_row;

  if c.cycle + 1 >= c.size then
    update public.ajo_circles
      set status = 'done', updated_at = now()
      where id = p_circle_id
      returning * into c;
  else
    update public.ajo_circles
      set cycle = cycle + 1, updated_at = now()
      where id = p_circle_id
      returning * into c;
  end if;

  return jsonb_build_object(
    'ok', true,
    'circle', to_jsonb(c),
    'payout', to_jsonb(payout_row),
    'pot', pot,
    'fee', fee,
    'recipient', recipient
  );
end;
$$;


revoke all on function public.ajo_advance_cycle from public;
grant execute on function public.ajo_advance_cycle to authenticated;

-- Claim pending payout: credits recipient wallet once
create or replace function public.ajo_claim_payout(
  p_circle_id uuid,
  p_cycle int,
  p_use_reason text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  p public.ajo_payouts;
  ref text;
  new_bal numeric;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into p from public.ajo_payouts
    where circle_id = p_circle_id and cycle = p_cycle
    for update;
  if not found then raise exception 'payout not found'; end if;
  if p.user_id <> uid then raise exception 'not the payout recipient'; end if;
  if p.status in ('claimed', 'paid') then
    select balance into new_bal from public.wallets where user_id = uid;
    return jsonb_build_object('ok', true, 'duplicate', true, 'payout', to_jsonb(p), 'balance', coalesce(new_bal, 0));
  end if;
  if p.status <> 'pending' then raise exception 'payout not claimable'; end if;
  if p.amount <= 0 then
    update public.ajo_payouts set status = 'claimed', use_reason = left(coalesce(p_use_reason,''), 200), claimed_at = now()
      where id = p.id returning * into p;
    return jsonb_build_object('ok', true, 'payout', to_jsonb(p), 'balance', 0);
  end if;

  ref := 'ajo_payout_' || replace(p_circle_id::text, '-', '') || '_c' || p_cycle::text;
  new_bal := public.credit_wallet(uid, p.amount, 'ajo_payout', ref,
    jsonb_build_object('circle_id', p_circle_id, 'cycle', p_cycle));

  update public.ajo_payouts
    set status = 'claimed',
        use_reason = left(coalesce(p_use_reason, ''), 200),
        claimed_at = now()
    where id = p.id
    returning * into p;

  return jsonb_build_object(
    'ok', true,
    'payout', to_jsonb(p),
    'balance', new_bal,
    'reference', ref
  );
end;
$$;

revoke all on function public.ajo_claim_payout from public;
grant execute on function public.ajo_claim_payout to authenticated;
