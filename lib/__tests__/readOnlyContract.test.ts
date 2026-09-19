import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

/**
 * Static security-contract tests for the read-only-public model.
 *
 * These verify the STRUCTURE of the security boundary (privileges, imports,
 * secret placement). They are NOT live Supabase tests: nothing here executes
 * against a real database. Live verification (anon INSERT denied, staff
 * UPDATE allowed, RPC EXECUTE denied, …) still requires real credentials.
 */
describe("public read-only security contract (static)", () => {
  it("anon/authenticated keep SELECT but gain no table writes and no RPC EXECUTE", () => {
    const rls = read("supabase/migrations/0002_rls.sql");
    // SELECT allowed for public roles…
    expect(rls).toContain("turfs_select_public");
    expect(rls).toContain("slots_select_public");
    expect(rls).toContain("to anon, authenticated");
    // …but no INSERT/DELETE policies on turfs/slots, no broad shortcut…
    expect(rls).not.toMatch(/on public\.turfs for (insert|update|delete)/i);
    expect(rls).not.toMatch(/on public\.slots for (insert|delete)/i);
    expect(rls.toLowerCase()).not.toMatch(/for all\s+to authenticated/);
    // …and 0004 revokes the write-capable RPC from both roles.
    const revoke = read("supabase/migrations/0004_revoke_generation_rpc.sql");
    expect(revoke).toMatch(/revoke[\s\S]*anon[\s\S]*authenticated/i);
  });

  it("the RPC body stays generation-only (no overwrite, no arbitrary writes)", () => {
    const rpc = read("supabase/migrations/0003_ensure_slots_rpc.sql");
    expect(rpc).toContain("security definer");
    expect(rpc).toContain("set search_path = public");
    expect(rpc).toContain("turf not found");
    expect(rpc).toContain("date out of range");
    expect(rpc).toContain("'free'");
    expect(rpc).toContain("on conflict (turf_id, slot_date, start_time) do nothing");
    // Idempotent by construction: the function never UPDATEs or DELETEs.
    expect(rpc).not.toMatch(/^\s*update\s/m);
    expect(rpc).not.toMatch(/^\s*delete\s+from/m);
  });

  it("server-only helper owns the secret and the RPC call", () => {
    const helper = read("lib/serverSlots.ts");
    expect(helper).toContain("ensure_daily_slots");
    expect(helper).toContain("SUPABASE_SERVICE_ROLE_KEY");
    // The secret must never hide behind a public variable…
    expect(helper).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE");
    expect(helper).not.toContain("NEXT_PUBLIC_SERVICE");
    // …and the module must declare itself server-only.
    expect(helper).toMatch(/server-only/i);
  });

  it("privileged credentials never reach the client bundle", () => {
    // No NEXT_PUBLIC_ service-role variable may exist anywhere.
    const envExample = read(".env.example");
    expect(envExample).toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(envExample).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE");
    // Every Client Component must avoid the server-only helper AND the secret.
    const clientFiles = [
      "components/PublicDashboard.tsx",
      "components/AdminDashboard.tsx",
      "components/AuthForm.tsx",
      "components/AdminControls.tsx",
      "components/DateSelector.tsx",
    ];
    for (const f of clientFiles) {
      const content = read(f);
      expect(content).not.toContain("serverSlots");
      expect(content).not.toContain("ensureDailySlotsServer");
      expect(content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(content).not.toContain("service_role");
    }
    // No client file may import it either (exact-import scan).
    const components = readdirSync(join(root, "components")).filter((f) =>
      f.endsWith(".tsx"),
    );
    for (const f of components) {
      const content = read(`components/${f}`);
      if (content.includes('"use client"')) {
        expect(content).not.toMatch(/from\s+["']@\/lib\/serverSlots["']/);
      }
    }
  });

  it("all write-capable generation flows through the single server helper", () => {
    for (const f of [
      "app/api/ensure-slots/route.ts",
      "app/page.tsx",
      "app/admin/page.tsx",
    ]) {
      expect(read(f)).toContain("ensureDailySlotsServer");
    }
    // No anon-keyed RPC invocation of the generator remains in app code.
    for (const f of ["app/api/ensure-slots/route.ts", "app/page.tsx", "app/admin/page.tsx"]) {
      expect(read(f)).not.toContain('.rpc("ensure_daily_slots"');
    }
  });
});
