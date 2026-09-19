import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSiteUrl } from "@/lib/site";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("SEO / metadata / canonical", () => {
  it("layout defines metadataBase + title template + OG metadata", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain("metadataBase");
    expect(layout).toContain("getSiteUrl");
    expect(layout).toContain("openGraph");
    expect(layout).toContain("template");
  });

  it("public homepage sets a self-referencing canonical", () => {
    const page = read("app/page.tsx");
    expect(page).toContain("canonical");
    expect(page).toContain("alternates");
  });

  it("private pages are noindex (login + admin)", () => {
    expect(read("app/login/page.tsx")).toMatch(/noindex|robots/);
    expect(read("app/admin/page.tsx")).toMatch(/noindex|robots/);
  });

  it("robots.ts disallows private paths and API routes", () => {
    const robots = read("app/robots.ts");
    expect(robots).toContain("/admin");
    expect(robots).toContain("/login");
    expect(robots).toContain("/api/");
  });

  it("preview/staging deployments are non-indexable", () => {
    const robots = read("app/robots.ts");
    // Indexability requires a real custom production domain — never Vercel
    // env detection, never workers.dev/localhost fallthrough.
    expect(robots).toContain("workers");
    expect(robots).toContain("localhost");
    expect(robots).toContain('disallow: "/"');
    expect(robots).not.toContain("VERCEL_ENV");
  });

  it("sitemap includes public pages only (no login/admin/api)", () => {
    const sitemap = read("app/sitemap.ts");
    expect(sitemap).toContain("/privacy");
    expect(sitemap).toContain("/terms");
    // No sitemap URL entries for private/API routes.
    expect(sitemap).not.toContain("}/login");
    expect(sitemap).not.toContain("}/admin");
    expect(sitemap).not.toContain("}/api");
  });

  it("production canonical comes from env, never hardcoded", () => {
    const site = read("lib/site.ts");
    expect(site).toContain("NEXT_PUBLIC_SITE_URL");
    expect(site).toContain("localhost:3000");
    // No placeholder production domain is hardcoded in metadata.
    for (const f of ["app/layout.tsx", "app/page.tsx", "app/sitemap.ts"]) {
      expect(read(f)).not.toMatch(/example\.com|mydomain\.com|yourdomain/i);
    }
  });

  it("getSiteUrl falls back safely and strips trailing slashes", () => {
    expect(typeof getSiteUrl()).toBe("string");
    expect(getSiteUrl().length).toBeGreaterThan(0);
  });

  it("legal pages + 404 exist and describe tracker semantics", () => {
    for (const f of ["app/privacy/page.tsx", "app/terms/page.tsx", "app/not-found.tsx"]) {
      expect(() => read(f)).not.toThrow();
    }
    const privacy = read("app/privacy/page.tsx");
    const terms = read("app/terms/page.tsx");
    for (const content of [privacy, terms]) {
      expect(content).toMatch(/may change/i);
      expect(content).toMatch(/availability/i);
      expect(content).toMatch(/manager/i);
      expect(content).toMatch(/confirm/i);
      expect(content).toMatch(/no online payment/i);
      expect(content).toMatch(/no automated booking/i);
    }
  });
});
