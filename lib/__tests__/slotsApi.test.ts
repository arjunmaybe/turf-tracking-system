import { describe, expect, it, vi } from "vitest";
import { updateSlotStatus } from "@/lib/slotsApi";
import { getStaffRole } from "@/lib/auth";

function row(status: string) {
  return {
    id: "slot-1",
    turf_id: "turf-1",
    slot_date: "2026-09-15",
    start_time: "19:00:00",
    end_time: "20:00:00",
    status,
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
}

/** Minimal Supabase stub: only the methods updateSlotStatus touches. */
function stubSupabase(scenario: "ok" | "rls-reject" | "conflict-changed") {
  const current = scenario === "conflict-changed" ? row("booked") : row("free");
  const updatedRow = { ...current, status: "booked", updated_by: "staff-1" };

  const readChain = () => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: current, error: null });
    return chain;
  };
  const writeChainOk = () => {
    const chain: Record<string, unknown> = {};
    chain.update = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: updatedRow, error: null });
    return chain;
  };
  const writeChainReject = () => {
    const chain: Record<string, unknown> = {};
    chain.update = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "new row violates row-level security policy",
        code: "42501",
      },
    });
    return chain;
  };

  let slotsCalls = 0;
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "staff-1" } } }),
    },
    from: vi.fn((table: string) => {
      if (table === "slots") {
        slotsCalls += 1;
        // First from("slots") is the pre-read; second is the UPDATE.
        if (slotsCalls === 1) return readChain();
        return scenario === "rls-reject" ? writeChainReject() : writeChainOk();
      }
      // slot_changes insert
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
  } as unknown as Parameters<typeof updateSlotStatus>[0];
}

describe("updateSlotStatus (staff write path)", () => {
  it("happy path: FREE -> BOOKED persists and returns no conflict", async () => {
    const supabase = stubSupabase("ok");
    const res = await updateSlotStatus(supabase, "slot-1", "booked", {
      expectedOldStatus: "free",
    });
    expect(res.conflict).toBe(false);
    expect(res.slot.status).toBe("booked");
  });

  it("detects a race: returns conflict instead of silently overwriting", async () => {
    const supabase = stubSupabase("ok");
    const res = await updateSlotStatus(supabase, "slot-1", "booked", {
      expectedOldStatus: "booked", // caller is stale: row is actually free
    });
    expect(res.conflict).toBe(true);
    expect(res.slot.status).toBe("free");
  });

  it("surfaces RLS rejection as unauthorized (failed update path)", async () => {
    const supabase = stubSupabase("rls-reject");
    await expect(
      updateSlotStatus(supabase, "slot-1", "booked"),
    ).rejects.toThrow(/Not authorized/);
  });

  it("rejects invalid statuses", async () => {
    const supabase = stubSupabase("ok");
    await expect(
      updateSlotStatus(supabase, "slot-1", "sold" as never),
    ).rejects.toThrow(/Invalid status/);
  });
});

describe("staff authorization lookup", () => {
  it("returns null when no staff row exists (unauthorized)", async () => {
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      }),
    } as never;
    await expect(getStaffRole(supabase, "user-1")).resolves.toBeNull();
  });

  it("returns the role for explicit staff", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { role: "owner" }, error: null }),
          }),
        }),
      }),
    } as never;
    await expect(getStaffRole(supabase, "user-1")).resolves.toBe("owner");
  });
});
