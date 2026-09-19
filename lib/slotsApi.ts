import type { SupabaseClient } from "@supabase/supabase-js";
import type { Slot, SlotStatus, Turf } from "@/types/database";
import { isSlotStatus } from "@/types/database";

/** Public read: list turfs. */
export async function fetchTurfs(supabase: SupabaseClient): Promise<Turf[]> {
  const { data, error } = await supabase
    .from("turfs")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(`Could not load turfs: ${error.message}`);
  return (data ?? []) as Turf[];
}

/**
 * Ensure a day's grid exists WITHOUT granting table INSERT to the caller.
 * Goes through the Next.js route -> server-only service_role helper ->
 * SECURITY DEFINER RPC ensure_daily_slots(). The browser can never execute
 * the RPC directly (EXECUTE revoked from anon/authenticated).
 * Idempotent; existing rows are never modified.
 */
export async function ensureSlots(
  turfId: string,
  slotDate: string,
): Promise<Slot[]> {
  const res = await fetch("/api/ensure-slots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ turf_id: turfId, slot_date: slotDate }),
  });
  const body = (await res.json().catch(() => null)) as {
    slots?: Slot[];
    error?: string;
  } | null;
  if (!res.ok) {
    throw new Error(body?.error ?? `Could not load slots (HTTP ${res.status})`);
  }
  return (body?.slots ?? []) as Slot[];
}

/** Public read: fetch slots for a turf + date (after ensure). */
export async function fetchSlots(
  supabase: SupabaseClient,
  turfId: string,
  slotDate: string,
): Promise<Slot[]> {
  const { data, error } = await supabase
    .from("slots")
    .select("*")
    .eq("turf_id", turfId)
    .eq("slot_date", slotDate)
    .order("start_time", { ascending: true });
  if (error) throw new Error(`Could not load slots: ${error.message}`);
  return (data ?? []) as Slot[];
}

export interface SlotUpdateResult {
  slot: Slot;
  /** True when the row changed under us and we re-fetched instead of overwriting. */
  conflict: boolean;
}

/**
 * Staff-only status update with optimistic-concurrency guard.
 * - Re-reads the row first; if expectedOldStatus is given and differs, aborts.
 * - RLS independently rejects unauthorized callers.
 * - Writes audit row (slot_changes) — failures there do not roll back the status.
 */
export async function updateSlotStatus(
  supabase: SupabaseClient,
  slotId: string,
  newStatus: SlotStatus,
  opts?: { expectedOldStatus?: SlotStatus | null },
): Promise<SlotUpdateResult> {
  if (!isSlotStatus(newStatus)) throw new Error("Invalid status");

  const { data: current, error: readError } = await supabase
    .from("slots")
    .select("*")
    .eq("id", slotId)
    .maybeSingle();
  if (readError) throw new Error(`Could not read slot: ${readError.message}`);
  if (!current) throw new Error("Slot not found");
  const row = current as Slot;

  if (
    opts?.expectedOldStatus &&
    row.status !== opts.expectedOldStatus
  ) {
    // Another staff member changed it — surface conflict, return fresh row.
    return { slot: row, conflict: true };
  }
  if (row.status === newStatus) return { slot: row, conflict: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: updated, error: updateError } = await supabase
    .from("slots")
    .update({ status: newStatus, updated_by: user?.id ?? null })
    .eq("id", slotId)
    .select("*")
    .maybeSingle();
  if (updateError) {
    throw new Error(
      updateError.message.includes("row-level security") ||
        updateError.code === "42501"
        ? "Not authorized to update slots."
        : `Slot update failed: ${updateError.message}`,
    );
  }
  if (!updated) throw new Error("Slot update was rejected.");
  const next = updated as Slot;

  // Audit (best-effort; RLS may reject for misconfigured staff — don't hide it).
  const { error: auditError } = await supabase.from("slot_changes").insert({
    slot_id: slotId,
    user_id: user?.id ?? null,
    old_status: row.status,
    new_status: next.status,
  });
  if (auditError) {
    // Surface but don't fail the update — the status change itself succeeded.
    console.warn("Audit log failed:", auditError.message);
  }

  return { slot: next, conflict: false };
}

/** Staff quick action: set every remaining-today slot for a turf to free. */
export async function freeRemainingSlotsToday(
  supabase: SupabaseClient,
  turfId: string,
  slotDate: string,
  nowStartMinutes: number,
  timeToMinutes: (t: string) => number,
): Promise<number> {
  const slots = await fetchSlots(supabase, turfId, slotDate);
  const targets = slots.filter(
    (s) =>
      timeToMinutes(s.end_time) > nowStartMinutes && s.status !== "free",
  );
  let freed = 0;
  for (const s of targets) {
    try {
      await updateSlotStatus(supabase, s.id, "free", {
        expectedOldStatus: s.status,
      });
      freed += 1;
    } catch {
      // Continue with the rest; caller reports partial count.
    }
  }
  return freed;
}
