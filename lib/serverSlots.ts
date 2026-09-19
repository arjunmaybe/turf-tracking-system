import { createClient } from "@supabase/supabase-js";
import type { Slot } from "@/types/database";

/**
 * SERVER-ONLY trusted slot generation.
 *
 * Public users are strictly read-only: EXECUTE on ensure_daily_slots() is
 * revoked from anon/authenticated (see 0004_revoke_generation_rpc.sql), so
 * this module invokes the RPC with the service_role key instead.
 *
 * HARD RULES:
 * - NEVER import this file from a Client Component ("use client") or any
 *   browser-bundled code. Allowed importers: Route Handlers and async Server
 *   Components only (currently: app/api/ensure-slots/route.ts, app/page.tsx,
 *   app/admin/page.tsx). Contract tests scan client files for this import.
 * - The secret lives ONLY in SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_
 *   prefix, never serialized, never returned in API responses).
 * - The RPC itself stays tightly scoped: inserts only missing 'free' rows
 *   derived from the turf's own grid; existing statuses are never touched.
 */

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Slot generation is not configured. Set SUPABASE_SERVICE_ROLE_KEY (server-only) alongside NEXT_PUBLIC_SUPABASE_URL. See .env.example.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Idempotently ensure a day's slot grid via the SECURITY DEFINER RPC.
 * Throws the raw RPC error (callers map it to safe client messages) or a
 * configuration error when the server key is missing (callers fall back to
 * a plain read of existing rows).
 */
export async function ensureDailySlotsServer(
  turfId: string,
  slotDate: string,
): Promise<Slot[]> {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase.rpc("ensure_daily_slots", {
    p_turf_id: turfId,
    p_slot_date: slotDate,
  });
  if (error) throw error;
  const rows = Array.isArray(data) ? (data as Slot[]) : [];
  // Defensive shape check — never trust RPC rows blindly.
  return rows.filter(
    (s) =>
      s !== null &&
      typeof s === "object" &&
      s.turf_id === turfId &&
      s.slot_date === slotDate,
  );
}
