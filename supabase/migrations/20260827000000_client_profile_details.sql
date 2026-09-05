-- Adds a few more self-reported profile fields to public.clients, for the
-- "Your details" card on the client settings page: gender, height, weight.
-- All optional (self-signup never collected these, same reasoning as
-- phone/goal in 20260824010100). Weight/height are stored in fixed units
-- (kg/cm) — the client-side kg/lb toggle is presentation-only and converts
-- from these canonical values, same as it already does elsewhere.

alter table public.clients
  add column gender text check (gender in ('male', 'female', 'prefer_not_to_say')),
  add column height_cm numeric check (height_cm > 0 and height_cm < 300),
  add column weight_kg numeric check (weight_kg > 0 and weight_kg < 500);

-- Additive to the existing "update (full_name, phone, goal)" grant from
-- 20260824010300_clients_rls.sql — column-level GRANTs accumulate, they
-- don't replace each other, so this doesn't need to repeat those columns.
grant update (gender, height_cm, weight_kg) on public.clients to authenticated;
