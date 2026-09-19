-- 0003_ensure_slots_rpc.sql
-- Trusted server-side slot generation.
--
-- Public users remain strictly read-only on tables (no INSERT policy).
-- Missing slots are created ONLY through this SECURITY DEFINER function,
-- which is executable by anon + authenticated but can only insert 'free'
-- slots derived from the turf's own open/close/duration settings.
-- Idempotent via ON CONFLICT (turf_id, slot_date, start_time) DO NOTHING.

create or replace function public.ensure_daily_slots(
  p_turf_id uuid,
  p_slot_date date
)
returns setof public.slots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open time;
  v_close time;
  v_dur integer;
  v_now date := current_date;
begin
  -- Turf must exist.
  select open_time, close_time, slot_duration_minutes
    into v_open, v_close, v_dur
    from public.turfs
   where id = p_turf_id;

  if not found then
    raise exception 'turf not found';
  end if;

  if v_dur is null or v_dur <= 0 or v_dur > 480 then
    raise exception 'invalid slot duration for turf';
  end if;

  if v_open is null or v_close is null or v_open >= v_close then
    raise exception 'invalid turf opening hours';
  end if;

  -- Pragmatic guard against abuse / runaway generation.
  -- MVP window: 7 days in the past .. 90 days in the future.
  if p_slot_date < (v_now - 7) or p_slot_date > (v_now + 90) then
    raise exception 'date out of range';
  end if;

  -- Insert the full day's grid; existing rows are left untouched.
  insert into public.slots (turf_id, slot_date, start_time, end_time, status)
  select
    p_turf_id,
    p_slot_date,
    s::time as start_time,
    (s + make_interval(mins => v_dur))::time as end_time,
    'free' as status
  from generate_series(
    ('2000-01-01'::date + v_open)::timestamp,
    ('2000-01-01'::date + v_close)::timestamp - make_interval(mins => v_dur),
    make_interval(mins => v_dur)
  ) as s
  on conflict (turf_id, slot_date, start_time) do nothing;

  return query
  select *
    from public.slots
   where turf_id = p_turf_id
     and slot_date = p_slot_date
   order by start_time asc;
end;
$$;

-- Allow the public dashboard (anon) and staff to ensure a day's grid exists.
-- The function itself is tightly scoped: it never updates existing rows and
-- never creates non-'free' slots.
grant execute on function public.ensure_daily_slots(uuid, date) to anon, authenticated;

-- Lock down the helper so it cannot be abused for writes by itself.
revoke all on function public.is_staff() from anon;
grant execute on function public.is_staff() to authenticated;
