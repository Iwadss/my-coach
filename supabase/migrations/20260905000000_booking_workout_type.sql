-- Optional workout-type tag a client picks as "Step 3" of the booking flow
-- (Day -> Time -> Workout type), alongside the existing day/time/coach
-- fields. Nullable — existing bookings, and any other insert path that
-- doesn't set it, don't need backfilling or a default.
alter table public.bookings
    add column workout_type text
    check (workout_type is null or workout_type = any (array['weightlifting', 'hiit', 'full_body', 'mobility']));
