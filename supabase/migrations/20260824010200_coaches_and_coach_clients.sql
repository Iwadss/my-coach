-- Phase A.2 — Coach identity + application lifecycle, and the coach<->client
-- request/approve/reject relationship.
--
-- A coach applies via public sign-up (status defaults 'pending') but can
-- never set their own status. admin_set_coach_status() is the only path to
-- 'approved'/'rejected'/'suspended', and it updates coaches.status and
-- profiles.role together so the two can never disagree.

create table public.coaches (
  id uuid primary key references public.profiles (id) on delete cascade,
  bio text,
  phone text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  applied_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  rejection_reason text
);

create index coaches_status_idx on public.coaches (status);

alter table public.coaches enable row level security;

create or replace function public.is_approved_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.coaches where id = auth.uid() and status = 'approved'
  );
$$;

-- Checks a specific coach's approval status regardless of the caller's own
-- SELECT access to public.coaches. Needed because coach_clients_insert_client
-- (below) has to verify the *target* coach is approved before a brand-new
-- client — who has no relationship-based read access to that coach's row
-- yet — has requested them; a plain subquery there would run under the
-- caller's own RLS on coaches and silently see zero rows.
create or replace function public.coach_is_approved(target_coach uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.coaches where id = target_coach and status = 'approved'
  );
$$;

-- Structural guard, same shape as profiles_protect_role: only an admin may
-- change a coach's status. (admin_set_coach_status() runs as the calling
-- admin's own auth.uid() — security definer changes table privileges, not
-- auth.uid() — so this trigger still correctly authorizes it.)
create or replace function public.protect_coach_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and not public.is_admin() then
    raise exception 'coach status cannot be changed directly';
  end if;
  return new;
end;
$$;

create trigger coaches_protect_status
  before update on public.coaches
  for each row execute function public.protect_coach_status();

-- The only sanctioned path for coach approval/rejection/suspension.
create or replace function public.admin_set_coach_status(
  p_coach_id uuid,
  p_status text,
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

  if p_status not in ('approved', 'rejected', 'suspended', 'pending') then
    raise exception 'Unknown status: %', p_status;
  end if;

  update public.coaches
  set status = p_status,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      rejection_reason = case when p_status = 'rejected' then p_reason else null end
  where id = p_coach_id;

  if not found then
    raise exception 'No such coach application';
  end if;

  -- Role follows status: approved -> 'coach', anything else -> 'client'.
  update public.profiles
  set role = case when p_status = 'approved' then 'coach' else 'client' end
  where id = p_coach_id and role <> 'admin';

  -- First-time approval: seed the weekly availability toggle set (all 7
  -- days on by default, coach adjusts from there). available_days is
  -- defined later in the migration set (20260824010400) — fine, plpgsql
  -- function bodies aren't validated against table existence until first
  -- call, which only happens once every migration has run.
  if p_status = 'approved' then
    insert into public.available_days (coach_id, day, is_available)
    select p_coach_id, d, true
    from unnest(array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) as d
    on conflict (coach_id, day) do nothing;

    -- First-time approval also opens a billing record, starting 'inactive'
    -- (blocked, per the payment-gating feature — see 20260825000000).
    -- on conflict do nothing so re-approving after a suspend never clobbers
    -- real billing history. coach_billing is defined later in the migration
    -- set — fine, see the available_days comment above for why.
    insert into public.coach_billing (coach_id, subscription_status)
    values (p_coach_id, 'inactive')
    on conflict (coach_id) do nothing;
  end if;
end;
$$;

-- Public, pre-auth-readable directory of approved coaches — this is what
-- powers the coach picker on the client sign-up page (anon, no session yet).
create view public.coach_directory as
  select c.id as coach_id, p.full_name, c.bio
  from public.coaches c
  join public.profiles p on p.id = c.id
  where c.status = 'approved';

create policy coaches_select on public.coaches
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy coaches_insert on public.coaches
  for insert to authenticated
  with check (id = auth.uid() and status = 'pending');

create policy coaches_update on public.coaches
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- coach_clients: the request/approve/reject relationship.
-- ---------------------------------------------------------------------------

create table public.coach_clients (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.coaches (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (client_id, coach_id)
);

create index coach_clients_coach_status_idx on public.coach_clients (coach_id, status);
create index coach_clients_client_idx on public.coach_clients (client_id);

-- One active (approved) coach per client — matches "1 coach has many clients".
create unique index coach_clients_one_approved_idx
  on public.coach_clients (client_id)
  where status = 'approved';

alter table public.coach_clients enable row level security;

create policy coach_clients_select on public.coach_clients
  for select to authenticated
  using (client_id = auth.uid() or coach_id = auth.uid() or public.is_admin());

-- Self-signup: a client requests an approved coach, always starting pending.
create policy coach_clients_insert_client on public.coach_clients
  for insert to authenticated
  with check (
    client_id = auth.uid()
    and status = 'pending'
    and public.coach_is_approved(coach_id)
  );

-- Walk-in registration: an approved coach directly adds an already-approved client.
create policy coach_clients_insert_coach on public.coach_clients
  for insert to authenticated
  with check (coach_id = auth.uid() and public.is_approved_coach() and status = 'approved');

-- The coach approves/rejects a request addressed to them; a client may
-- resubmit their own rejected row back to pending (pick again).
create policy coach_clients_update on public.coach_clients
  for update to authenticated
  using (coach_id = auth.uid() or client_id = auth.uid())
  with check (
    coach_id = auth.uid()
    or (client_id = auth.uid() and status = 'pending')
  );

-- "Remove client" (coach ends the relationship) / a client leaving their coach.
create policy coach_clients_delete on public.coach_clients
  for delete to authenticated
  using (coach_id = auth.uid() or client_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants.
-- ---------------------------------------------------------------------------

grant select on public.coaches to authenticated, service_role;
revoke insert, update on public.coaches from authenticated;
grant insert (id, bio, phone, status) on public.coaches to authenticated;
grant update (bio, phone) on public.coaches to authenticated;
grant update on public.coaches to service_role;

grant select on public.coach_directory to anon, authenticated;

grant select, insert, delete on public.coach_clients to authenticated, service_role;
revoke update on public.coach_clients from authenticated;
grant update (status, reviewed_at) on public.coach_clients to authenticated;

revoke all on function public.is_approved_coach() from public, anon;
revoke all on function public.coach_is_approved(uuid) from public, anon;
revoke all on function public.protect_coach_status() from public, anon;
revoke all on function public.admin_set_coach_status(uuid, text, text) from public, anon;

grant execute on function public.is_approved_coach() to authenticated, service_role;
grant execute on function public.coach_is_approved(uuid) to authenticated, service_role;
grant execute on function public.admin_set_coach_status(uuid, text, text) to authenticated, service_role;
