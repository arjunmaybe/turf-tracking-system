import { describe, expect, it } from "vitest";
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  countByStatus,
  generateSlotsForDate,
  getCurrentStatus,
  mergeWithGenerated,
  sortSlots,
} from "@/lib/slots";
import type { Slot } from "@/types/database";

const turf = {
  open_time: "06:00:00",
  close_time: "23:00:00",
  slot_duration_minutes: 60,
};

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

describe("generateSlotsForDate", () => {
  it("generates 06-07 … 22-23 for 06:00–23:00 @ 60min", () => {
    const defs = generateSlotsForDate(turf, "2026-09-15");
    expect(defs).toHaveLength(17);
    expect(defs[0]).toEqual({ start_time: "06:00:00", end_time: "07:00:00" });
    expect(defs[defs.length - 1]).toEqual({
      start_time: "22:00:00",
      end_time: "23:00:00",
    });
  });

  it("supports 30-minute grids without duplicates", () => {
    const defs = generateSlotsForDate(
      { open_time: "18:00:00", close_time: "20:00:00", slot_duration_minutes: 30 },
      "2026-09-15",
    );
    expect(defs).toEqual([
      { start_time: "18:00:00", end_time: "18:30:00" },
      { start_time: "18:30:00", end_time: "19:00:00" },
      { start_time: "19:00:00", end_time: "19:30:00" },
      { start_time: "19:30:00", end_time: "20:00:00" },
    ]);
  });

  it("rejects invalid settings", () => {
    expect(() =>
      generateSlotsForDate({ ...turf, slot_duration_minutes: 0 }, "2026-09-15"),
    ).toThrow();
    expect(() =>
      generateSlotsForDate(
        { ...turf, open_time: "23:00:00", close_time: "06:00:00" },
        "2026-09-15",
      ),
    ).toThrow();
  });
});

describe("getCurrentStatus", () => {
  const day = [
    slot({ start_time: "13:00:00", end_time: "14:00:00", status: "free" }),
    slot({ start_time: "14:00:00", end_time: "15:00:00", status: "booked" }),
    slot({ start_time: "15:00:00", end_time: "16:00:00", status: "free" }),
  ];

  it("reports BOOKED with end time when now is inside a booked slot", () => {
    const at = new Date("2026-09-15T14:30:00+05:30");
    const res = getCurrentStatus(day, at);
    expect(res.state).toBe("booked");
    expect(res.bookedUntil).toBe("3:00 PM");
    expect(res.currentSlot?.start_time).toBe("14:00:00");
  });

  it("does NOT use 'first booked slot' — a free now is FREE even with later bookings", () => {
    const at = new Date("2026-09-15T13:15:00+05:30");
    const res = getCurrentStatus(day, at);
    expect(res.state).toBe("free");
    expect(res.currentSlot?.start_time).toBe("13:00:00");
  });

  it("reports FREE when now is outside all booked slots", () => {
    const at = new Date("2026-09-15T15:30:00+05:30");
    const res = getCurrentStatus(day, at);
    expect(res.state).toBe("free");
  });

  it("reports maintenance when the active slot is under maintenance", () => {
    const rows = [
      slot({ start_time: "14:00:00", end_time: "15:00:00", status: "maintenance" }),
    ];
    const res = getCurrentStatus(rows, new Date("2026-09-15T14:10:00+05:30"));
    expect(res.state).toBe("maintenance");
  });

  it("ignores other dates when computing today", () => {
    const rows = [
      slot({ slot_date: "2026-09-16", start_time: "14:00:00", end_time: "15:00:00", status: "booked" }),
    ];
    const res = getCurrentStatus(rows, new Date("2026-09-15T14:10:00+05:30"));
    expect(res.state).toBe("closed");
    expect(res.currentSlot).toBeNull();
  });
});

describe("sortSlots / mergeWithGenerated / counts", () => {
  it("sorts chronologically", () => {
    const rows = [
      slot({ start_time: "15:00:00", end_time: "16:00:00" }),
      slot({ start_time: "13:00:00", end_time: "14:00:00" }),
    ];
    expect(sortSlots(rows).map((s) => s.start_time)).toEqual(["13:00:00", "15:00:00"]);
  });

  it("keeps existing rows and fills only missing defs", () => {
    const existing = [slot({ start_time: "06:00:00", end_time: "07:00:00", status: "booked" })];
    const merged = mergeWithGenerated(
      existing,
      [
        { start_time: "06:00:00", end_time: "07:00:00" },
        { start_time: "07:00:00", end_time: "08:00:00" },
      ],
      "turf-1",
      "2026-09-15",
    );
    expect(merged[0].status).toBe("booked");
    expect(merged[1].status).toBe("free");
  });

  it("counts by status", () => {
    expect(
      countByStatus([
        slot({ start_time: "06:00:00", end_time: "07:00:00", status: "free" }),
        slot({ start_time: "07:00:00", end_time: "08:00:00", status: "booked" }),
        slot({ start_time: "08:00:00", end_time: "09:00:00", status: "maintenance" }),
      ]),
    ).toEqual({ free: 1, booked: 1, maintenance: 1 });
  });
});

describe("WhatsApp contact", () => {
  it("builds a dynamic per-slot message", () => {
    const msg = buildWhatsAppMessage("Turf 1", "2026-09-15", "19:00:00", "20:00:00", "today");
    expect(msg).toContain("7:00 PM – 8:00 PM");
    expect(msg).toContain("Turf 1");
  });

  it("builds a wa.me URL and rejects missing numbers", () => {
    expect(buildWhatsAppUrl("911234567890", "hi")).toBe(
      "https://wa.me/911234567890?text=hi",
    );
    expect(buildWhatsAppUrl(null, "hi")).toBeNull();
  });
});
