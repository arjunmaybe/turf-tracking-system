import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  checkRateLimit,
  clientIpFromHeaders,
  LOGIN_RATE_LIMIT_BINDING,
  loginRateLimitKey,
  RATE_LIMIT_RETRY_AFTER_SECONDS,
} from "@/lib/rateLimit";

/**
 * Refresh the Supabase session on every request and guard /admin.
 * Unauthenticated -> /login. Staff membership itself is checked in the
 * page (and enforced by RLS) so unauthorized users get a clear state.
 *
 * Abuse protection (Workers only, fail-open elsewhere): repeated /login
 * loads from one IP eventually receive 429. /admin and all public routes
 * are intentionally NOT limited here.
 */
export async function proxy(req: NextRequest) {
  if (
    req.nextUrl.pathname === "/login" ||
    req.nextUrl.pathname.startsWith("/login/")
  ) {
    const { allowed } = await checkRateLimit(
      LOGIN_RATE_LIMIT_BINDING,
      loginRateLimitKey(clientIpFromHeaders(req.headers)),
    );
    if (!allowed) {
      return new NextResponse(
        "Too many login attempts. Please try again shortly.",
        {
          status: 429,
          headers: {
            "Content-Type": "text/plain",
            "Retry-After": String(RATE_LIMIT_RETRY_AFTER_SECONDS),
          },
        },
      );
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          req.cookies.set(name, value),
        );
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (req.nextUrl.pathname.startsWith("/admin") && !user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", "/admin");
    return NextResponse.redirect(loginUrl);
  }
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
