/**
 * Canonical site URL helper.
 * Server runtime wins via SITE_URL: Cloudflare Worker `vars` are exposed on
 * process.env at request time (nodejs_compat) and — unlike NEXT_PUBLIC_*,
 * which vinext inlines into every bundle at build time — are never inlined,
 * so the deployed Worker always resolves its own canonical URL.
 * NEXT_PUBLIC_SITE_URL remains only as the build-time/local-dev fallback.
 * Never hardcode a future domain; fall back to localhost for dev.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    // Strip trailing slashes for consistent canonical building.
    return raw.replace(/\/+$/, "");
  }
  // Local dev fallback. VERCEL_URL (preview) is intentionally NOT used as
  // canonical so staging never becomes the production canonical.
  return "http://localhost:3000";
}

/** True only when an explicit production URL is configured. */
export function hasProductionSiteUrl(): boolean {
  return Boolean(
    process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim(),
  );
}
