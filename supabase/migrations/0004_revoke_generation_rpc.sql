-- 0004_revoke_generation_rpc.sql
-- Public users are strictly read-only: revoke direct EXECUTE on the
-- write-capable slot-generation RPC from anon, authenticated, and PUBLIC.
--
-- After this migration:
-- - anon / authenticated CANNOT execute ensure_daily_slots() directly
--   (browser calls would be rejected with permission denied).
-- - Slot generation runs ONLY through the trusted Next.js server path,
--   which invokes this function with the service_role key server-side.
-- - RLS policies (0002) are unchanged; the RPC body itself is unchanged.
--
-- The explicit GRANT to service_role is required because revoking from
-- PUBLIC removes the default EXECUTE grant for every role except the owner.
-- The service_role key lives only in server-side environment
-- (SUPABASE_SERVICE_ROLE_KEY, never NEXT_PUBLIC_*) and never reaches the browser.

revoke all on function public.ensure_daily_slots(uuid, date)
  from public, anon, authenticated;

grant execute on function public.ensure_daily_slots(uuid, date) to service_role;
