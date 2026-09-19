import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SlotCard } from "@/components/SlotCard";
import { StatusBanner } from "@/components/StatusBanner";
import { DateSelector } from "@/components/DateSelector";
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

describe("SlotCard", () => {
  it.each(["free", "booked", "maintenance"] as const)(
    "renders %s state with time range and label",
    (status) => {
      render(<SlotCard slot={makeSlot(status)} />);
      expect(screen.getByTestId(`slot-card-${status}`)).toBeInTheDocument();
      expect(screen.getByText("7:00 PM – 8:00 PM")).toBeInTheDocument();
    },
  );
});

describe("StatusBanner", () => {
  it("shows FREE", () => {
    render(
      <StatusBanner
        status={{ state: "free", currentSlot: null, bookedUntil: null, nextFreeSlot: null }}
      />,
    );
    expect(screen.getByText("Turf is Currently FREE")).toBeInTheDocument();
  });

  it("shows BOOKED until end time", () => {
    render(
      <StatusBanner
        status={{ state: "booked", currentSlot: null, bookedUntil: "8:00 PM", nextFreeSlot: null }}
      />,
    );
    expect(screen.getByText(/Currently BOOKED/)).toBeInTheDocument();
    expect(screen.getByText(/Until 8:00 PM/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<StatusBanner status={null} loading />);
    expect(screen.getByText(/Checking live status/)).toBeInTheDocument();
  });
});

describe("DateSelector", () => {
  it("labels today/tomorrow and selects dates", () => {
    const onSelect = vi.fn();
    render(
      <DateSelector
        dates={["2026-09-15", "2026-09-16", "2026-09-17"]}
        selected="2026-09-15"
        todayStr="2026-09-15"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    screen.getByText("Tomorrow").click();
    expect(onSelect).toHaveBeenCalledWith("2026-09-16");
  });
});
