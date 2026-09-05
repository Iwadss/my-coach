-- Cancelling a booking is an UPDATE (status -> 'cancelled'), not a DELETE —
-- see bookings_client_cancel — so the row, and its (coach_id, date,
-- time_slot_id) combination, still exists afterward. The plain unique
-- constraint on that triple didn't know about status, so a cancelled
-- booking permanently blocked anyone from ever booking that exact
-- coach/date/slot again: a fresh insert hit the same unique violation
-- (23505) as a genuine double-booking, surfaced client-side as "Time slot
-- already booked" even though the slot was free.
--
-- Swap the plain constraint for a partial unique index that only applies to
-- non-cancelled rows, so cancelled bookings can pile up on the same slot
-- (each is real booking history) while still preventing two *active*
-- bookings from colliding on it.
alter table public.bookings
    drop constraint bookings_coach_id_date_time_slot_id_key;

create unique index bookings_coach_id_date_time_slot_id_key
    on public.bookings (coach_id, date, time_slot_id)
    where status <> 'cancelled';
