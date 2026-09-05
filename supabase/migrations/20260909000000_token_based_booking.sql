-- Token-based booking system. 1 token = 1 hour of coaching. Payment itself
-- stays external/manual (no processor integration here, same call already
-- made on CoachEarnings.tsx) — this only tracks the resulting balance and
-- enforces it at the booking gate.
alter table public.clients
    add column token_balance integer not null default 0 check (token_balance >= 0),
    -- Running total of tokens a coach has ever manually added to this
    -- client — never decremented by use or by a manual deduct, so it's a
    -- true "issued" figure for CoachEarnings.tsx, independent of the
    -- client's current (spendable) balance.
    add column tokens_issued_total integer not null default 0 check (tokens_issued_total >= 0);

-- A coach's self-declared rate, for turning "tokens used" into a dollar
-- figure on the Earnings page. Nullable — nothing forces a coach to set
-- one, and the UI treats "not set" honestly rather than assuming $0.
alter table public.coaches
    add column hourly_rate numeric check (hourly_rate is null or hourly_rate >= 0);

grant update (hourly_rate) on public.coaches to authenticated;

-- ---------------------------------------------------------------------------
-- Deduct on booking, refund on cancel.
--
-- Both live in triggers rather than application code so every path that
-- inserts or cancels a booking gets the same enforcement automatically
-- (ClientBook.tsx's plain insert, CoachSchedule.tsx's Reject action,
-- ClientSessions.tsx's cancel button — none of them need to change how they
-- call the bookings table) and so a client can never spend tokens they
-- don't have even via a raw API call that skips the UI's disabled-button
-- check. `select ... for update` serializes concurrent booking attempts by
-- the same client so a race (two tabs, one token) can't double-spend.
-- ---------------------------------------------------------------------------

create or replace function public.bookings_deduct_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  select token_balance into v_balance from public.clients where id = new.client_id for update;

  if v_balance is null then
    raise exception 'No client record for this booking';
  end if;

  if v_balance <= 0 then
    raise exception 'Not enough tokens to book this session';
  end if;

  update public.clients set token_balance = token_balance - 1 where id = new.client_id;
  return new;
end;
$$;

create trigger bookings_deduct_token_trigger
  before insert on public.bookings
  for each row execute function public.bookings_deduct_token();

create or replace function public.bookings_refund_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clients set token_balance = token_balance + 1 where id = new.client_id;
  return new;
end;
$$;

-- WHEN clause (not an in-body check) so this only ever fires on the one
-- real transition into 'cancelled' — cancelled is terminal in this schema,
-- so there's no risk of a second status update re-triggering a refund.
create trigger bookings_refund_token_trigger
  after update of status on public.bookings
  for each row
  when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  execute function public.bookings_refund_token();

revoke all on function public.bookings_deduct_token() from public, anon, authenticated;
revoke all on function public.bookings_refund_token() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Manual token add/deduct — the coach's "Add Tokens" / "Deduct Tokens" UI on
-- client-management.tsx. No column-level grant exists for token_balance on
-- clients at all (neither a client nor a coach can write it with a plain
-- update) — this SECURITY DEFINER function is the only door in, and it
-- checks the caller is that client's approved coach (or an admin) itself,
-- the same authorization every other coach-scoped RPC in this schema uses.
-- ---------------------------------------------------------------------------

create or replace function public.coach_adjust_client_tokens(p_client_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  if p_delta = 0 then
    raise exception 'Delta must be non-zero';
  end if;

  if not (
    public.is_admin()
    or exists (
      select 1 from public.coach_clients cc
      where cc.client_id = p_client_id and cc.coach_id = auth.uid() and cc.status = 'approved'
    )
  ) then
    raise exception 'Not authorized to adjust this client''s tokens';
  end if;

  update public.clients
  set token_balance = token_balance + p_delta,
      tokens_issued_total = tokens_issued_total + greatest(p_delta, 0)
  where id = p_client_id
  returning token_balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'No such client';
  end if;

  return v_new_balance;
end;
$$;

revoke all on function public.coach_adjust_client_tokens(uuid, integer) from public, anon;
grant execute on function public.coach_adjust_client_tokens(uuid, integer) to authenticated;
