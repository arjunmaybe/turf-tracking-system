/**
 * Canonical site URL helper.
 * Production canonical comes ONLY from NEXT_PUBLIC_SITE_URL.
 * Never hardcode a future domain; fall back to localhost for dev.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    // Strip trailing slashes for consistent canonical building.
    return raw.replace(/\/+$/, "");
  }
  // Local dev fallback. VERCEL_URL (preview) is intentionally NOT used as
  // canonical so staging never becomes the production canonical.
  return "http://localhost:3000";
}

/** True only for production builds with an explicit production URL. */
export function hasProductionSiteUrl(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim());
}
