-- Coach ID (a short numeric code, e.g. "0001") — replaces the client-facing
-- coach picker at sign-up with a code a coach hands out directly. Assigned
-- once, at first approval, alongside the other approval-time side effects
-- already seeded in admin_set_coach_status() (available_days, coach_billing
-- — see 20260824010200_coaches_and_coach_clients.sql).

alter table public.coaches add column coach_code text unique;

create sequence public.coach_code_seq start 1;

-- Public, pre-auth-readable directory of approved coaches — same view the
-- sign-up coach picker already reads (anon, no session yet). Adding
-- coach_code so a client can resolve "0001" -> coach_id the same way.
create or replace view public.coach_directory as
  select c.id as coach_id, p.full_name, c.bio, c.coach_code
  from public.coaches c
  join public.profiles p on p.id = c.id
  where c.status = 'approved';

-- Re-declared with the same body as 20260824010200's version, plus the
-- coach_code assignment inside the existing "approved" branch. coalesce()
-- makes this idempotent exactly like the neighboring on-conflict-do-nothing
-- inserts: re-approving a coach after a suspend keeps their existing code
-- rather than burning a new sequence number.
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
  end if;
end;
$$;
