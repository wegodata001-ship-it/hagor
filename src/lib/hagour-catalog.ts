/** HAGOUR niche catalog — belts, holsters, bags and accessories. */

export const HAGOUR_CATEGORY_KEYS = [
  "belts",
  "pistol-holsters",
  "weapon-holsters",
  "bags",
  "accessories",
] as const;

export type HagourCategoryKey = (typeof HAGOUR_CATEGORY_KEYS)[number];

export function hagourCategoryId(storeId: string, key: HagourCategoryKey): string {
  return `${storeId}-cat-${key}`;
}

export function hagourCategoryIds(storeId: string): string[] {
  return HAGOUR_CATEGORY_KEYS.map((key) => hagourCategoryId(storeId, key));
}

export function isHagourCategoryId(categoryId: string | null | undefined): boolean {
  if (!categoryId) return false;
  return HAGOUR_CATEGORY_KEYS.some((key) => categoryId.endsWith(`-cat-${key}`));
}

export function filterHagourCategories<T extends { id: string; parentId?: string | null }>(
  categories: T[],
): T[] {
  return categories
    .filter((c) => c.parentId == null && isHagourCategoryId(c.id))
    .sort((a, b) => {
      const ia = HAGOUR_CATEGORY_KEYS.findIndex((k) => a.id.endsWith(`-cat-${k}`));
      const ib = HAGOUR_CATEGORY_KEYS.findIndex((k) => b.id.endsWith(`-cat-${k}`));
      return ia - ib;
    });
}

export function hagourCategoryKeyFromId(categoryId: string | null | undefined): HagourCategoryKey | null {
  if (!categoryId) return null;
  for (const key of HAGOUR_CATEGORY_KEYS) {
    if (categoryId.endsWith(`-cat-${key}`)) return key;
  }
  return null;
}
