import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { filterHagourCategories, hagourCategoryIds } from "@/lib/hagour-catalog";

/** Deduped per request — header + footer share one DB round-trip each. */
export const getCachedStoreContactSettings = cache(async (storeId: string) => {
  return prisma.storeSettings.findUnique({
    where: { storeId },
    select: {
      storePhone: true,
      whatsappPhone: true,
      supportEmail: true,
      logoUrl: true,
    },
  });
});

export const getCachedNavCategories = cache(async (storeId: string) => {
  const categories = await prisma.category.findMany({
    where: { storeId, active: true, parentId: null, id: { in: hagourCategoryIds(storeId) } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, parentId: true, name_he: true, name_ar: true, name_en: true },
  });
  return filterHagourCategories(categories);
});
