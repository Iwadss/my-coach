-- Refinements to the manual subscription-review flow added in
-- 20260911000000_coach_subscription_manual_review.sql:
--
--   1. Approval always adds exactly 30 days (RM50/month) — no more admin-
--      entered day count. admin_review_coach_subscription() drops its
--      p_extend_days parameter.
--   2. `last_payment_at` records when a payment was last actually approved
--      (distinct from subscription_reviewed_at, which is also touched by a
--      rejection) — powers AdminBilling.tsx's "Last Payment Date" column.
--   3. coach_has_billing_access() is split into an internal computation
--      (coach_billing_access_status, no caller-identity check) and the
--      existing self-or-admin-gated wrapper (same signature/behavior as
--      before), so a new client-safe function can reuse the computation
--      without either duplicating it or leaking a coach's raw billing row.
--   4. client_coach_access_ok() — lets a client check whether *their own*
--      linked coach currently has billing access, without exposing that
--      coach's coach_billing row (which RLS otherwise restricts to the
--      coach themselves or an admin). Returns true when the client has no
--      approved coach at all — nothing to block on in that case.

alter table public.coach_billing add column last_payment_at timestamptz;
comment on column public.coach_billing.last_payment_at is
  'Set only on admin approval (not on rejection) — the true "last paid" date, as opposed to subscription_reviewed_at which also moves on a rejection.';

-- ---------------------------------------------------------------------------
-- Split the access computation from the self-or-admin authorization check.
-- ---------------------------------------------------------------------------

create or replace function public.coach_billing_access_status(p_coach_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when cb.access_override = 'blocked' then false
        when cb.access_override = 'granted' then true
        else cb.subscription_status = 'active'
             and (cb.subscription_expiry is null or cb.subscription_expiry >= now())
      end
      from public.coach_billing cb
      where cb.coach_id = p_coach_id
    ),
    false -- no billing row at all -> blocked by default
  );
$$;

create or replace function public.coach_has_billing_access(p_coach_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_coach_id <> auth.uid() and not public.is_admin() then false
    else public.coach_billing_access_status(p_coach_id)
  end;
$$;

-- A client may learn only a yes/no about their own linked coach — never an
-- arbitrary coach_id, and never the coach's actual billing row.
create or replace function public.client_coach_access_ok()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select c.status = 'approved' and public.coach_billing_access_status(cc.coach_id)
      from public.coach_clients cc
      join public.coaches c on c.id = cc.coach_id
      where cc.client_id = auth.uid() and cc.status = 'approved'
      limit 1
    ),
    true -- no approved coach at all -> nothing to block on here
  );
$$;

-- ---------------------------------------------------------------------------
-- Approval is now a fixed 30-day extension — drop and recreate rather than
-- CREATE OR REPLACE, since the parameter list itself is changing.
-- ---------------------------------------------------------------------------

drop function if exists public.admin_review_coach_subscription(uuid, text, integer, text);

create or replace function public.admin_review_coach_subscription(
  p_coach_id uuid,
  p_decision text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrators only';
  end if;

  if p_decision = 'approve' then
    update public.coach_billing
    set subscription_status = 'active',
        subscription_expiry = greatest(now(), coalesce(subscription_expiry, now())) + interval '30 days',
        last_payment_at = now(),
        rejection_reason = null,
        subscription_reviewed_at = now(),
        subscription_reviewed_by = auth.uid()
    where coach_id = p_coach_id;

  elsif p_decision = 'reject' then
    update public.coach_billing
    set subscription_status = 'inactive',
        rejection_reason = coalesce(nullif(trim(p_reason), ''), 'Payment could not be verified.'),
        subscription_reviewed_at = now(),
        subscription_reviewed_by = auth.uid()
    where coach_id = p_coach_id;

  else
    raise exception 'Unknown decision: % (expected approve or reject)', p_decision;
  end if;

  if not found then
    raise exception 'No billing record for this coach';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants. coach_billing_access_status is deliberately NOT granted to
-- authenticated — it takes an arbitrary coach_id with no caller check, so
-- exposing it directly would let any signed-in user probe any coach's
-- access. It's only reachable through the two wrapper functions below,
-- which run as their SECURITY DEFINER owner when calling it.
-- ---------------------------------------------------------------------------

revoke all on function public.coach_billing_access_status(uuid) from public, anon, authenticated;
grant execute on function public.coach_billing_access_status(uuid) to service_role;

revoke all on function public.client_coach_access_ok() from public, anon;
grant execute on function public.client_coach_access_ok() to authenticated;

revoke all on function public.admin_review_coach_subscription(uuid, text, text) from public, anon;
grant execute on function public.admin_review_coach_subscription(uuid, text, text) to authenticated, service_role;
