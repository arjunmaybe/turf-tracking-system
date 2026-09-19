import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("database migrations + RLS contract", () => {
  it("0001 defines tables, checks, unique constraint and indexes", () => {
    const sql = read("supabase/migrations/0001_schema.sql");
    for (const table of ["create table", "turfs", "slots", "staff", "slot_changes"]) {
      expect(sql).toMatch(new RegExp(table, "i"));
    }
    expect(sql).toContain("status in ('free', 'booked', 'maintenance')");
    expect(sql.toLowerCase()).toContain("unique");
    expect(sql).toContain("(turf_id, slot_date, start_time)");
    expect(sql).toContain("slots_turf_date_idx");
    expect(sql).toContain("end_time > start_time");
    expect(sql).toContain("role in ('staff', 'owner')");
  });

  it("0002 enforces public read-only + explicit staff gate (no broad write policy)", () => {
    const sql = read("supabase/migrations/0002_rls.sql");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("slots_select_public");
    expect(sql).toContain("to anon, authenticated");
    expect(sql).toContain("for select");
    // Staff-only update gated on is_staff().
    expect(sql).toContain("slots_update_staff");
    expect(sql).toContain("is_staff()");
    // Must NOT contain a catch-all FOR ALL TO authenticated write policy.
    expect(sql.toLowerCase()).not.toMatch(/for all\s+to authenticated/);
    // No INSERT policy on slots table (generation goes via RPC only).
    expect(sql).not.toMatch(/create policy \S*slots\S*insert/i);
    expect(sql).not.toMatch(/on public\.slots for insert/i);
    // Audit inserts scoped to the calling staff user.
    expect(sql).toContain("slot_changes_insert_staff");
    expect(sql).toContain("user_id = auth.uid()");
  });

  it("0003 provides a tightly-scoped SECURITY DEFINER RPC (no anon table INSERT)", () => {
    const sql = read("supabase/migrations/0003_ensure_slots_rpc.sql");
    expect(sql).toContain("ensure_daily_slots");
    expect(sql).toContain("security definer");
    expect(sql).toContain("on conflict (turf_id, slot_date, start_time) do nothing");
    expect(sql).toContain("'free'");
    expect(sql).toContain("date out of range");
    expect(sql).toContain("grant execute");
  });

  it("seed creates exactly the 2 football turfs", () => {
    const sql = read("supabase/seed.sql");
    expect(sql).toContain("Turf 1");
    expect(sql).toContain("Turf 2");
    // Rerun-safe: guarded inserts so applying the seed twice keeps 2 turfs.
    expect(sql).toMatch(/where not exists/i);
  });

  it("0004 revokes direct RPC EXECUTE from anon/authenticated (public read-only)", () => {
    const sql = read("supabase/migrations/0004_revoke_generation_rpc.sql");
    expect(sql).toContain("ensure_daily_slots");
    expect(sql).toMatch(/revoke/i);
    expect(sql).toContain("anon");
    expect(sql).toContain("authenticated");
    // Only the trusted server path (service_role) may invoke generation.
    expect(sql).toMatch(/grant execute[^;]*to service_role/i);
    // No grant back to anon/authenticated after the revoke.
    const afterRevoke = sql.slice(sql.search(/revoke/i));
    expect(afterRevoke).not.toMatch(/grant execute[^;]*to (anon|authenticated)/i);
  });

  it("ensure-slots API route generates only via the server-only helper", () => {
    const route = read("app/api/ensure-slots/route.ts");
    expect(route).toContain("ensureDailySlotsServer");
    expect(route).toContain("lib/serverSlots");
    expect(route).not.toContain("createServerSupabaseClient");
    expect(route).not.toContain('.rpc("ensure_daily_slots"');
    expect(route).toContain("Invalid turf_id");
    expect(route).toContain("Invalid slot_date");
    expect(route).not.toMatch(/\.from\("slots"\)\.insert/);
    // The secret itself lives only in the server-only helper, never the route.
    expect(route).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    // PostgREST failures may be plain { message } objects — the route must
    // still map known cases (e.g. unknown turf -> 400) instead of 500.
    expect(route).toMatch(/"message" in err/);
  });
});
