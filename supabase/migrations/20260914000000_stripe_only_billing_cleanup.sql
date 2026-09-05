-- Removes the manual payment-review system entirely — billing is Stripe-only
-- now (see 20260913000000). No more "submit a receipt, admin reviews it":
-- coach_submit_payment_proof() and admin_review_coach_subscription() are
-- dropped outright, not just unused, along with the columns and storage
-- policies that only existed to support them. Also adds payment_transactions
-- — a real, append-only log of successful automated payments, which
-- AdminBilling.tsx's "Recent Transactions" table reads from (nothing
-- produced this before; coach_billing only ever tracked *current* state).
--
-- access_override ('none'/'granted'/'blocked') and admin_set_billing_override()
-- are NOT touched here — they're a separate, narrower "manual comp/block"
-- lever that coach_billing_access_status() still honors. What IS going away
-- is the admin UI that exposed 'blocked' as a billing-page button; the admin
-- "Suspend" action going forward is coaches.status (admin_set_coach_status),
-- already used for policy bans, just relocated into the Coach Detail dialog.

-- ---------------------------------------------------------------------------
-- Drop the manual-review RPCs.
-- ---------------------------------------------------------------------------

drop function if exists public.coach_submit_payment_proof(text);
drop function if exists public.admin_review_coach_subscription(uuid, text, text);

-- ---------------------------------------------------------------------------
-- Storage: no more coach-side uploads. Bucket itself is left in place
-- (may still hold old receipts from before this migration; dropping it
-- would require deleting its objects first) but nothing can write to it
-- or read from it anymore.
-- ---------------------------------------------------------------------------

drop policy if exists payment_proofs_insert_own on storage.objects;
drop policy if exists payment_proofs_select on storage.objects;

-- ---------------------------------------------------------------------------
-- coach_billing: collapse the status vocabulary (pending_verification can
-- never be reached again) and drop the columns that only existed for the
-- manual-review audit trail.
-- ---------------------------------------------------------------------------

update public.coach_billing set subscription_status = 'inactive' where subscription_status = 'pending_verification';

alter table public.coach_billing drop constraint if exists coach_billing_subscription_status_check;
alter table public.coach_billing
  add constraint coach_billing_subscription_status_check
  check (subscription_status in ('inactive', 'active'));

alter table public.coach_billing
  drop column if exists payment_proof_url,
  drop column if exists payment_proof_uploaded_at,
  drop column if exists rejection_reason,
  drop column if exists subscription_reviewed_at,
  drop column if exists subscription_reviewed_by;

-- ---------------------------------------------------------------------------
-- payment_transactions — append-only log of successful Stripe payments.
-- Written only by stripe_apply_successful_payment() (service_role); admins
-- and the paying coach can read it. Starts empty by design: it only ever
-- logs automated payments, so no backfill from the old manual-approval
-- history belongs here.
-- ---------------------------------------------------------------------------

create table public.payment_transactions (
  id bigint generated always as identity primary key,
  coach_id uuid not null references public.coaches (id) on delete cascade,
  amount numeric not null check (amount > 0),
  currency text not null default 'MYR',
  stripe_checkout_session_id text,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create index payment_transactions_coach_idx on public.payment_transactions (coach_id);
create index payment_transactions_created_idx on public.payment_transactions (created_at desc);

alter table public.payment_transactions enable row level security;

create policy payment_transactions_select on public.payment_transactions
  for select to authenticated
  using (coach_id = auth.uid() or public.is_admin());

grant select on public.payment_transactions to authenticated;
grant select, insert on public.payment_transactions to service_role;

-- ---------------------------------------------------------------------------
-- stripe_apply_successful_payment() now also logs the transaction, in the
-- same statement-level transaction as the coach_billing update (Postgres
-- functions run atomically — either both happen or neither does). Two new
-- parameters (p_amount, p_checkout_session_id) -> drop + recreate rather
-- than CREATE OR REPLACE, same reasoning as 20260912000000's rewrite of
-- this same function: the parameter list itself is changing.
-- ---------------------------------------------------------------------------

drop function if exists public.stripe_apply_successful_payment(uuid, text, integer);

create or replace function public.stripe_apply_successful_payment(
  p_coach_id uuid,
  p_stripe_customer_id text default null,
  p_days integer default 30,
  p_amount numeric default 50,
  p_checkout_session_id text default null
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
      stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
      updated_at = now()
  where coach_id = p_coach_id;

  if not found then
    raise exception 'No billing record for this coach';
  end if;

  insert into public.payment_transactions (coach_id, amount, stripe_checkout_session_id, stripe_customer_id)
  values (p_coach_id, p_amount, p_checkout_session_id, p_stripe_customer_id);
end;
$$;

revoke all on function public.stripe_apply_successful_payment(uuid, text, integer, numeric, text) from public, anon, authenticated;
grant execute on function public.stripe_apply_successful_payment(uuid, text, integer, numeric, text) to service_role;
