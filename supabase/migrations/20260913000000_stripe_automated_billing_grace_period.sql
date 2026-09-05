-- Automates coach billing via Stripe (one-time RM50 payments, not a
-- Stripe-managed recurring subscription — see the edge functions for why:
-- the "pay early to stack days" rule doesn't map onto how Stripe
-- subscriptions bill) and adds a 5-day grace period after
-- subscription_expiry before a coach is actually locked out.
--
-- Admins no longer need to review every payment — coach_submit_payment_proof
-- / admin_review_coach_subscription (20260911000000) and the AdminBilling
-- pending-approvals queue are left in place as a manual fallback (e.g. a
-- coach who can't pay by card), just no longer the primary path.

-- ---------------------------------------------------------------------------
-- Stripe-driven write path. service_role only — same "no direct grant to
-- authenticated, this function is the only door in" pattern coach_billing
-- has used since 20260825000000. Called from stripe-webhook/index.ts after
-- verifying the event's Stripe signature.
--
-- Scenario A (early renewal): current expiry is still in the future ->
-- new expiry = current expiry + p_days.
-- Scenario B (expired renewal): current expiry has passed (or there is
-- none yet) -> new expiry = now() + p_days.
-- Both collapse to the same greatest(now(), coalesce(expiry, now()))
-- expression already used by admin_review_coach_subscription's approve
-- branch — same rule, whichever path extended it.
-- ---------------------------------------------------------------------------

create or replace function public.stripe_apply_successful_payment(
  p_coach_id uuid,
  p_stripe_customer_id text default null,
  p_days integer default 30
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_days is null or p_days <= 0 then
    raise exception 'p_days must be a positive number of days';
  end if;

  update public.coach_billing
  set subscription_status = 'active',
      subscription_expiry = greatest(now(), coalesce(subscription_expiry, now())) + make_interval(days => p_days),
      last_payment_at = now(),
      rejection_reason = null,
      stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
      updated_at = now()
  where coach_id = p_coach_id;

  if not found then
    raise exception 'No billing record for this coach';
  end if;
end;
$$;

revoke all on function public.stripe_apply_successful_payment(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.stripe_apply_successful_payment(uuid, text, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 5-day grace period. Same signature as before (20260912000000) — this is
-- the one place "has access" is decided, so CoachAuthGuard (via
-- coach_has_billing_access) and ClientAuthGuard (via client_coach_access_ok,
-- which calls this internally) both get the grace period automatically
-- with no other code change.
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
             -- grace period: 5 days keep in sync with GRACE_PERIOD_DAYS in src/lib/billing.ts
             and (cb.subscription_expiry is null or cb.subscription_expiry + interval '5 days' >= now())
      end
      from public.coach_billing cb
      where cb.coach_id = p_coach_id
    ),
    false
  );
$$;
