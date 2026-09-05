-- Replace Stripe-driven coach billing with manual bank-transfer review.
--
-- The Stripe checkout/webhook/portal-session edge functions
-- (supabase/functions/{create-checkout-session,stripe-webhook,create-portal-session})
-- and the stripe_events dedupe table are left in place but are no longer
-- called from the frontend as of this migration — nothing here drops them,
-- in case Stripe is revisited later. coach_billing itself is repurposed:
-- a coach uploads a receipt, an admin reviews it and extends the expiry.
--
-- subscription_status collapses from the old Stripe vocabulary
-- ('inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid')
-- down to exactly three states:
--   inactive            - no active subscription (never paid, expired, or rejected)
--   pending_verification- a receipt is uploaded and awaiting admin review
--   active               - admin-approved, subscription_expiry (renamed from
--                          current_period_end) says until when
--
-- access_override (the admin kill-switch) and admin_set_billing_override()
-- are untouched — they still win over whatever subscription_status says.

-- ---------------------------------------------------------------------------
-- Schema changes
-- ---------------------------------------------------------------------------

alter table public.coach_billing drop constraint if exists coach_billing_status_requires_stripe_id;
alter table public.coach_billing drop constraint if exists coach_billing_subscription_status_check;

alter table public.coach_billing rename column current_period_end to subscription_expiry;

alter table public.coach_billing
  add column payment_proof_url text,
  add column payment_proof_uploaded_at timestamptz,
  add column rejection_reason text,
  add column subscription_reviewed_at timestamptz,
  add column subscription_reviewed_by uuid references public.profiles (id) on delete set null;

-- Fold every existing Stripe-era value into the new 3-state vocabulary
-- before the new check constraint goes on, so this migration is safe to
-- run against rows that already exist.
update public.coach_billing
  set subscription_status = case
    when subscription_status in ('trialing', 'active') then 'active'
    else 'inactive'
  end
  where subscription_status not in ('inactive', 'pending_verification', 'active');

alter table public.coach_billing
  add constraint coach_billing_subscription_status_check
  check (subscription_status in ('inactive', 'pending_verification', 'active'));

comment on column public.coach_billing.payment_proof_url is
  'Object path in the private "payment-proofs" storage bucket, e.g. "<coach_id>/<timestamp>-<filename>" — not a public URL. Resolve to a signed URL on read.';
comment on column public.coach_billing.subscription_expiry is
  'Renamed from current_period_end. Admin-set on approval (now() + extend days), independent of any payment processor.';

-- ---------------------------------------------------------------------------
-- Access decision — same shape as before, just reading the new column names
-- and the collapsed status vocabulary.
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
          else cb.subscription_status = 'active'
               and (cb.subscription_expiry is null or cb.subscription_expiry >= now())
        end
        from public.coach_billing cb
        where cb.coach_id = p_coach_id
      ),
      false -- no billing row at all (e.g. never approved) -> blocked by default
    )
  end;
$$;

-- ---------------------------------------------------------------------------
-- Coach-side: submit a payment proof. Self-only (no p_coach_id param — always
-- auth.uid()), same "no direct column grant, RPC is the only door in" pattern
-- coach_billing already used for the Stripe webhook vs admin-override split.
-- ---------------------------------------------------------------------------

create or replace function public.coach_submit_payment_proof(p_proof_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_proof_path is null or length(trim(p_proof_path)) = 0 then
    raise exception 'A payment proof file is required';
  end if;

  update public.coach_billing
  set payment_proof_url = p_proof_path,
      payment_proof_uploaded_at = now(),
      subscription_status = 'pending_verification',
      rejection_reason = null
  where coach_id = auth.uid();

  if not found then
    raise exception 'No billing record for this account — contact an administrator';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin-side: approve (extend expiry by N days from today or from the
-- current expiry, whichever is later — so reviewing early never shortens a
-- still-active period) or reject (reason required for the coach to see).
-- ---------------------------------------------------------------------------

create or replace function public.admin_review_coach_subscription(
  p_coach_id uuid,
  p_decision text,
  p_extend_days integer default null,
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
    if p_extend_days is null or p_extend_days <= 0 then
      raise exception 'extend_days must be a positive number of days';
    end if;

    update public.coach_billing
    set subscription_status = 'active',
        subscription_expiry = greatest(now(), coalesce(subscription_expiry, now())) + make_interval(days => p_extend_days),
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

revoke all on function public.coach_submit_payment_proof(text) from public, anon;
revoke all on function public.admin_review_coach_subscription(uuid, text, integer, text) from public, anon;

grant execute on function public.coach_submit_payment_proof(text) to authenticated;
grant execute on function public.admin_review_coach_subscription(uuid, text, integer, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage — private bucket for uploaded receipts. A coach may only read/
-- write inside their own "<coach_id>/..." folder; an admin may read every
-- folder for review. No update/delete policy: a re-upload adds a new
-- timestamped object rather than overwriting, so the review history stays
-- intact (matches the rest of this schema's "never silently discard an
-- audit trail" convention).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

create policy payment_proofs_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy payment_proofs_select on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
