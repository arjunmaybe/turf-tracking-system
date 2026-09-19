-- 0001_schema.sql
-- Core tables for the Turf Slot Tracking System.
-- Business timezone is Asia/Kolkata (handled in app logic; DB stores date/time natively).

-- Enable pgcrypto for gen_random_uuid() if not already available.
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- turfs
-- ---------------------------------------------------------------------------
create table if not exists public.turfs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  open_time time not null,
  close_time time not null,
  slot_duration_minutes integer not null default 60,
  phone_number text,
  whatsapp_number text,
  created_at timestamptz not null default now(),
  constraint turfs_name_not_empty check (char_length(btrim(name)) > 0),
  constraint turfs_duration_positive check (slot_duration_minutes > 0 and slot_duration_minutes <= 480),
  constraint turfs_open_before_close check (open_time < close_time)
);

-- ---------------------------------------------------------------------------
-- slots
-- ---------------------------------------------------------------------------
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  turf_id uuid not null references public.turfs(id) on delete cascade,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'free',
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id),
  constraint slots_end_after_start check (end_time > start_time),
  constraint slots_status_allowed check (status in ('free', 'booked', 'maintenance'))
);

-- Prevent duplicate slots for the same turf/date/start.
create unique index if not exists slots_turf_date_start_uidx
  on public.slots (turf_id, slot_date, start_time);

-- Useful read-path indexes (public dashboard filters by turf + date).
create index if not exists slots_turf_id_idx on public.slots (turf_id);
create index if not exists slots_slot_date_idx on public.slots (slot_date);
create index if not exists slots_turf_date_idx on public.slots (turf_id, slot_date);

-- Keep updated_at fresh on every update.
create or replace function public.set_slots_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_slots_updated_at on public.slots;
create trigger trg_slots_updated_at
  before update on public.slots
  for each row execute function public.set_slots_updated_at();

-- ---------------------------------------------------------------------------
-- staff (explicit authorization list; NOT every authenticated user)
-- ---------------------------------------------------------------------------
create table if not exists public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'staff',
  created_at timestamptz not null default now(),
  constraint staff_role_allowed check (role in ('staff', 'owner'))
);

-- ---------------------------------------------------------------------------
-- slot_changes (audit history)
-- ---------------------------------------------------------------------------
create table if not exists public.slot_changes (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots(id) on delete cascade,
  user_id uuid null references auth.users(id),
  old_status text null,
  new_status text null,
  changed_at timestamptz not null default now(),
  constraint slot_changes_old_allowed check (old_status is null or old_status in ('free', 'booked', 'maintenance')),
  constraint slot_changes_new_allowed check (new_status is null or new_status in ('free', 'booked', 'maintenance'))
);

create index if not exists slot_changes_slot_id_idx on public.slot_changes (slot_id);
create index if not exists slot_changes_changed_at_idx on public.slot_changes (changed_at desc);
