-- Phase A.4 — Per-coach schedule (time slots, available days) and bookings.
--
-- Full per-coach scope, per the approved plan: every coach manages their own
-- independent hours/slots, not a shared global calendar. Since this is a
-- brand-new database, coach_id is a first-class NOT NULL column from the
-- start rather than an ALTER-then-backfill.

create table public.timeslots (
  id bigint generated always as identity primary key,
  coach_id uuid not null references public.coaches (id) on delete cascade,
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  check (end_time > start_time),
  unique (coach_id, start_time, end_time)
);

create table public.available_days (
  id bigint generated always as identity primary key,
  coach_id uuid not null references public.coaches (id) on delete cascade,
  day text not null check (
    day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ),
  is_available boolean not null default true,
  unique (coach_id, day)
);

create table public.bookings (
  id bigint generated always as identity primary key,
  date date not null,
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'cancelled', 'completed')
  ),
  client_id uuid not null references public.clients (id) on delete cascade,
  time_slot_id bigint not null references public.timeslots (id) on delete restrict,
  -- Derived server-side from time_slot_id by the trigger below — never
  -- trusted from client input, so it can't be spoofed even if a client
  -- includes coach_id in the insert payload.
  coach_id uuid not null references public.coaches (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (coach_id, date, time_slot_id)
);

create table public.client_booking_totals (
  client_id uuid primary key references public.clients (id) on delete cascade,
  completed_slots integer not null default 0,
  last_completed_at timestamptz
);

create index bookings_client_id_idx on public.bookings (client_id);
create index bookings_coach_date_idx on public.bookings (coach_id, date);

-- ---------------------------------------------------------------------------
-- Derive bookings.coach_id from the chosen time slot's owner.
-- ---------------------------------------------------------------------------

create or replace function public.bookings_set_coach_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select coach_id into new.coach_id from public.timeslots where id = new.time_slot_id;
  if new.coach_id is null then
    raise exception 'Time slot % does not exist', new.time_slot_id;
  end if;
  return new;
end;
$$;

create trigger bookings_derive_coach_id
  before insert on public.bookings
  for each row execute function public.bookings_set_coach_id();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.timeslots enable row level security;
alter table public.available_days enable row level security;
alter table public.bookings enable row level security;
alter table public.client_booking_totals enable row level security;

create policy timeslots_coach on public.timeslots
  for all to authenticated
  using (coach_id = auth.uid() and public.is_approved_coach())
  with check (coach_id = auth.uid() and public.is_approved_coach());

create policy timeslots_admin on public.timeslots
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Not gated on is_available: a client's booking history (session-status.tsx)
-- embeds a booking's timeslot regardless of whether the coach has since
-- disabled that slot — filtering here would make the embed come back null
-- for a past booking and crash the render. The "only offer available slots"
-- rule is enforced at the query level (booking-session.tsx's
-- .eq('is_available', true)), not by hiding the row outright.
create policy timeslots_client_select on public.timeslots
  for select to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      where cc.client_id = auth.uid() and cc.coach_id = timeslots.coach_id and cc.status = 'approved'
    )
  );

create policy available_days_coach on public.available_days
  for all to authenticated
  using (coach_id = auth.uid() and public.is_approved_coach())
  with check (coach_id = auth.uid() and public.is_approved_coach());

create policy available_days_admin on public.available_days
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy available_days_client_select on public.available_days
  for select to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      where cc.client_id = auth.uid() and cc.coach_id = available_days.coach_id and cc.status = 'approved'
    )
  );

create policy bookings_select on public.bookings
  for select to authenticated
  using (client_id = auth.uid() or coach_id = auth.uid() or public.is_admin());

create policy bookings_client_insert on public.bookings
  for insert to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.timeslots t
      join public.coach_clients cc on cc.coach_id = t.coach_id
      where t.id = time_slot_id and cc.client_id = auth.uid() and cc.status = 'approved'
    )
  );

create policy bookings_coach_all on public.bookings
  for all to authenticated
  using (coach_id = auth.uid() and public.is_approved_coach())
  with check (coach_id = auth.uid() and public.is_approved_coach());

create policy bookings_admin_all on public.bookings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- client_booking_totals has no coach_id column of its own — correctness
-- rests entirely on the coach_clients relationship, not a direct filter.
create policy cbt_select on public.client_booking_totals
  for select to authenticated
  using (
    client_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.coach_clients cc
      where cc.client_id = client_booking_totals.client_id and cc.coach_id = auth.uid() and cc.status = 'approved'
    )
  );

create policy cbt_write on public.client_booking_totals
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.coach_clients cc
      where cc.client_id = client_booking_totals.client_id and cc.coach_id = auth.uid() and cc.status = 'approved'
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.coach_clients cc
      where cc.client_id = client_booking_totals.client_id and cc.coach_id = auth.uid() and cc.status = 'approved'
    )
  );

-- ---------------------------------------------------------------------------
-- Grants.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.timeslots to authenticated, service_role;
grant select, insert, update, delete on public.available_days to authenticated, service_role;

grant select, insert on public.bookings to authenticated, service_role;
revoke update, delete on public.bookings from authenticated;
grant update (status) on public.bookings to authenticated;
grant delete on public.bookings to authenticated; -- gated by bookings_coach_all / bookings_admin_all RLS
grant update, delete on public.bookings to service_role;

grant select, insert, update on public.client_booking_totals to authenticated, service_role;

revoke all on function public.bookings_set_coach_id() from public, anon;
