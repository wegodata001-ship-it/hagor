import { BRAND_LEGAL_NAME } from "@/lib/brand";
import { isBlockedDemoAsset } from "@/lib/tactical-placeholders";
import { resolvePublicAssetSrc } from "@/lib/assets-path";

/** Premium display name on storefront hero + navbar. */
export const BRAND_DISPLAY = BRAND_LEGAL_NAME;

export const DEFAULT_HERO_IMAGE = "/hagorpgoto.png";

export function resolveHeroImageUrl(
  settingsUrl: string | null | undefined,
  bannerUrl: string | null | undefined,
): string {
  const candidates = [settingsUrl, bannerUrl];
  for (const raw of candidates) {
    if (!raw?.trim() || isBlockedDemoAsset(raw)) continue;
    return resolvePublicAssetSrc(raw.trim());
  }
  return DEFAULT_HERO_IMAGE;
}
