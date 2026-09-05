-- Lets a client cancel their own upcoming booking — session-status.tsx was
-- entirely read-only until now. The column-level grant (update (status) on
-- bookings) already exists broadly from the original coach-scoping
-- migration; this is purely a new RLS policy restricting a client's write
-- to "my own row, and only ever to 'cancelled'".

create policy bookings_client_cancel on public.bookings
  for update to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid() and status = 'cancelled');
