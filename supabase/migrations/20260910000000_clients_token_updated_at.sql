-- Coach Earnings' "Tokens by client" table needs to sort by recent
-- activity — that has to be a real timestamp, not a client-side guess.
-- Scoped to actual token activity (issued/deducted/refunded), not general
-- profile edits (name/phone/goal aren't "activity" for a tokens table) —
-- bumped inside every write path that already touches token_balance, the
-- same three functions 20260909000000_token_based_booking.sql defined.

alter table public.clients
    add column updated_at timestamptz not null default now();

-- Not in the authenticated update-column grant list (full_name, phone,
-- goal, gender, height_cm, weight_kg) — only reachable through these
-- SECURITY DEFINER functions, same bypass-column-grants pattern as
-- token_balance itself.

create or replace function public.bookings_deduct_token()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_balance integer;
begin
  select token_balance into v_balance from public.clients where id = new.client_id for update;
  if v_balance is null then raise exception 'No client record for this booking'; end if;
  if v_balance <= 0 then raise exception 'Not enough tokens to book this session'; end if;
  update public.clients set token_balance = token_balance - 1, updated_at = now() where id = new.client_id;
  return new;
end;
$$;

create or replace function public.bookings_refund_token()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.clients set token_balance = token_balance + 1, updated_at = now() where id = new.client_id;
  return new;
end;
$$;

create or replace function public.coach_adjust_client_tokens(p_client_id uuid, p_delta integer)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_new_balance integer;
begin
  if p_delta = 0 then raise exception 'Delta must be non-zero'; end if;
  if not (
    public.is_admin()
    or exists (
      select 1 from public.coach_clients cc
      where cc.client_id = p_client_id and cc.coach_id = auth.uid() and cc.status = 'approved'
    )
  ) then raise exception 'Not authorized to adjust this client''s tokens'; end if;
  update public.clients
  set token_balance = token_balance + p_delta,
      tokens_issued_total = tokens_issued_total + greatest(p_delta, 0),
      updated_at = now()
  where id = p_client_id
  returning token_balance into v_new_balance;
  if v_new_balance is null then raise exception 'No such client'; end if;
  return v_new_balance;
end;
$$;
