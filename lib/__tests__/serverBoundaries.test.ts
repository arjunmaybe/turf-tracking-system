import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("server/client rendering boundaries", () => {
  it("public homepage is a Server Component (no 'use client')", () => {
    const page = read("app/page.tsx");
    expect(page).not.toMatch(/["']use client["']/);
    expect(page).toContain("createServerSupabaseClient");
    // Slot generation goes only through the server-only helper (the browser
    // can never EXECUTE the RPC directly).
    expect(page).toContain("ensureDailySlotsServer");
    expect(page).toContain("lib/serverSlots");
    expect(page).not.toContain('.rpc("ensure_daily_slots"');
    expect(page).not.toContain(".rpc('ensure_daily_slots'");
  });

  it("public interactivity lives in a Client Component with server-provided initial data", () => {
    const client = read("components/PublicDashboard.tsx");
    expect(client).toMatch(/["']use client["']/);
    expect(client).toContain("initialTurfs");
    expect(client).toContain("initialSlots");
    expect(client).toContain("subscribeToSlots");
  });

  it("primary public content is NOT ssr:false and NOT fetch-only-in-useEffect", () => {
    const page = read("app/page.tsx");
    expect(page).not.toContain("ssr:false");
    expect(page).not.toContain("dynamic(");
    // Server fetches before passing to the client dashboard.
    expect(page).toMatch(/\.from\("turfs"\)|\.from\('turfs'\)/);
  });

  it("/admin protects the session + staff server-side", () => {
    const admin = read("app/admin/page.tsx");
    expect(admin).not.toMatch(/["']use client["']/);
    expect(admin).toContain("createServerSupabaseClient");
    expect(admin).toContain("getStaffRole");
    expect(admin).toContain("redirect");
    expect(admin).toContain("Not authorized");
    // Same trusted generation path as the public page — never direct RPC.
    expect(admin).toContain("ensureDailySlotsServer");
    expect(admin).not.toContain('.rpc("ensure_daily_slots"');
  });

  it("admin interactivity stays client-side where appropriate", () => {
    const client = read("components/AdminDashboard.tsx");
    expect(client).toMatch(/["']use client["']/);
    expect(client).toContain("updateSlotStatus");
  });

  it("no service_role in client code and no broad authenticated write policy", () => {
    for (const f of [
      "components/PublicDashboard.tsx",
      "components/AdminDashboard.tsx",
      "lib/supabaseClient.ts",
      "lib/slotsApi.ts",
    ]) {
      const content = read(f);
      // No service-role env usage; comments mentioning the term are fine.
      expect(content).not.toContain("SUPABASE_SERVICE_ROLE");
      expect(content).not.toContain("serviceRole");
      expect(content).not.toMatch(/createClient\([^)]*service/i);
    }
    const rls = read("supabase/migrations/0002_rls.sql");
    expect(rls.toLowerCase()).not.toMatch(/for all\s+to authenticated/);
  });
});
