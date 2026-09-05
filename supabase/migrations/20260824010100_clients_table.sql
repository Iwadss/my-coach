-- Phase A.2 — Client detail table.
--
-- Table only, no RLS/grants here — coach_clients and is_approved_coach()
-- (20260824010200) don't exist yet, and clients' own RLS policies need
-- them. RLS + grants for this table are added in 20260824010300, once
-- that's true.
--
-- This is a brand-new database (no legacy rows anywhere), so unlike the
-- original single-coach schema this is defined correctly from the start:
-- phone/goal are optional since self-signup only collects
-- name/email/password/coach choice.

create table public.clients (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  goal text check (goal in ('lean body', 'bulking', 'cutting')),
  created_at timestamptz not null default now()
);
