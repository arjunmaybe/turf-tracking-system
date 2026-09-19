import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

/**
 * Guards the non-destructive vinext Cloudflare Workers migration.
 * Static checks only — no deployment is performed by tests.
 */
describe("cloudflare workers migration (static)", () => {
  it("vinext + wrangler configuration exists", () => {
    expect(existsSync(join(root, "vite.config.ts"))).toBe(true);
    expect(existsSync(join(root, "wrangler.jsonc"))).toBe(true);
    expect(read("vite.config.ts")).toContain("vinext");
    const wrangler = read("wrangler.jsonc");
    expect(wrangler).toContain("turf-tracking-system");
    expect(wrangler).toContain("nodejs_compat");
    // Account ID lives exactly once, in the authoritative root config.
    expect(wrangler).toContain('"account_id": "efd3ab870eaef888d1fadede95d50739"');
    // No plaintext vars/secrets and no unneeded bindings in the committed config.
    // (Comments may name the secret to forbid it; what matters is no value
    // or vars entry assigning it.)
    expect(wrangler).not.toMatch(/"vars"\s*:\s*\{[^}]*SUPABASE_SERVICE_ROLE_KEY/);
    expect(wrangler).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/);
    for (const binding of ["d1", "kv_namespaces", "r2", "durable_objects", "queues", "ai:"]) {
      expect(wrangler).not.toContain(`"${binding}"`);
    }
  });

  it("package scripts keep the Next.js workflow and add the Workers workflow", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };
    for (const s of ["dev", "build", "test", "typecheck", "lint"]) {
      expect(pkg.scripts[s]).toBeTruthy();
    }
    expect(pkg.scripts["dev:vinext"]).toContain("vinext");
    expect(pkg.scripts["build:vinext"]).toContain("vinext");
    expect(pkg.scripts["deploy:vinext"]).toContain("vinext");
  });

  it("no secrets committed in worker/deploy configuration", () => {
    for (const f of ["wrangler.jsonc", "vite.config.ts"]) {
      const content = read(f);
      expect(content).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
      // No value assigned to the secret anywhere in committed config
      // (comments naming it to forbid it are fine).
      expect(content).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/);
    }
    // .env.example keeps the placeholder name with an EMPTY value only.
    const example = read(".env.example");
    expect(example).toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(example).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY=\S+/);
    expect(example).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    const gitignore = read(".gitignore");
    expect(gitignore).toContain(".env*"); // covers .env.local
    for (const entry of [".dev.vars", "/dist/", ".wrangler/"]) {
      expect(gitignore).toContain(entry);
    }
  });

  it("browser-read env uses static NEXT_PUBLIC_* access (Vite inlining)", () => {
    // Dynamic process.env[name] cannot be inlined for the browser bundle and
    // resolves to undefined under vinext — browser code must use static
    // member expressions. Server-only modules may use runtime lookups.
    // (Comments stripped: the rule applies to code, not documentation.)
    const client = read("lib/supabaseClient.ts")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(client).not.toMatch(/process\.env\[[^\]]+\]/);
    expect(client).toContain("process.env.NEXT_PUBLIC_SUPABASE_URL");
    expect(client).toContain("process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("application architecture untouched by the migration", () => {
    // No forbidden backend/auth/data layers introduced.
    const pkg = read("package.json");
    for (const dep of ["hono", "better-auth", "firebase", "redis", "opennext"]) {
      expect(pkg.toLowerCase()).not.toContain(`"${dep}"`);
    }
    // Server-only helper still owned by Route Handler + Server Components only.
    for (const f of [
      "app/api/ensure-slots/route.ts",
      "app/page.tsx",
      "app/admin/page.tsx",
    ]) {
      expect(read(f)).toContain("ensureDailySlotsServer");
    }
  });
});
