import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("Next.js 16 proxy convention", () => {
  it("proxy.ts exists at the project root and middleware.ts is gone", () => {
    expect(existsSync(join(root, "proxy.ts"))).toBe(true);
    expect(existsSync(join(root, "middleware.ts"))).toBe(false);
  });

  it("exports the proxy function (not middleware) with the same matcher", () => {
    const proxy = read("proxy.ts");
    expect(proxy).toMatch(/export async function proxy/);
    expect(proxy).not.toMatch(/export (async )?function middleware/);
    expect(proxy).toContain('matcher: ["/admin/:path*", "/login"]');
  });

  it("preserves Supabase session refresh and the /admin auth redirect", () => {
    const proxy = read("proxy.ts");
    expect(proxy).toContain("createServerClient");
    expect(proxy).toContain("supabase.auth.getUser()");
    expect(proxy).toContain('startsWith("/admin")');
    expect(proxy).toContain('loginUrl.pathname = "/login"');
    expect(proxy).toContain('searchParams.set("next", "/admin")');
    // No staff logic here by design: staff membership is checked in the
    // /admin Server Component and enforced by RLS.
    expect(proxy).not.toContain("is_staff");
    expect(proxy).not.toContain("service_role");
  });
});
