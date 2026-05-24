import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { requireAdminSession } from "@/lib/admin-auth";
import type { CategoryRow } from "@/components/admin/categories-admin-client";
import { CategoriesAdminClient } from "@/components/admin/categories-admin-client";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdminSession();
  const storeId = getStoreId();
  const serialized: CategoryRow[] = await safeQuery(
    "admin.categories",
    async () => {
      const categories = await prisma.category.findMany({
        where: { storeId },
        orderBy: { sortOrder: "asc" },
      });

      return categories.map((c) => ({
        id: c.id,
        parentId: c.parentId,
        name_he: c.name_he,
        name_ar: c.name_ar,
        name_en: c.name_en,
        description_he: c.description_he,
        description_ar: c.description_ar,
        description_en: c.description_en,
        imageUrl: c.imageUrl,
        active: c.active,
        sortOrder: c.sortOrder,
        optionProfile: c.optionProfile,
      }));
    },
    [],
    { timeoutMs: 25_000 },
  );

  return <CategoriesAdminClient categories={serialized} />;
}
