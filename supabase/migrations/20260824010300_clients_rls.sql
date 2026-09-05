-- Phase A.3 — RLS + grants for public.clients (table created in
-- 20260824010100; deferred here because these policies reference
-- coach_clients and is_approved_coach(), defined in 20260824010200).

alter table public.clients enable row level security;

create policy clients_select on public.clients
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (
      -- Any relationship status, not just 'approved' — a coach needs to see
      -- a client's name/phone/goal on the client-requests review screen
      -- (client_requests.tsx) *before* deciding to approve them.
      select 1 from public.coach_clients cc
      where cc.client_id = clients.id and cc.coach_id = auth.uid()
    )
  );

create policy clients_insert on public.clients
  for insert to authenticated
  with check (id = auth.uid() or public.is_approved_coach() or public.is_admin());

create policy clients_update on public.clients
  for update to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.coach_clients cc
      where cc.client_id = clients.id and cc.coach_id = auth.uid() and cc.status = 'approved'
    )
  )
  with check (
    id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.coach_clients cc
      where cc.client_id = clients.id and cc.coach_id = auth.uid() and cc.status = 'approved'
    )
  );

grant select, insert on public.clients to authenticated, service_role;
revoke update on public.clients from authenticated;
grant update (full_name, phone, goal) on public.clients to authenticated;
grant update on public.clients to service_role;
