import { getStoreId } from "@/lib/store-config";
import { requireAdminSession } from "@/lib/admin-auth";
import { CategoriesAdminClient } from "@/components/admin/categories-admin-client";
import {
  loadAdminCatalogStats,
  loadAdminCategories,
  storeIdMismatchHint,
} from "@/lib/server/admin-catalog-load";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdminSession();
  const storeId = getStoreId();
  const [{ data: serialized, error }, stats] = await Promise.all([
    loadAdminCategories(storeId),
    loadAdminCatalogStats(storeId).catch(() => null),
  ]);
  const hint =
    stats && serialized.length === 0
      ? storeIdMismatchHint(stats) ??
        (stats.totalCategories > 0
          ? `storeId פעיל: "${storeId}" — ${stats.categoriesForStore} קטגוריות לחנות זו, ${stats.totalCategories} בסך הכל במסד.`
          : null)
      : null;

  return <CategoriesAdminClient categories={serialized} loadError={error} loadHint={hint} />;
}
