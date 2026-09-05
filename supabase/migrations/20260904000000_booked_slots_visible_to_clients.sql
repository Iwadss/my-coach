-- Lets a client see which of their coach's time slots are already taken by
-- *any* client on a given date range — not just their own bookings.
--
-- bookings_select RLS deliberately only lets a client SELECT rows where
-- client_id = auth.uid(), so a client can't query "is this slot booked" for
-- slots someone else holds. ClientBook.tsx has therefore only ever been able
-- to filter out the client's own bookings, leaving another client's booked
-- slot fully clickable — booking it then fails with a 23505 on the
-- (coach_id, date, time_slot_id) unique constraint, surfaced as a generic
-- error toast instead of the slot just not being offered.
--
-- This function closes that gap without loosening bookings_select itself:
-- SECURITY DEFINER to read across all clients' bookings for the coach, but
-- scoped tight — only (date, time_slot_id) come back, never client_id,
-- booking id, or status detail beyond "occupied" — and gated by the same
-- "caller has an approved relationship with this coach" check
-- timeslots_client_select already uses, so it can't be used to probe a
-- coach's schedule the caller has no relationship with.
create or replace function public.booked_slots_for_range(p_coach_id uuid, p_start date, p_end date)
returns table (booked_date date, time_slot_id bigint)
language sql
stable
security definer
set search_path = public
as $$
    select b.date, b.time_slot_id
    from public.bookings b
    where b.coach_id = p_coach_id
      and b.date between p_start and p_end
      and b.status <> 'cancelled'
      and exists (
          select 1 from public.coach_clients cc
          where cc.client_id = auth.uid()
            and cc.coach_id = p_coach_id
            and cc.status = 'approved'
      );
$$;

grant execute on function public.booked_slots_for_range(uuid, date, date) to authenticated;
