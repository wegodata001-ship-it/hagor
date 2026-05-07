import "server-only";

function stripTrailingSlash(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Base URL for absolute links (email verification, redirects, etc).
 *
 * Priority:
 * 1) NEXT_PUBLIC_APP_URL (explicit)
 * 2) NEXTAUTH_URL (common in Vercel setups; trailing slash should be removed)
 * 3) VERCEL_URL (auto-provided by Vercel, hostname only)
 * 4) localhost fallback (dev)
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  const nextAuth = process.env.NEXTAUTH_URL?.trim();
  if (nextAuth) return stripTrailingSlash(nextAuth);

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${stripTrailingSlash(vercel)}`;

  return "http://localhost:3000";
}

