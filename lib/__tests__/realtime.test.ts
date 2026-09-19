import { describe, expect, it, vi } from "vitest";
import { subscribeToSlots } from "@/lib/realtime";

function fakeSupabase(onHandler: (payload: unknown) => void) {
  const handlers: Record<string, (payload: unknown) => void> = {};
  const channel = {
    on: vi.fn((event: string, filter: Record<string, unknown>, cb: (p: unknown) => void) => {
      handlers.filter = cb;
      onHandler(filter);
      return channel;
    }),
    subscribe: vi.fn((cb: (s: string) => void) => {
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
  };
}

describe("subscribeToSlots (realtime)", () => {
  it("scopes the channel per turf and applies updates for the selected date", () => {
    let seenFilter: Record<string, unknown> | null = null;
    const { supabase, handlers } = fakeSupabase((f) => {
      seenFilter = f as Record<string, unknown>;
    });
    const onChange = vi.fn();
    const sub = subscribeToSlots(
      supabase,
      "turf-1",
      "2026-09-15",
      onChange,
    );
    expect(
      (supabase.channel as unknown as ReturnType<typeof vi.fn>),
    ).toHaveBeenCalledWith("slots-turf-1-2026-09-15");
    expect(seenFilter).toMatchObject({ table: "slots" });

    handlers.filter!({
      eventType: "UPDATE",
      new: { id: "s1", turf_id: "turf-1", slot_date: "2026-09-15", status: "booked" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);

    sub.unsubscribe();
  });

  it("ignores rows for other dates on the same turf channel", () => {
    const { supabase, handlers } = fakeSupabase(() => {});
    const onChange = vi.fn();
    subscribeToSlots(supabase, "turf-1", "2026-09-15", onChange);
    handlers.filter!({
      eventType: "UPDATE",
      new: { id: "s2", turf_id: "turf-1", slot_date: "2026-09-16", status: "booked" },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("reports channel errors to the caller", () => {
    let statusCb: ((s: string) => void) | null = null;
    const channel = {
      on: vi.fn(() => channel),
      subscribe: vi.fn((cb: (s: string) => void) => {
        statusCb = cb;
        return channel;
      }),
    };
    const supabase = { channel: () => channel, removeChannel: vi.fn() } as never;
    const onError = vi.fn();
    subscribeToSlots(supabase, "turf-1", "2026-09-15", vi.fn(), onError);
    statusCb!("CHANNEL_ERROR");
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/disconnected/i));
  });
});
