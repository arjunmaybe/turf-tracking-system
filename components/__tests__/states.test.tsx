import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBanner } from "@/components/StatusBanner";
import { SlotGrid } from "@/components/SlotGrid";
import type { Slot } from "@/types/database";

function makeSlot(status: Slot["status"]): Slot {
  return {
    id: `id-${status}`,
    turf_id: "turf-1",
    slot_date: "2026-09-15",
    start_time: "19:00:00",
    end_time: "20:00:00",
    status,
    updated_at: new Date("2026-09-15T08:00:00+05:30").toISOString(),
    updated_by: null,
  };
}

describe("loading / success / empty / failure / reconnecting states", () => {
  it("loading shows a live status placeholder", () => {
    render(<StatusBanner status={null} loading />);
    expect(screen.getByText(/Checking live status/)).toBeInTheDocument();
  });

  it("empty schedule shows an empty state", () => {
    render(<SlotGrid slots={[]} />);
    expect(screen.getByText(/No slots for this date/)).toBeInTheDocument();
  });

  it("success renders labeled slots (text, not color-only)", () => {
    render(<SlotGrid slots={[makeSlot("free"), makeSlot("booked"), makeSlot("maintenance")]} />);
    expect(screen.getByText("FREE")).toBeInTheDocument();
    expect(screen.getByText("BOOKED")).toBeInTheDocument();
    expect(screen.getByText("MAINTENANCE")).toBeInTheDocument();
  });

  it("status banner exposes booked-until text for screen readers", () => {
    render(
      <StatusBanner
        status={{ state: "booked", currentSlot: null, bookedUntil: "8:00 PM", nextFreeSlot: null }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/Currently BOOKED/);
    expect(screen.getByRole("status")).toHaveTextContent(/Until 8:00 PM/);
  });

  it("slot list uses semantic list markup", () => {
    const { container } = render(<SlotGrid slots={[makeSlot("free")]} />);
    expect(container.querySelector("ul")).not.toBeNull();
    expect(container.querySelector("li")).not.toBeNull();
  });
});
