-- Phase A.5 — Gap found while building PendingApproval.tsx: a client needs
-- to read their own coach's name/bio (any coach_clients status, not just
-- 'approved' — e.g. "your request to Jane is pending"), but coaches_select
-- and profiles_select only ever let a coach see their own row. Add the
-- symmetric read for the client's side of the relationship.

create policy coaches_select_by_client on public.coaches
  for select to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      where cc.coach_id = coaches.id and cc.client_id = auth.uid()
    )
  );

create policy profiles_select_by_client on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      where cc.coach_id = profiles.id and cc.client_id = auth.uid()
    )
  );
