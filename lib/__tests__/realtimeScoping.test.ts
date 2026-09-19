import { describe, expect, it, vi } from "vitest";
import { subscribeToSlots } from "@/lib/realtime";

function fakeSupabase() {
  const handlers: Record<string, (payload: unknown) => void> = {};
  let statusCb: ((s: string) => void) | null = null;
  const channel = {
    on: vi.fn((_event: string, _filter: Record<string, unknown>, cb: (p: unknown) => void) => {
      handlers.filter = cb;
      return channel;
    }),
    subscribe: vi.fn((cb: (s: string) => void) => {
      statusCb = cb;
      cb("SUBSCRIBED");
      return channel;
    }),
  };
  return {
    supabase: {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    } as unknown as import("@supabase/supabase-js").SupabaseClient,
    channel,
    handlers,
    getStatusCb: () => statusCb,
  };
}

describe("realtime turf/date scoping + reconnect", () => {
  it("Turf 2 event MUST NOT change Turf 1 UI (turf_id guard)", () => {
    const { supabase, handlers } = fakeSupabase();
    const onChange = vi.fn();
    subscribeToSlots(supabase, "turf-1", "2026-09-15", onChange);
    handlers.filter!({
      eventType: "UPDATE",
      new: { id: "s1", turf_id: "turf-2", slot_date: "2026-09-15", status: "booked" },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("stale Date A event MUST NOT change Date B UI (slot_date guard)", () => {
    const { supabase, handlers } = fakeSupabase();
    const onChange = vi.fn();
    subscribeToSlots(supabase, "turf-1", "2026-09-16", onChange);
    handlers.filter!({
      eventType: "UPDATE",
      new: { id: "s1", turf_id: "turf-1", slot_date: "2026-09-15", status: "booked" },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("matching turf+date event IS applied", () => {
    const { supabase, handlers } = fakeSupabase();
    const onChange = vi.fn();
    subscribeToSlots(supabase, "turf-1", "2026-09-15", onChange);
    handlers.filter!({
      eventType: "UPDATE",
      new: { id: "s1", turf_id: "turf-1", slot_date: "2026-09-15", status: "booked" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("disconnect surfaces via onError AND onStatus; resubscribe reports live", () => {
    const { supabase, getStatusCb } = fakeSupabase();
    const onError = vi.fn();
    const onStatus = vi.fn();
    subscribeToSlots(supabase, "turf-1", "2026-09-15", vi.fn(), onError, onStatus);
    const cb = getStatusCb();
    expect(cb).not.toBeNull();
    expect(onStatus).toHaveBeenCalledWith("subscribed");
    cb!("CHANNEL_ERROR");
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/disconnected/i));
    expect(onStatus).toHaveBeenCalledWith("disconnected");
    cb!("SUBSCRIBED");
    expect(onStatus).toHaveBeenLastCalledWith("subscribed");
  });

  it("DELETE events deliver the old row for refetch handling", () => {
    const { supabase, handlers } = fakeSupabase();
    const onChange = vi.fn();
    subscribeToSlots(supabase, "turf-1", "2026-09-15", onChange);
    handlers.filter!({
      eventType: "DELETE",
      old: { id: "s9", turf_id: "turf-1", slot_date: "2026-09-15", status: "free" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "DELETE" }),
    );
  });
});
