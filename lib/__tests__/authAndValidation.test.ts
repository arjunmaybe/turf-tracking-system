import { describe, expect, it, vi } from "vitest";
import { resolveAuthState } from "@/lib/auth";
import { updateSlotStatus } from "@/lib/slotsApi";
import { isValidDateString, isValidUuid } from "@/lib/timezone";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("auth expiration behavior", () => {
  it("expired session (no user) resolves to unauthenticated, non-staff", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as never;
    const state = await resolveAuthState(supabase);
    expect(state.userId).toBeNull();
    expect(state.isStaff).toBe(false);
  });

  it("authenticated but staff lookup fails -> not staff (safe default)", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "u1", email: "x@y.z" } },
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    } as never;
    const state = await resolveAuthState(supabase);
    expect(state.userId).toBe("u1");
    expect(state.isStaff).toBe(false);
  });

  it("admin server page redirects unauthenticated and gates non-staff", () => {
    const admin = read("app/admin/page.tsx");
    expect(admin).toContain('redirect("/login?next=/admin")');
    expect(admin).toContain("Not authorized");
    // Server never fetches schedule for non-staff (early return).
    const beforeUnauthorized = admin.split("Not authorized")[0];
    expect(beforeUnauthorized).toContain("getStaffRole");
  });
});

describe("invalid inputs rejected", () => {
  it("rejects malformed turf_id values", () => {
    expect(isValidUuid("not-a-uuid")).toBe(false);
    expect(isValidUuid("")).toBe(false);
    expect(isValidUuid("123")).toBe(false);
    expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects malformed slot_date values", () => {
    expect(isValidDateString("2026-9-5")).toBe(false);
    expect(isValidDateString("not-a-date")).toBe(false);
    expect(isValidDateString("")).toBe(false);
    expect(isValidDateString("2026-09-15")).toBe(true);
  });

  it("updateSlotStatus rejects invalid statuses without touching Supabase", async () => {
    const from = vi.fn();
    const supabase = { auth: { getUser: vi.fn() }, from } as never;
    await expect(updateSlotStatus(supabase, "slot-1", "sold" as never)).rejects.toThrow(
      /Invalid status/,
    );
    expect(from).not.toHaveBeenCalled();
  });

  it("ensure-slots route validates window + sanitizes errors (no raw SQL leak)", () => {
    const route = read("app/api/ensure-slots/route.ts");
    expect(route).toContain("Invalid turf_id");
    expect(route).toContain("Invalid slot_date");
    expect(route).toContain("Date out of range");
    // Must not echo raw driver messages to the client.
    expect(route).not.toContain("Could not ensure slots: ${error.message}");
    expect(route).toContain("Could not load slots. Please try again.");
    expect(route).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(route).not.toMatch(/\.from\("slots"\)\.insert/);
  });
});

describe("repeated submissions are safe", () => {
  it("same-status update short-circuits without a write", async () => {
    const row = {
      id: "slot-1",
      turf_id: "turf-1",
      slot_date: "2026-09-15",
      start_time: "19:00:00",
      end_time: "20:00:00",
      status: "booked",
      updated_at: new Date().toISOString(),
      updated_by: null,
    };
    const from = vi.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
      return chain;
    });
    const supabase = {
      auth: { getUser: vi.fn() },
      from,
    } as unknown as Parameters<typeof updateSlotStatus>[0];
    const res = await updateSlotStatus(supabase, "slot-1", "booked", {
      expectedOldStatus: "booked",
    });
    // Conflict path returns the fresh row without issuing an UPDATE.
    expect(res.slot.status).toBe("booked");
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("admin dashboard guards in-flight slot updates + quick actions", () => {
    const dash = read("components/AdminDashboard.tsx");
    expect(dash).toContain("inFlight");
    expect(dash).toContain("quickBusy");
  });
});
