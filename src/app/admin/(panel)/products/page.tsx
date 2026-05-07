import { getStoreId } from "@/lib/store-config";
import { requireAdminSession } from "@/lib/admin-auth";
import type { ProductRow } from "@/components/admin/products-admin-client";
import { ProductsAdminClient } from "@/components/admin/products-admin-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ add?: string }>;
}) {
  await requireAdminSession();
  const storeId = getStoreId();
  const sp = (await searchParams) ?? {};

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { storeId },
      orderBy: { updatedAt: "desc" },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variantGroups: {
          orderBy: { sortOrder: "asc" },
          include: { options: { orderBy: { sortOrder: "asc" } } },
        },
        relatedProducts: {
          orderBy: { sortOrder: "asc" },
          include: {
            relatedProduct: {
              include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
            },
          },
        },
      },
    }),
    prisma.category.findMany({
      where: { storeId },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const serialized: ProductRow[] = products.map((p) => ({
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
  }));
  const byId = new Map(categories.map((c) => [c.id, c] as const));
  const cats = categories
    .slice()
    .sort((a, b) => {
      const aParent = a.parentId ? byId.get(a.parentId) : a;
      const bParent = b.parentId ? byId.get(b.parentId) : b;
      const aKey = aParent?.sortOrder ?? a.sortOrder;
      const bKey = bParent?.sortOrder ?? b.sortOrder;
      if (aKey !== bKey) return aKey - bKey;
      // main before children
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

  return (
    <ProductsAdminClient
      products={serialized}
      categories={cats}
      initialOpenAdd={sp.add === "1"}
    />
  );
}
