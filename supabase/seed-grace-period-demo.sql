-- Seeds 3 coaches and 3 clients into the exact states needed to exercise
-- the 5-day grace period blocker end to end. Not a schema migration — run
-- it by hand against your local DB whenever you want this test matrix:
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" -f supabase/seed-grace-period-demo.sql
--   # or, from the Supabase Studio SQL editor: paste and run.
--
-- Coach A (coach1@example.com) - subscriptionExpiry 3 days from now  -> Active, full access, no banner
-- Coach B (coach2@example.com) - subscriptionExpiry 2 days ago       -> In grace period (3 days left before lock)
-- Coach C (coach3@example.com) - subscriptionExpiry 10 days ago      -> Past the 5-day grace, locked out
--
-- client1/2/3@example.com are linked 1:1 to coach1/2/3, so logging in as
-- client3 is the fastest way to see ClientAuthGuard's "coach unavailable"
-- blocker (Coach C is the only one past grace).
--
-- Assumes these six accounts already exist (sign up + admin approval) —
-- this only sets their billing/relationship rows, never auth.users itself.
-- Safe to re-run.

do $$
declare
  v_coach_a uuid; v_coach_b uuid; v_coach_c uuid;
  v_client_a uuid; v_client_b uuid; v_client_c uuid;
begin
  select id into v_coach_a from public.profiles where email = 'coach1@example.com';
  select id into v_coach_b from public.profiles where email = 'coach2@example.com';
  select id into v_coach_c from public.profiles where email = 'coach3@example.com';
  select id into v_client_a from public.profiles where email = 'client1@example.com';
  select id into v_client_b from public.profiles where email = 'client2@example.com';
  select id into v_client_c from public.profiles where email = 'client3@example.com';

  if v_coach_a is null or v_coach_b is null or v_coach_c is null
     or v_client_a is null or v_client_b is null or v_client_c is null then
    raise exception 'Seed accounts missing — expected coach1..3@example.com and client1..3@example.com (as approved coaches/clients) to already exist';
  end if;

  -- Coach A — Active (3 days left, well before the grace period kicks in).
  insert into public.coach_billing (coach_id, subscription_status, access_override, subscription_expiry, last_payment_at)
  values (v_coach_a, 'active', 'none', now() + interval '3 days', now() - interval '27 days')
  on conflict (coach_id) do update set
    subscription_status = excluded.subscription_status,
    access_override = excluded.access_override,
    subscription_expiry = excluded.subscription_expiry,
    last_payment_at = excluded.last_payment_at;

  -- Coach B — In grace period (expired 2 days ago; 3 days left before lock).
  insert into public.coach_billing (coach_id, subscription_status, access_override, subscription_expiry, last_payment_at)
  values (v_coach_b, 'active', 'none', now() - interval '2 days', now() - interval '32 days')
  on conflict (coach_id) do update set
    subscription_status = excluded.subscription_status,
    access_override = excluded.access_override,
    subscription_expiry = excluded.subscription_expiry,
    last_payment_at = excluded.last_payment_at;

  -- Coach C — Locked out (expired 10 days ago, 5 days past the grace window).
  insert into public.coach_billing (coach_id, subscription_status, access_override, subscription_expiry, last_payment_at)
  values (v_coach_c, 'active', 'none', now() - interval '10 days', now() - interval '40 days')
  on conflict (coach_id) do update set
    subscription_status = excluded.subscription_status,
    access_override = excluded.access_override,
    subscription_expiry = excluded.subscription_expiry,
    last_payment_at = excluded.last_payment_at;

  -- One client per coach — ends any other approved link that client had
  -- first, since coach_clients allows only one approved coach per client.
  delete from public.coach_clients
  where client_id in (v_client_a, v_client_b, v_client_c) and status = 'approved'
    and not (client_id, coach_id) in (values (v_client_a, v_coach_a), (v_client_b, v_coach_b), (v_client_c, v_coach_c));

  insert into public.coach_clients (client_id, coach_id, status, requested_at, reviewed_at)
  values
    (v_client_a, v_coach_a, 'approved', now(), now()),
    (v_client_b, v_coach_b, 'approved', now(), now()),
    (v_client_c, v_coach_c, 'approved', now(), now())
  on conflict (client_id, coach_id) do update set status = 'approved', reviewed_at = now();
end $$;
