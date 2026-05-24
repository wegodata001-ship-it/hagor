import { prisma } from "@/lib/prisma";
import type { CategoryRow } from "@/components/admin/categories-admin-client";

export type AdminLoadResult<T> = {
  data: T;
  error: string | null;
};

const categorySelectBase = {
  id: true,
  parentId: true,
  name_he: true,
  name_ar: true,
  name_en: true,
  description_he: true,
  description_ar: true,
  description_en: true,
  imageUrl: true,
  active: true,
  sortOrder: true,
} as const;

export function formatAdminQueryError(scope: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("optionProfile") || msg.includes("Unknown field")) {
    return `${scope}: עמודה optionProfile חסרה במסד הנתונים. הריצו npx prisma db push בפרודקשן.`;
  }
  if (msg.includes("timeout:")) {
    return `${scope}: השאילתה נכשלה בגלל timeout — חיבור DB איטי. נסו שוב או בדקו DATABASE_URL.`;
  }
  if (msg.includes("max clients") || msg.includes("EMAXCONNSESSION")) {
    return `${scope}: יותר מדי חיבורים למסד הנתונים. השתמשו ב-Supabase Pooler (pgbouncer) ב-DATABASE_URL.`;
  }
  return `${scope}: ${msg.slice(0, 240)}`;
}

export async function loadAdminCategories(storeId: string): Promise<AdminLoadResult<CategoryRow[]>> {
  try {
    let categories: Array<
      {
        id: string;
        parentId: string | null;
        name_he: string;
        name_ar: string;
        name_en: string;
        description_he: string | null;
        description_ar: string | null;
        description_en: string | null;
        imageUrl: string | null;
        active: boolean;
        sortOrder: number;
        optionProfile?: string | null;
      }
    >;

    try {
      categories = await prisma.category.findMany({
        where: { storeId },
        orderBy: { sortOrder: "asc" },
        select: { ...categorySelectBase, optionProfile: true },
      });
    } catch (inner) {
      console.error("admin.categories: retry without optionProfile", inner);
      categories = await prisma.category.findMany({
        where: { storeId },
        orderBy: { sortOrder: "asc" },
        select: categorySelectBase,
      });
    }

    return {
      data: categories.map((c) => ({
        ...c,
        optionProfile: c.optionProfile ?? null,
      })),
      error: null,
    };
  } catch (err) {
    console.error("admin.categories: load failed", err);
    return { data: [], error: formatAdminQueryError("קטגוריות", err) };
  }
}

export async function loadAdminCatalogStats(storeId: string) {
  const [forStoreCats, forStoreProds, totalCats, totalProds, stores] = await Promise.all([
    prisma.category.count({ where: { storeId } }),
    prisma.product.count({ where: { storeId } }),
    prisma.category.count(),
    prisma.product.count(),
    prisma.store.findMany({ select: { id: true, name: true } }),
  ]);

  return {
    configuredStoreId: storeId,
    categoriesForStore: forStoreCats,
    productsForStore: forStoreProds,
    totalCategories: totalCats,
    totalProducts: totalProds,
    stores,
    storeIdMismatch:
      forStoreCats === 0 && forStoreProds === 0 && (totalCats > 0 || totalProds > 0),
  };
}

export type AdminProductCategoryOption = { id: string; label: string };

export async function loadAdminProductCategories(
  storeId: string,
): Promise<AdminLoadResult<AdminProductCategoryOption[]>> {
  try {
    const categories = await prisma.category.findMany({
      where: { storeId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, parentId: true, name_he: true, sortOrder: true },
    });

    const byId = new Map(categories.map((c) => [c.id, c] as const));
    const data = categories
      .slice()
      .sort((a, b) => {
        const aParent = a.parentId ? byId.get(a.parentId) : a;
        const bParent = b.parentId ? byId.get(b.parentId) : b;
        const aKey = aParent?.sortOrder ?? a.sortOrder;
        const bKey = bParent?.sortOrder ?? b.sortOrder;
        if (aKey !== bKey) return aKey - bKey;
        if (!a.parentId && b.parentId) return -1;
        if (a.parentId && !b.parentId) return 1;
        return a.sortOrder - b.sortOrder;
      })
      .map((c) => {
        if (!c.parentId) return { id: c.id, label: c.name_he };
        const parent = byId.get(c.parentId);
        const parentName = parent?.name_he ?? "קטגוריה";
        return { id: c.id, label: `${parentName} > ${c.name_he}` };
      });

    return { data, error: null };
  } catch (err) {
    console.error("admin.products.categories: load failed", err);
    return { data: [], error: formatAdminQueryError("קטגוריות למוצרים", err) };
  }
}

export function storeIdMismatchHint(stats: Awaited<ReturnType<typeof loadAdminCatalogStats>>): string | null {
  if (!stats.storeIdMismatch) return null;
  const storeList = stats.stores.map((s) => s.id).join(", ") || "—";
  return `הנתונים במסד שייכים ל-storeId אחר (לא "${stats.configuredStoreId}"). חנויות במסד: ${storeList}. ודאו ש-NEXT_PUBLIC_STORE_ID תואם ו-Deploy מחדש.`;
}
