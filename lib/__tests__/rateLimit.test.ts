import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as ensureSlotsPOST } from "@/app/api/ensure-slots/route";
import { proxy } from "@/proxy";
import {
  __setCloudflareEnvLoaderForTests,
  checkRateLimit,
  clientIpFromHeaders,
  ENSURE_SLOTS_RATE_LIMIT_BINDING,
  ensureSlotsRateLimitKey,
  LOGIN_RATE_LIMIT_BINDING,
  loginRateLimitKey,
  RATE_LIMIT_RETRY_AFTER_SECONDS,
  type CloudflareEnvLoader,
} from "@/lib/rateLimit";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

afterEach(() => {
  __setCloudflareEnvLoaderForTests(null);
});

/** In-memory token bucket: allows `allowedCalls`, then denies. */
function bucketLoader(allowedCalls: number): CloudflareEnvLoader {
  let n = 0;
  const fake = {
    limit: async () => ({ success: ++n <= allowedCalls }),
  };
  return async () => ({
    [LOGIN_RATE_LIMIT_BINDING]: fake,
    [ENSURE_SLOTS_RATE_LIMIT_BINDING]: fake,
  });
}

const allowAll: CloudflareEnvLoader = async () => ({
  [LOGIN_RATE_LIMIT_BINDING]: { limit: async () => ({ success: true }) },
  [ENSURE_SLOTS_RATE_LIMIT_BINDING]: { limit: async () => ({ success: true }) },
});

const denyAll: CloudflareEnvLoader = async () => ({
  [LOGIN_RATE_LIMIT_BINDING]: { limit: async () => ({ success: false }) },
  [ENSURE_SLOTS_RATE_LIMIT_BINDING]: { limit: async () => ({ success: false }) },
});

describe("rate-limit helper (server-only)", () => {
  it("prefers cf-connecting-ip, then x-forwarded-for, then unknown", () => {
    expect(
      clientIpFromHeaders(
        new Headers({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" }),
      ),
    ).toBe("1.2.3.4");
    expect(
      clientIpFromHeaders(new Headers({ "x-forwarded-for": "5.6.7.8, 9.9.9.9" })),
    ).toBe("5.6.7.8");
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });

  it("builds stable route-specific keys (never geo-based)", () => {
    expect(loginRateLimitKey("1.2.3.4")).toBe("login:1.2.3.4");
    expect(ensureSlotsRateLimitKey("1.2.3.4")).toBe("ensure-slots:1.2.3.4");
    expect(loginRateLimitKey("1.2.3.4")).not.toBe(ensureSlotsRateLimitKey("1.2.3.4"));
  });

  it("allows when the binding is missing (fail-open outside Workers)", async () => {
    await expect(
      checkRateLimit("ANYTHING", "k", async () => ({})),
    ).resolves.toEqual({ allowed: true });
    await expect(checkRateLimit("ANYTHING", "k", async () => null)).resolves.toEqual({
      allowed: true,
    });
  });

  it("allows when the binding itself errors (fail-open, never a hard outage)", async () => {
    const loader: CloudflareEnvLoader = async () => ({
      LOGIN_RATE_LIMIT_BINDING: {
        limit: async () => {
          throw new Error("boom");
        },
      },
    });
    await expect(
      checkRateLimit(LOGIN_RATE_LIMIT_BINDING, "login:x", loader),
    ).resolves.toEqual({ allowed: true });
  });

  it("denies once the binding reports the limit exceeded", async () => {
    __setCloudflareEnvLoaderForTests(bucketLoader(2));
    await expect(checkRateLimit(LOGIN_RATE_LIMIT_BINDING, "login:x")).resolves.toEqual({
      allowed: true,
    });
    await expect(checkRateLimit(LOGIN_RATE_LIMIT_BINDING, "login:x")).resolves.toEqual({
      allowed: true,
    });
    await expect(checkRateLimit(LOGIN_RATE_LIMIT_BINDING, "login:x")).resolves.toEqual({
      allowed: false,
    });
  });
});

describe("POST /api/ensure-slots rate limiting", () => {
  const badBody = JSON.stringify({ turf_id: "nope", slot_date: "2026-10-15" });
  const req = (ip?: string) =>
    new Request("http://localhost/api/ensure-slots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ip ? { "cf-connecting-ip": ip } : {}),
      },
      body: badBody,
    });

  it("normal request passes the gate (invalid input still reaches validation)", async () => {
    __setCloudflareEnvLoaderForTests(allowAll);
    const res = await ensureSlotsPOST(req("9.9.9.9"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid turf_id" });
  });

  it("repeated requests eventually receive 429 with Retry-After", async () => {
    __setCloudflareEnvLoaderForTests(bucketLoader(1));
    const first = await ensureSlotsPOST(req("9.9.9.9"));
    expect(first.status).toBe(400); // allowed, reached validation
    const second = await ensureSlotsPOST(req("9.9.9.9"));
    expect(second.status).toBe(429);
    expect(second.headers.get("Retry-After")).toBe(
      String(RATE_LIMIT_RETRY_AFTER_SECONDS),
    );
    const body = (await second.json()) as { error?: string };
    expect(body.error).toMatch(/too many requests/i);
    expect(JSON.stringify(body)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("uuid/date validation is unchanged when under the limit", async () => {
    __setCloudflareEnvLoaderForTests(allowAll);
    const r1 = await ensureSlotsPOST(req());
    expect(r1.status).toBe(400);
    const r2 = await ensureSlotsPOST(
      new Request("http://localhost/api/ensure-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turf_id: "30c29d83-93df-4605-8526-e71247182d0c",
          slot_date: "15-10-2026",
        }),
      }),
    );
    expect(r2.status).toBe(400);
    expect(await r2.json()).toEqual({
      error: "Invalid slot_date (expected YYYY-MM-DD)",
    });
  });
});

describe("proxy /login rate limiting", () => {
  const loginReq = (ip?: string) =>
    new NextRequest(
      new Request("http://localhost/login", {
        headers: ip ? { "cf-connecting-ip": ip } : {},
      }),
    );

  it("normal /login request is allowed through", async () => {
    __setCloudflareEnvLoaderForTests(allowAll);
    const res = await proxy(loginReq("9.9.9.9"));
    expect(res.status).not.toBe(429);
  });

  it("repeated /login requests eventually receive 429 with Retry-After", async () => {
    __setCloudflareEnvLoaderForTests(bucketLoader(1));
    const first = await proxy(loginReq("9.9.9.9"));
    expect(first.status).not.toBe(429);
    const second = await proxy(loginReq("9.9.9.9"));
    expect(second.status).toBe(429);
    expect(second.headers.get("Retry-After")).toBe(
      String(RATE_LIMIT_RETRY_AFTER_SECONDS),
    );
  });

  it("/admin is never rate-limited and keeps its auth behavior", async () => {
    __setCloudflareEnvLoaderForTests(denyAll);
    const res = await proxy(new NextRequest(new Request("http://localhost/admin")));
    // No Supabase env in tests -> falls through to NextResponse.next();
    // the point is /admin never sees the login 429 path.
    expect(res.status).not.toBe(429);
    const source = read("proxy.ts");
    expect(source).toContain('startsWith("/admin")');
    expect(source).toContain('loginUrl.pathname = "/login"');
  });
});

describe("rate-limit boundaries (static)", () => {
  it("public homepage and admin UI do not import rate limiting", () => {
    for (const f of [
      "app/page.tsx",
      "app/admin/page.tsx",
      "components/PublicDashboard.tsx",
      "components/AdminDashboard.tsx",
    ]) {
      expect(read(f)).not.toContain("rateLimit");
    }
  });

  it("no client component touches the binding or Workers env", () => {
    for (const f of [
      "components/PublicDashboard.tsx",
      "components/AdminDashboard.tsx",
      "components/AuthForm.tsx",
      "components/AdminControls.tsx",
      "components/DateSelector.tsx",
    ]) {
      const content = read(f);
      expect(content).not.toContain("rateLimit");
      expect(content).not.toContain("cloudflare:workers");
      expect(content).not.toContain("LOGIN_RATE_LIMIT");
      expect(content).not.toContain("ENSURE_SLOTS_RATE_LIMIT");
      expect(content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    }
  });

  it("wrangler declares exactly the two namespaces with safe limits", () => {
    const w = read("wrangler.jsonc");
    expect(w).toContain('"name": "LOGIN_RATE_LIMIT"');
    expect(w).toContain('"name": "ENSURE_SLOTS_RATE_LIMIT"');
    expect(w).toContain('"namespace_id": "1001"');
    expect(w).toContain('"namespace_id": "1002"');
    expect(w).toContain('"limit": 10');
    expect(w).toContain('"limit": 60');
  });
});
