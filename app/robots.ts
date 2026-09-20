import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * robots.txt — the public tracker is indexable ONLY on the real production
 * domain. Every other deployment (local, preview, workers.dev staging) is
 * fully non-indexable so a temporary URL can never become canonical.
 *
 * Rule: indexable sitemap/robots require the shared site URL source
 * (lib/site.ts: SITE_URL, falling back to NEXT_PUBLIC_SITE_URL) to be a
 * real custom domain. Empty, localhost, or *.workers.dev values stay
 * disallowed. Private paths (/admin, /login, /api/) are disallowed
 * everywhere.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const isProductionDomain =
    siteUrl.length > 0 &&
    !/localhost/i.test(siteUrl) &&
    !/\.workers\.dev\/?$/i.test(siteUrl);
  if (!isProductionDomain) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/login", "/api/"],
      },
    ],
  };
}
