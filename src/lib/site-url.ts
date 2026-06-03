import "server-only";

import { BRAND_LEGAL_NAME } from "@/lib/brand";

/** Official production origin — never localhost / vercel in prod emails or SEO. */
export const PRODUCTION_SITE_URL = "https://hagourbywael.com";

export const SITE_SEO_TITLE = BRAND_LEGAL_NAME;
export const SITE_SEO_DESCRIPTION =
  "ציוד טקטי מקצועי, חגורות מבצעיות, נרתיקים ותיקים לאנשי ביטחון, מאבטחים ואנשי שטח.";

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h.endsWith(".vercel.app") || h === "127.0.0.1";
}

function normalizeCandidate(raw: string | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  try {
    const withProto = v.startsWith("http") ? v : `https://${v}`;
    const u = new URL(withProto);
    if (process.env.NODE_ENV === "production" && isBlockedHost(u.hostname)) {
      return null;
    }
    return stripTrailingSlash(u.origin);
  } catch {
    return null;
  }
}

/**
 * Canonical site URL for emails, webhooks, sitemap, metadata, and absolute links.
 *
 * Priority: NEXT_PUBLIC_SITE_URL → NEXT_PUBLIC_APP_URL → NEXTAUTH_URL
 * Production never uses VERCEL_URL or localhost.
 */
export function getSiteUrl(): string {
  for (const key of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL"] as const) {
    const resolved = normalizeCandidate(process.env[key]);
    if (resolved) return resolved;
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }

  return "http://localhost:3000";
}

/** @deprecated Use getSiteUrl — kept for existing imports */
export function getAppUrl(): string {
  return getSiteUrl();
}
