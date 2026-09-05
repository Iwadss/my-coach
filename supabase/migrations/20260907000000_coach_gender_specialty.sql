-- "Coach profile" edit dialog on the coach settings page: gender and
-- specialty, alongside the existing bio/phone. Same gender values as the
-- client-facing equivalent (clients.gender, 20260827000000) for consistency
-- across the app. Both nullable — no backfill, no default, matches how
-- phone/bio were added originally.
alter table public.coaches
    add column gender text check (gender is null or gender in ('male', 'female', 'prefer_not_to_say')),
    add column specialty text;

-- coaches_update (20260824010200) already allows a coach to update their own
-- row; the column-level grant is the actual gate and needs these two added
-- explicitly, same as bio/phone were.
grant update (gender, specialty) on public.coaches to authenticated;
