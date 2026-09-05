-- Phase A.1 — Universal identity + role.
--
-- Every auth.users row gets exactly one profiles row, created automatically
-- on signup, always role='client'. Role only ever changes through an
-- admin-authorized path (see 20260824010100_coaches_and_coach_clients.sql's
-- admin_set_coach_status()) — never a direct client-writable update.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'client' check (role in ('client', 'coach', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Role helpers. security definer + pinned search_path so these never recurse
-- through the RLS policies they're used inside.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'coach'
  );
$$;

-- ---------------------------------------------------------------------------
-- Auto-create the profile row on signup.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Block self role-escalation structurally. RLS `with check` can't restrict
-- which *columns* change within an otherwise-permitted row update, so this
-- needs a trigger: only an admin may ever change profiles.role.
-- ---------------------------------------------------------------------------

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'role cannot be changed directly';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- RLS. No insert policy for anon/authenticated — only the security definer
-- trigger above ever inserts a profiles row.
-- ---------------------------------------------------------------------------

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants. Postgres grants EXECUTE on new functions to PUBLIC (which includes
-- anon) by default — revoke that explicitly on every function we define,
-- everywhere in this migration set, then grant back only to authenticated.
-- Each function still checks is_admin() internally; this is defense in depth.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;
grant select, update on public.profiles to authenticated, service_role;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_coach() from public, anon;
revoke all on function public.handle_new_user() from public, anon;
revoke all on function public.protect_profile_role() from public, anon;

grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_coach() to authenticated, service_role;
