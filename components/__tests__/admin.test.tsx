import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminSlotRow } from "@/components/AdminControls";
import type { Slot } from "@/types/database";

function makeSlot(overrides: Partial<Slot> = {}): Slot {
  return {
    id: "slot-1",
    turf_id: "turf-1",
    slot_date: "2026-09-15",
    start_time: "19:00:00",
    end_time: "20:00:00",
    status: "free",
    updated_at: new Date("2026-09-15T08:00:00+05:30").toISOString(),
    updated_by: null,
    ...overrides,
  };
}

describe("AdminSlotRow", () => {
  it("offers all three statuses and marks the active one", () => {
    render(<AdminSlotRow slot={makeSlot({ status: "booked" })} onChange={() => {}} />);
    expect(screen.getByText("● BOOKED")).toBeInTheDocument();
    expect(screen.getByText("FREE")).toBeInTheDocument();
    expect(screen.getByText("MAINTENANCE")).toBeInTheDocument();
  });

  it("calls onChange immediately for current slots", () => {
    const onChange = vi.fn();
    render(<AdminSlotRow slot={makeSlot({ status: "free" })} onChange={onChange} />);
    fireEvent.click(screen.getByText("BOOKED"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: "slot-1" }), "booked");
  });

  it("asks for confirmation before changing a past slot", () => {
    const onChange = vi.fn();
    render(
      <AdminSlotRow slot={makeSlot({ status: "free" })} isPast onChange={onChange} />,
    );
    fireEvent.click(screen.getByText("BOOKED"));
    // First tap only arms confirmation.
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByText("BOOKED"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("disables actions while busy", () => {
    render(<AdminSlotRow slot={makeSlot()} busy onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /FREE/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "BOOKED" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "MAINTENANCE" })).toBeDisabled();
  });
});
