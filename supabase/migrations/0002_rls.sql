-- 0002_rls.sql
-- Row Level Security: public is strictly read-only; only explicit staff can write.
--
-- Anonymous public visitor: SELECT turfs + slots only.
-- Authenticated but unauthorized: same as anonymous (read-only).
-- Authorized staff (present in public.staff): UPDATE slots.status + INSERT audit rows.
-- Owner: same as staff for MVP (staff table management stays SQL-only).

-- Helper: true when the calling user is in the staff table.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

alter table public.turfs enable row level security;
alter table public.slots enable row level security;
alter table public.staff enable row level security;
alter table public.slot_changes enable row level security;

-- ---------------------------------------------------------------------------
-- turfs: public read, no client writes
-- ---------------------------------------------------------------------------
drop policy if exists turfs_select_public on public.turfs;
create policy turfs_select_public
  on public.turfs for select
  to anon, authenticated
  using (true);

-- No INSERT / UPDATE / DELETE policies for turfs => all client writes rejected.

-- ---------------------------------------------------------------------------
-- slots: public read, staff-only update. NO anon/authenticated INSERT/UPDATE/DELETE
-- except the staff-scoped UPDATE below. Missing-slot generation goes through
-- the SECURITY DEFINER RPC ensure_daily_slots() (see 0003), NOT table INSERT.
-- ---------------------------------------------------------------------------
drop policy if exists slots_select_public on public.slots;
create policy slots_select_public
  on public.slots for select
  to anon, authenticated
  using (true);

drop policy if exists slots_update_staff on public.slots;
create policy slots_update_staff
  on public.slots for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- No INSERT or DELETE policies on slots => direct client inserts/deletes rejected
-- for everyone (including staff). Inserts happen only inside the RPC.

-- ---------------------------------------------------------------------------
-- staff: visible only to staff; managed via SQL (no client writes in MVP)
-- ---------------------------------------------------------------------------
drop policy if exists staff_select_staff on public.staff;
create policy staff_select_staff
  on public.staff for select
  to authenticated
  using (public.is_staff());

-- No INSERT / UPDATE / DELETE policies => client-side staff management rejected.

-- ---------------------------------------------------------------------------
-- slot_changes: staff can read + insert their own audit rows
-- ---------------------------------------------------------------------------
drop policy if exists slot_changes_select_staff on public.slot_changes;
create policy slot_changes_select_staff
  on public.slot_changes for select
  to authenticated
  using (public.is_staff());

drop policy if exists slot_changes_insert_staff on public.slot_changes;
create policy slot_changes_insert_staff
  on public.slot_changes for insert
  to authenticated
  with check (public.is_staff() and user_id = auth.uid());
