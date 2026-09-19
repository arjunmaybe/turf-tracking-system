import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("mobile / UX / accessibility guardrails", () => {
  it("interactive controls use large touch targets", () => {
    for (const f of [
      "components/TurfSelector.tsx",
      "components/DateSelector.tsx",
      "components/AdminControls.tsx",
      "components/WhatsAppButton.tsx",
    ]) {
      expect(read(f)).toMatch(/min-h-1[12]/);
    }
  });

  it("visible focus states exist on interactive elements", () => {
    for (const f of [
      "components/TurfSelector.tsx",
      "components/DateSelector.tsx",
      "components/AdminControls.tsx",
      "components/PublicDashboard.tsx",
    ]) {
      expect(read(f)).toContain("focus-visible");
    }
  });

  it("status is never color-only (text labels present)", () => {
    expect(read("lib/slots.ts")).toContain("FREE");
    expect(read("components/StatusBanner.tsx")).toMatch(/Currently FREE|Currently BOOKED/);
  });

  it("selectors expose accessible names and pressed/selected state", () => {
    expect(read("components/TurfSelector.tsx")).toContain('aria-label="Select turf"');
    expect(read("components/DateSelector.tsx")).toContain('aria-label="Select date"');
    expect(read("components/PublicDashboard.tsx")).toContain("aria-pressed");
  });

  it("no horizontal-overflow-prone fixed widths in dashboard", () => {
    const dash = read("components/PublicDashboard.tsx");
    expect(dash).toContain("max-w-xl");
    expect(dash).not.toMatch(/w-\[.*px\]/);
  });

  it("decorative icon is hidden from assistive tech", () => {
    expect(read("components/TurfHeader.tsx")).toContain('aria-hidden');
  });
});
