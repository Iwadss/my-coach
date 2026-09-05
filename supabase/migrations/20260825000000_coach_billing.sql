-- Coach payment gating (Stripe Checkout + Billing Portal, hosted redirect —
-- no Stripe.js/publishable key in the frontend).
--
-- Default state for a newly-approved coach is BLOCKED until they either
-- subscribe via Stripe or an admin manually grants access — no invented
-- free trial. access_override is the admin kill-switch/comp lever and
-- always wins over whatever Stripe says.

create table public.coach_billing (
  coach_id uuid primary key references public.coaches (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  current_period_end timestamptz,
  -- Stripe's event.created, not wall-clock — lets the webhook handler
  -- reject a stale, out-of-order redelivery rather than last-write-wins
  -- clobbering a fresher state.
  stripe_event_at timestamptz,
  access_override text not null default 'none'
    check (access_override in ('none', 'granted', 'blocked')),
  override_reason text,
  override_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.coach_billing
  add constraint coach_billing_status_requires_stripe_id
  check (subscription_status = 'inactive' or stripe_subscription_id is not null);

-- Webhook dedupe. service_role only — never exposed to authenticated/anon
-- at all, so RLS is enabled with zero policies as a belt-and-suspenders
-- (the missing grant already blocks everyone but service_role).
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;

-- ---------------------------------------------------------------------------
-- Access decision. Self-or-admin only — unlike is_approved_coach() (which
-- is deliberately open, since approval status is already public via
-- coach_directory), subscription/billing state is sensitive financial data
-- and must not be probeable for an arbitrary coach_id.
-- ---------------------------------------------------------------------------

create or replace function public.coach_has_billing_access(p_coach_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_coach_id <> auth.uid() and not public.is_admin() then false
    else coalesce(
      (
        select case
          when cb.access_override = 'blocked' then false
          when cb.access_override = 'granted' then true
          else cb.subscription_status in ('trialing', 'active')
               and (cb.current_period_end is null or cb.current_period_end >= now())
        end
        from public.coach_billing cb
        where cb.coach_id = p_coach_id
      ),
      false -- no billing row at all (e.g. never approved) -> blocked by default
    )
  end;
$$;

-- The only sanctioned path for an admin to grant/block/clear billing
-- access manually — mirrors admin_set_coach_status(). Every write to
-- coach_billing from a human goes through here, never a raw PATCH, so
-- who-did-it-and-why is always captured.
create or replace function public.admin_set_billing_override(
  p_coach_id uuid,
  p_override text,
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

  if p_override not in ('none', 'granted', 'blocked') then
    raise exception 'Unknown override: %', p_override;
  end if;

  update public.coach_billing
  set access_override = p_override,
      override_reason = case when p_override in ('granted', 'blocked') then p_reason else null end,
      override_by = auth.uid(),
      updated_at = now()
  where coach_id = p_coach_id;

  if not found then
    raise exception 'No billing record for this coach';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS. select-only for self-or-admin. Deliberately NO insert/update/delete
-- grant to authenticated at all, not even admin — coach_billing has two
-- independent writer identities (admin override vs. Stripe-driven sync via
-- the service-role Edge Functions) that must never collide through an
-- ad-hoc client PATCH that skips the audit trail above.
-- ---------------------------------------------------------------------------

alter table public.coach_billing enable row level security;

create policy coach_billing_select on public.coach_billing
  for select to authenticated
  using (coach_id = auth.uid() or public.is_admin());

grant select on public.coach_billing to authenticated;
grant select, insert, update, delete on public.coach_billing to service_role;

grant select, insert on public.stripe_events to service_role;

revoke all on function public.coach_has_billing_access(uuid) from public, anon;
revoke all on function public.admin_set_billing_override(uuid, text, text) from public, anon;

grant execute on function public.coach_has_billing_access(uuid) to authenticated, service_role;
grant execute on function public.admin_set_billing_override(uuid, text, text) to authenticated, service_role;
