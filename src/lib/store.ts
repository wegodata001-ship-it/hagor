/**
 * Public (NEXT_PUBLIC_*) store identity for both server + client bundles.
 *
 * IMPORTANT:
 * - Never throw for NEXT_PUBLIC_* at module import time (client bundle can crash).
 * - Use safe fallbacks for local dev.
 * - Secrets / server-only required env vars belong in `src/lib/server-env.ts`.
 */
const getPublicEnv = (key: string, fallback: string) => {
  const value = process.env[key];
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : fallback;
};

export const STORE_ID = getPublicEnv("NEXT_PUBLIC_STORE_ID", "hagor");
export const STORE_SLUG = getPublicEnv("NEXT_PUBLIC_STORE_SLUG", STORE_ID);

const ASSETS_FOLDER_RAW = getPublicEnv("NEXT_PUBLIC_ASSETS_FOLDER", STORE_SLUG);
/** Normalized folder segment for Supabase paths (no leading/trailing slashes). */
export const ASSETS_FOLDER = ASSETS_FOLDER_RAW.replace(/^\/+|\/+$/g, "");

export const SITE_NAME = getPublicEnv("NEXT_PUBLIC_SITE_NAME", "HAGOR BY WAEL");
export const STORE_PHONE = getPublicEnv("NEXT_PUBLIC_STORE_PHONE", "");
export const WHATSAPP_PHONE = getPublicEnv("NEXT_PUBLIC_WHATSAPP_PHONE", "");

export const storeIdentity = {
  storeId: STORE_ID,
  storeSlug: STORE_SLUG,
  assetsFolder: ASSETS_FOLDER,
  siteName: SITE_NAME,
  storePhone: STORE_PHONE,
  whatsappPhone: WHATSAPP_PHONE,
};

/** @deprecated prefer STORE_ID */
export function getStoreId(): string {
  return STORE_ID;
}

/** @deprecated prefer STORE_SLUG */
export function getStoreSlug(): string {
  return STORE_SLUG;
}

/** @deprecated prefer ASSETS_FOLDER */
export function getAssetsFolder(): string {
  return ASSETS_FOLDER;
}

/** @deprecated prefer SITE_NAME */
export function getSiteName(): string {
  return SITE_NAME;
}
