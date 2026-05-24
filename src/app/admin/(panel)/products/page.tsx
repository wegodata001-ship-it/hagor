import { getStoreId } from "@/lib/store-config";
import { requireAdminSession } from "@/lib/admin-auth";
import { ProductsAdminClient } from "@/components/admin/products-admin-client";
import type { ProductRow } from "@/components/admin/products-admin-client";
import {
  normalizeGalleryPreset,
  type GalleryDisplayConfig,
} from "@/lib/product-gallery-display";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/server/safe-query";
import {
  formatAdminQueryError,
  loadAdminCatalogStats,
  loadAdminProductCategories,
  storeIdMismatchHint,
} from "@/lib/server/admin-catalog-load";

export const dynamic = "force-dynamic";

const DEFAULT_GALLERY: GalleryDisplayConfig = {
  preset: "medium",
  maxHeightPx: null,
  maxWidthPx: null,
};

const productListSelect = {
  id: true,
  sku: true,
  name_he: true,
  name_ar: true,
  name_en: true,
  description_he: true,
  description_ar: true,
  description_en: true,
  price: true,
  oldPrice: true,
  discountPercent: true,
  stock: true,
  active: true,
  featured: true,
  categoryId: true,
  category: { select: { name_he: true } },
  images: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, url: true, isMain: true, sortOrder: true },
  },
  variantGroups: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      name: true,
      sortOrder: true,
      options: {
        orderBy: { sortOrder: "asc" as const },
        select: {
          id: true,
          value: true,
          priceAdd: true,
          stock: true,
          sku: true,
          image: true,
          isDefault: true,
          sortOrder: true,
        },
      },
    },
  },
  relatedProducts: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      sortOrder: true,
      relatedProduct: {
        select: {
          id: true,
          name_he: true,
          name_ar: true,
          name_en: true,
          price: true,
          images: {
            orderBy: { sortOrder: "asc" as const },
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  },
} as const;

async function loadProductsForAdmin(storeId: string): Promise<{ data: ProductRow[]; error: string | null }> {
  try {
    const products = await prisma.product.findMany({
      where: { storeId },
      orderBy: { updatedAt: "desc" },
      select: productListSelect,
    });

    return {
      data: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name_he: p.name_he,
        name_ar: p.name_ar,
        name_en: p.name_en,
        description_he: p.description_he,
        description_ar: p.description_ar,
        description_en: p.description_en,
        price: Number(p.price),
        oldPrice: p.oldPrice != null ? Number(p.oldPrice) : null,
        discountPercent: p.discountPercent ?? null,
        stock: p.stock,
        active: p.active,
        featured: p.featured,
        categoryId: p.categoryId,
        category: { name_he: p.category.name_he },
        images: p.images.map((im) => ({
          id: im.id,
          url: im.url,
          isMain: im.isMain,
          sortOrder: im.sortOrder,
        })),
        variantGroups: p.variantGroups.map((g) => ({
          id: g.id,
          name: g.name,
          sortOrder: g.sortOrder,
          options: g.options.map((o) => ({
            id: o.id,
            value: o.value,
            priceAdd: Number(o.priceAdd),
            stock: o.stock ?? null,
            sku: o.sku ?? null,
            image: o.image ?? null,
            isDefault: o.isDefault,
            sortOrder: o.sortOrder,
          })),
        })),
        relatedProducts: p.relatedProducts.map((rp) => ({
          id: rp.relatedProduct.id,
          name_he: rp.relatedProduct.name_he,
          name_ar: rp.relatedProduct.name_ar,
          name_en: rp.relatedProduct.name_en,
          price: Number(rp.relatedProduct.price),
          image: rp.relatedProduct.images[0]?.url ?? null,
          sortOrder: rp.sortOrder,
        })),
      })) as ProductRow[],
      error: null,
    };
  } catch (err) {
    console.error("admin.products.list: load failed", err);
    return { data: [], error: formatAdminQueryError("מוצרים", err) };
  }
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ add?: string }>;
}) {
  await requireAdminSession();
  const storeId = getStoreId();
  const sp = (await searchParams) ?? {};

  const [catsResult, galleryDisplay, productsResult, stats] = await Promise.all([
    loadAdminProductCategories(storeId),
    safeQuery(
      "admin.products.gallery_settings",
      async () => {
        const storeSettings = await prisma.storeSettings.findUnique({
          where: { storeId },
          select: {
            productGalleryPreset: true,
            productGalleryMaxHeightPx: true,
            productGalleryMaxWidthPx: true,
          },
        });
        return {
          preset: normalizeGalleryPreset(storeSettings?.productGalleryPreset),
          maxHeightPx: storeSettings?.productGalleryMaxHeightPx ?? null,
          maxWidthPx: storeSettings?.productGalleryMaxWidthPx ?? null,
        } satisfies GalleryDisplayConfig;
      },
      DEFAULT_GALLERY,
      { timeoutMs: 8_000 },
    ),
    loadProductsForAdmin(storeId),
    loadAdminCatalogStats(storeId).catch(() => null),
  ]);

  const loadError = [catsResult.error, productsResult.error].filter(Boolean).join(" · ") || null;
  const hint =
    stats && productsResult.data.length === 0 && catsResult.data.length === 0
      ? storeIdMismatchHint(stats) ??
        (stats.totalProducts > 0
          ? `storeId פעיל: "${storeId}" — ${stats.productsForStore} מוצרים לחנות זו, ${stats.totalProducts} בסך הכל במסד.`
          : null)
      : null;

  return (
    <ProductsAdminClient
      products={productsResult.data}
      categories={catsResult.data}
      galleryDisplay={galleryDisplay}
      initialOpenAdd={sp.add === "1"}
      loadError={loadError}
      loadHint={hint}
    />
  );
}
