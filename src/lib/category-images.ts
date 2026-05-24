import { isBlockedDemoAsset } from "@/lib/tactical-placeholders";
import { resolvePublicAssetSrc } from "@/lib/assets-path";
import type { HagourCategoryKey } from "@/lib/hagour-catalog";

/** Public fallbacks when admin has not uploaded category.imageUrl yet. */
export const FALLBACK_CATEGORY_IMAGES: Record<HagourCategoryKey, string> = {
  belts: "/categories/belts.svg",
  "pistol-holsters": "/categories/pistol-holsters.svg",
  "weapon-holsters": "/categories/weapon-holsters.svg",
  bags: "/categories/bags.svg",
  accessories: "/categories/accessories.svg",
};

export function resolveCategoryBackgroundImage(
  key: HagourCategoryKey,
  imageUrl: string | null | undefined,
): string {
  if (imageUrl?.trim() && !isBlockedDemoAsset(imageUrl)) {
    return resolvePublicAssetSrc(imageUrl.trim());
  }
  return FALLBACK_CATEGORY_IMAGES[key];
}

export function categorySubtitleKey(key: HagourCategoryKey): string {
  return `categorySubtitle_${key.replace(/-/g, "_")}`;
}
