import { ASSETS_FOLDER } from "./store";
import { assertStoreAssetPath } from "./store-assets";
import { STORAGE_BUCKET } from "./storage";

export function assertAssetPath(pathOrUrl: string): string {
  const normalized = pathOrUrl.trim().replace(/^\/+/, "");
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized;
  if (normalized.startsWith("/")) return normalized;
  return assertStoreAssetPath(normalized);
}

/** Banner images may be storage paths, absolute site paths (/… in public/), or full URLs. */
export function assertBannerImagePath(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) throw new Error("נדרש נתיב תמונה");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return assertAssetPath(trimmed);
}

/** Use for any image that may be Supabase-relative, public static (/…), or absolute URL. */
export function resolvePublicAssetSrc(path: string): string {
  const p = path.trim();
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (p.startsWith("/")) return p;
  return publicStorageUrl(p);
}

export function publicStorageUrl(relativePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return `/api/asset-placeholder?path=${encodeURIComponent(relativePath)}`;
  const trimmed = base.replace(/\/+$/, "");
  return `${trimmed}/storage/v1/object/public/${STORAGE_BUCKET}/${relativePath}`;
}
