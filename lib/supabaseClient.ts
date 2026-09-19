import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * NOTE (Workers/vinext): public env must be read via STATIC
 * `process.env.NEXT_PUBLIC_*` member expressions. Vite inlines those at
 * build time for the browser bundle; dynamic `process.env[name]` lookups
 * cannot be inlined and resolve to undefined in the browser.
 */
export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing environment variable NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and set it.",
    );
  }
  return { url, anonKey };
}

/** Browser-side client (anon key only — never service_role). Read + staff writes via RLS. */
export function createClient(): SupabaseClient {
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient(url, anonKey);
}

/** True when env is configured (lets UI show setup guidance instead of crashing). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
