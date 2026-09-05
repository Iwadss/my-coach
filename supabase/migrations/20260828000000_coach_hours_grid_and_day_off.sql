-- Reworks how a coach manages their hours:
--
-- 1. Every coach gets the same fixed catalog of 1-hour timeslots, starting
--    every 30 minutes from 00:00 through 22:30 (46 slots/day). A coach no
--    longer creates arbitrary custom slots — they just enable/disable rows
--    from this catalog. (Stopped at 22:30 rather than a literal midnight
--    wrap so every slot has a same-day end_time — 23:00 start -> 24:00 end
--    doesn't fit the plain `time` column cleanly, and no realistic session
--    starts that late anyway.)
--
-- 2. A trigger stops two overlapping slots from both being enabled for the
--    same coach at once — the actual "avoid clash" guarantee; the frontend
--    picker mirrors this so a coach never even sees the conflicting option,
--    but the DB is the source of truth.
--
-- 3. coach_day_off replaces available_days as the thing the client booking
--    flow and the coach's own schedule check: it blocks one specific
--    calendar date, not a weekday forever. Turning "Monday" off blocks only
--    the next upcoming Monday — the Monday after that is back to normal
--    unless separately blocked. available_days itself is left in place
--    (still seeded on approval) rather than dropped, since nothing outside
--    this feature depends on removing it and there's no need to touch rows
--    with real history.

-- ---------------------------------------------------------------------------
-- 1. Overlap guard on timeslots.
-- ---------------------------------------------------------------------------

create or replace function public.prevent_overlapping_timeslots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.is_available then
    return new;
  end if;

  if exists (
    select 1 from public.timeslots t
    where t.coach_id = new.coach_id
      and t.id is distinct from new.id
      and t.is_available
      and new.start_time < t.end_time
      and new.end_time > t.start_time
  ) then
    raise exception 'This slot overlaps another enabled slot';
  end if;

  return new;
end;
$$;

create trigger timeslots_prevent_overlap
  before insert or update on public.timeslots
  for each row execute function public.prevent_overlapping_timeslots();

revoke all on function public.prevent_overlapping_timeslots() from public, anon;

-- ---------------------------------------------------------------------------
-- 2. Backfill the fixed catalog for every coach that already exists.
--    on conflict do nothing — a coach who already has a slot at one of
--    these (start, end) pairs (e.g. the 09:00-10:00 / 14:00-15:00 seed
--    data) keeps its existing row, and existing is_available untouched.
-- ---------------------------------------------------------------------------

insert into public.timeslots (coach_id, start_time, end_time, is_available)
select c.id, grid.start_time, grid.start_time + interval '1 hour', false
from public.coaches c
cross join lateral (
  select (time '00:00' + (n * interval '30 minutes'))::time as start_time
  from generate_series(0, 45) as n
) as grid
on conflict (coach_id, start_time, end_time) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Seed the same catalog for every future approval too.
-- ---------------------------------------------------------------------------

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

  update public.profiles
  set role = case when p_status = 'approved' then 'coach' else 'client' end
  where id = p_coach_id and role <> 'admin';

  if p_status = 'approved' then
    insert into public.available_days (coach_id, day, is_available)
    select p_coach_id, d, true
    from unnest(array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) as d
    on conflict (coach_id, day) do nothing;

    insert into public.coach_billing (coach_id, subscription_status)
    values (p_coach_id, 'inactive')
    on conflict (coach_id) do nothing;

    update public.coaches
    set coach_code = coalesce(coach_code, lpad(nextval('public.coach_code_seq')::text, 4, '0'))
    where id = p_coach_id;

    insert into public.timeslots (coach_id, start_time, end_time, is_available)
    select p_coach_id, (time '00:00' + (n * interval '30 minutes'))::time, (time '00:00' + (n * interval '30 minutes'))::time + interval '1 hour', false
    from generate_series(0, 45) as n
    on conflict (coach_id, start_time, end_time) do nothing;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. coach_day_off: specific blocked calendar dates.
-- ---------------------------------------------------------------------------

create table public.coach_day_off (
  id bigint generated always as identity primary key,
  coach_id uuid not null references public.coaches (id) on delete cascade,
  off_date date not null,
  created_at timestamptz not null default now(),
  unique (coach_id, off_date)
);

create index coach_day_off_coach_date_idx on public.coach_day_off (coach_id, off_date);

alter table public.coach_day_off enable row level security;

create policy coach_day_off_coach on public.coach_day_off
  for all to authenticated
  using (coach_id = auth.uid() and public.is_approved_coach())
  with check (coach_id = auth.uid() and public.is_approved_coach());

create policy coach_day_off_admin on public.coach_day_off
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Mirrors available_days_client_select: a client needs to know which
-- specific dates their own approved coach has blocked, to grey them out
-- when booking.
create policy coach_day_off_client_select on public.coach_day_off
  for select to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      where cc.client_id = auth.uid() and cc.coach_id = coach_day_off.coach_id and cc.status = 'approved'
    )
  );

grant select, insert, delete on public.coach_day_off to authenticated, service_role;
