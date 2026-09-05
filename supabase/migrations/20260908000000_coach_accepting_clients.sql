-- Makes the "Open to new clients" toggle on the coach settings/requests page
-- real. Previously it was component state only (reset on reload, and its
-- own helper text admitted it "doesn't stop new requests yet").
alter table public.coaches
    add column accepting_clients boolean not null default true;

grant update (accepting_clients) on public.coaches to authenticated;

-- coach_directory stays the general "all approved coaches" directory (its
-- existing doc comment) — NOT filtered by accepting_clients here. SignUp.tsx
-- needs to resolve a typed coach code to a real coach even when they're
-- closed, so it can show "this coach isn't accepting new clients" instead of
-- a generic "no such coach" — that distinction is lost if the view hides
-- them outright. Consumers that list/pick from many coaches (coach-picker.tsx)
-- filter on the new column themselves.
create or replace view public.coach_directory as
  select c.id as coach_id, p.full_name, c.bio, c.coach_code, c.accepting_clients
  from public.coaches c
  join public.profiles p on p.id = c.id
  where c.status = 'approved';

-- Real server-side backstop, not just a UI check: coach_clients_insert_client
-- (the RLS policy every client-initiated request/resubmit/change-coach
-- insert goes through) already calls this to confirm the target coach is
-- approved — now it also confirms they're accepting clients, so the block
-- holds even against a request that skips the UI entirely.
create or replace function public.coach_is_approved(target_coach uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.coaches
    where id = target_coach and status = 'approved' and accepting_clients
  );
$$;
