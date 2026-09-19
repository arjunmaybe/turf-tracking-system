/**
 * SERVER-ONLY Cloudflare Workers rate limiting.
 *
 * Two sensitive routes are protected, nothing else:
 * - GET /login (via proxy.ts) — LOGIN_RATE_LIMIT, 10 req/min/IP
 * - POST /api/ensure-slots (via its Route Handler) — ENSURE_SLOTS_RATE_LIMIT,
 *   60 req/min/IP (a user browsing 7 dates x 2 turfs fires ~14 quick calls)
 *
 * HARD RULES:
 * - NEVER import this file from a Client Component ("use client") or any
 *   browser-bundled code. Allowed importers: proxy.ts and server-side Route
 *   Handlers only. Contract tests scan client files for this import.
 * - The `cloudflare:workers` module exists ONLY in the Workers runtime, so it
 *   is loaded through an indirect dynamic import that bundlers cannot trace
 *   (keeps `next dev` / `next build` / vitest working unchanged).
 * - Fail-open outside Workers: when the binding is missing or errors, the
 *   request is allowed. Rate limiting is abuse protection, never the security
 *   boundary (Supabase Auth + RLS remain the enforcement).
 * - Keys are route-scoped + IP-scoped (`login:<ip>`), never geography-based.
 * - Limits are per Cloudflare location (platform behavior), hence approximate.
 */

export const LOGIN_RATE_LIMIT_BINDING = "LOGIN_RATE_LIMIT";
export const ENSURE_SLOTS_RATE_LIMIT_BINDING = "ENSURE_SLOTS_RATE_LIMIT";

/** Sent as `Retry-After` with every 429 (matches the 60s binding windows). */
export const RATE_LIMIT_RETRY_AFTER_SECONDS = 60;

export interface RateLimitOutcome {
  success: boolean;
}

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<RateLimitOutcome>;
}

export type CloudflareEnvLoader = () => Promise<Record<string, unknown> | null>;

// Indirect specifier: keeps bundlers (Turbopack/Vite) from statically tracing
// the Workers-only module, so Node runtimes keep working unchanged.
const CLOUDFLARE_WORKERS_SPECIFIER: string = "cloudflare:workers";

async function loadCloudflareEnv(): Promise<Record<string, unknown> | null> {
  try {
    const mod = (await import(
      CLOUDFLARE_WORKERS_SPECIFIER
    )) as unknown as { env?: unknown };
    if (mod && typeof mod === "object" && mod.env !== null && typeof mod.env === "object") {
      return mod.env as Record<string, unknown>;
    }
    return null;
  } catch {
    // Node.js / test runtimes: the module does not exist.
    return null;
  }
}

function asRateLimitBinding(value: unknown): RateLimitBinding | null {
  if (
    value !== null &&
    typeof value === "object" &&
    "limit" in value &&
    typeof (value as { limit?: unknown }).limit === "function"
  ) {
    return value as RateLimitBinding;
  }
  return null;
}

/** Client IP for per-IP keys. Prefers Cloudflare's header; never geo-based. */
export function clientIpFromHeaders(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return "unknown";
}

export function loginRateLimitKey(ip: string): string {
  return `login:${ip}`;
}

export function ensureSlotsRateLimitKey(ip: string): string {
  return `ensure-slots:${ip}`;
}

export interface RateLimitDecision {
  /** False only when a configured binding reports the limit exceeded. */
  allowed: boolean;
}

// Test-only seam (vitest cannot intercept the indirect dynamic import, so
// tests override the loader instead). Always reset to null after use.
// Never imported by client code — this module is server-only.
let testEnvLoader: CloudflareEnvLoader | null = null;

/** Test-only: override the Workers env loader. Pass null to reset. */
export function __setCloudflareEnvLoaderForTests(
  loader: CloudflareEnvLoader | null,
): void {
  testEnvLoader = loader;
}

/**
 * Consume one token for `key` on `bindingName`.
 * Returns allowed:true when the binding is absent/unavailable (fail-open).
 * `loadEnv` is injectable so tests can supply fake bindings.
 */
export async function checkRateLimit(
  bindingName: string,
  key: string,
  loadEnv: CloudflareEnvLoader = testEnvLoader ?? loadCloudflareEnv,
): Promise<RateLimitDecision> {
  try {
    const env = await loadEnv();
    const binding = env ? asRateLimitBinding(env[bindingName]) : null;
    if (!binding) return { allowed: true };
    const outcome = await binding.limit({ key });
    if (!outcome || outcome.success !== false) return { allowed: true };
    return { allowed: false };
  } catch {
    return { allowed: true };
  }
}
