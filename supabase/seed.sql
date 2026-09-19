-- seed.sql
-- Run AFTER migrations (Supabase SQL editor or `supabase db push` + seed).
-- Creates the facility's 2 football turfs. Staff users are created via
-- Supabase Auth (email/password) and then added to public.staff (see README).

-- Rerun-safe: each turf is inserted only when its name is not present,
-- so applying the seed twice still leaves exactly the 2 football turfs
-- (turfs.id is a fresh uuid, so a bare ON CONFLICT DO NOTHING would not help).
insert into public.turfs (name, open_time, close_time, slot_duration_minutes, phone_number, whatsapp_number)
select 'Turf 1 — Football', '06:00', '23:00', 60, '+910000000001', '910000000001'
where not exists (select 1 from public.turfs where name = 'Turf 1 — Football');

insert into public.turfs (name, open_time, close_time, slot_duration_minutes, phone_number, whatsapp_number)
select 'Turf 2 — Football', '06:00', '23:00', 60, '+910000000002', '910000000002'
where not exists (select 1 from public.turfs where name = 'Turf 2 — Football');

-- Example: pre-generate today's grid for both turfs (optional; the app
-- auto-ensures via ensure_daily_slots() on view).
-- select public.ensure_daily_slots(id, current_date) from public.turfs;
