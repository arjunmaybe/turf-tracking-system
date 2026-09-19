import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Slot } from "@/types/database";

export interface SlotSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

/**
 * Subscribe to slot changes for one turf + date.
 * Caller must pass exactly one turf_id/date — keeps Turf 1 and Turf 2
 * realtime streams independent. Returns an unsubscribe for cleanup.
 *
 * Guards (defense in depth):
 * - server filter is turf-only, so we re-check turf_id AND slot_date client-side.
 *   A stale Turf 1 channel must never apply a Turf 2 row, and a stale Date A
 *   handler must never apply a Date B row.
 * - callers must unsubscribe on turf/date change (useEffect cleanup) and set a
 *   cancelled flag so late events cannot overwrite the newly selected view.
 */
export function subscribeToSlots(
  supabase: SupabaseClient,
  turfId: string,
  slotDate: string,
  onSlotsChanged: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    slot: Slot;
  }) => void,
  onError?: (message: string) => void,
  onStatus?: (status: "subscribed" | "reconnecting" | "disconnected") => void,
): SlotSubscription {
  const channel = supabase
    .channel(`slots-${turfId}-${slotDate}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "slots",
        filter: `turf_id=eq.${turfId}`,
      },
      (payload) => {
        const eventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
        const row = (
          eventType === "DELETE" ? payload.old : payload.new
        ) as Slot;
        if (!row || typeof row !== "object") return;
        // Turf guard: stale/wrong-turf events must not touch this view.
        if ("turf_id" in row && (row as Slot).turf_id !== turfId) {
          return;
        }
        // Extra client-side date guard (server filter is turf-only).
        if (row && "slot_date" in row && (row as Slot).slot_date !== slotDate) {
          return;
        }
        try {
          onSlotsChanged({ eventType, slot: row });
        } catch (err) {
          onError?.(err instanceof Error ? err.message : "Realtime handler failed");
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onStatus?.("subscribed");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        onStatus?.("disconnected");
        onError?.("Live updates disconnected. Changes may require refresh.");
      }
    });

  return {
    channel,
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
}
