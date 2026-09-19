import { describe, expect, it } from "vitest";
import {
  getBusinessDatePlus,
  getBusinessDateString,
  getBusinessMinutes,
  formatTimeDisplay,
  formatSlotRange,
  timeToMinutes,
} from "@/lib/timezone";

describe("timezone (Asia/Kolkata)", () => {
  it("computes the business date in IST regardless of UTC", () => {
    // 2026-09-15 00:30 IST == 2026-09-14 19:00 UTC — must still be the 15th.
    const at = new Date("2026-09-14T19:00:00.000Z");
    expect(getBusinessDateString(at)).toBe("2026-09-15");
  });

  it("computes business minutes for a known IST instant", () => {
    const at = new Date("2026-09-15T14:30:00+05:30");
    expect(getBusinessMinutes(at)).toBe(14 * 60 + 30);
  });

  it("shifts business dates by whole days", () => {
    const at = new Date("2026-09-15T12:00:00+05:30");
    expect(getBusinessDatePlus(0, at)).toBe("2026-09-15");
    expect(getBusinessDatePlus(1, at)).toBe("2026-09-16");
    expect(getBusinessDatePlus(-1, at)).toBe("2026-09-14");
  });

  it("formats times for display", () => {
    expect(formatTimeDisplay("19:00:00")).toBe("7:00 PM");
    expect(formatTimeDisplay("06:00:00")).toBe("6:00 AM");
    expect(formatTimeDisplay("12:00:00")).toBe("12:00 PM");
    expect(formatSlotRange("19:00:00", "20:00:00")).toBe("7:00 PM – 8:00 PM");
  });

  it("parses HH:MM:SS to minutes", () => {
    expect(timeToMinutes("06:00:00")).toBe(360);
    expect(timeToMinutes("23:00:00")).toBe(1380);
  });
});
