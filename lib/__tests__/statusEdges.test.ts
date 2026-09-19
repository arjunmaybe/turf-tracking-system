import { describe, expect, it } from "vitest";
import { getCurrentStatus } from "@/lib/slots";
import type { Slot } from "@/types/database";

function slot(
  overrides: Partial<Slot> & { start_time: string; end_time: string },
): Slot {
  return {
    id: `id-${overrides.start_time}`,
    turf_id: "turf-1",
    slot_date: "2026-09-15",
    status: "free",
    updated_at: new Date("2026-09-15T08:00:00+05:30").toISOString(),
    updated_by: null,
    ...overrides,
  };
}

const day = [
  slot({ start_time: "13:00:00", end_time: "14:00:00", status: "free" }),
  slot({ start_time: "14:00:00", end_time: "15:00:00", status: "booked" }),
  slot({ start_time: "15:00:00", end_time: "16:00:00", status: "free" }),
];

describe("getCurrentStatus edge cases (Asia/Kolkata boundaries)", () => {
  it("before slot: 13:59 inside free slot is FREE", () => {
    const res = getCurrentStatus(day, new Date("2026-09-15T13:59:00+05:30"));
    expect(res.state).toBe("free");
    expect(res.currentSlot?.start_time).toBe("13:00:00");
  });

  it("exactly at slot start (14:00) belongs to the booked slot", () => {
    const res = getCurrentStatus(day, new Date("2026-09-15T14:00:00+05:30"));
    expect(res.state).toBe("booked");
    expect(res.currentSlot?.start_time).toBe("14:00:00");
    expect(res.bookedUntil).toBe("3:00 PM");
  });

  it("during slot (14:30) is BOOKED until end", () => {
    const res = getCurrentStatus(day, new Date("2026-09-15T14:30:00+05:30"));
    expect(res.state).toBe("booked");
    expect(res.bookedUntil).toBe("3:00 PM");
  });

  it("exactly at slot end (15:00) belongs to the NEXT slot (free)", () => {
    const res = getCurrentStatus(day, new Date("2026-09-15T15:00:00+05:30"));
    expect(res.state).toBe("free");
    expect(res.currentSlot?.start_time).toBe("15:00:00");
  });

  it("midnight IST with no covering slot is FREE (or CLOSED when no grid)", () => {
    const atMidnight = new Date("2026-09-15T00:00:00+05:30");
    const res = getCurrentStatus(day, atMidnight);
    // Outside all slot ranges -> free (grid exists), never booked.
    expect(res.state).toBe("free");
    expect(res.currentSlot).toBeNull();
    expect(getCurrentStatus([], atMidnight).state).toBe("closed");
  });

  it("date transition: 23:59 vs next-day 00:01 use the correct slot_date", () => {
    const rows: Slot[] = [
      slot({ slot_date: "2026-09-15", start_time: "22:00:00", end_time: "23:00:00", status: "booked" }),
      slot({ slot_date: "2026-09-16", start_time: "00:00:00", end_time: "01:00:00", status: "booked" }),
    ];
    const late = getCurrentStatus(rows, new Date("2026-09-15T22:30:00+05:30"));
    expect(late.state).toBe("booked");
    expect(late.currentSlot?.slot_date).toBe("2026-09-15");
    const nextDay = getCurrentStatus(rows, new Date("2026-09-16T00:30:00+05:30"));
    expect(nextDay.state).toBe("booked");
    expect(nextDay.currentSlot?.slot_date).toBe("2026-09-16");
  });

  it("never reports booked merely because a booked slot exists elsewhere today", () => {
    const rows = [
      slot({ start_time: "06:00:00", end_time: "07:00:00", status: "free" }),
      slot({ start_time: "20:00:00", end_time: "21:00:00", status: "booked" }),
    ];
    const res = getCurrentStatus(rows, new Date("2026-09-15T06:30:00+05:30"));
    expect(res.state).toBe("free");
  });
});
