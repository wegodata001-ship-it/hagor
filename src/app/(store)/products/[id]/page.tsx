import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { StoreProductDetailClient } from "@/components/storefront/store-product-detail-client";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const storeId = getStoreId();
  const product = await prisma.product.findFirst({
    where: { id, storeId, active: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: true,
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
  });
  if (!product) notFound();

  return (
    <StoreProductDetailClient
      product={{
        id: product.id,
        name_he: product.name_he,
        name_ar: product.name_ar,
        name_en: product.name_en,
        description_he: product.description_he,
        description_ar: product.description_ar,
        description_en: product.description_en,
        price: Number(product.price),
        oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
        discountPercent: product.discountPercent ?? null,
        stock: product.stock,
        category: {
          name_he: product.category.name_he,
          name_ar: product.category.name_ar,
          name_en: product.category.name_en,
        },
        images: product.images.map((i) => ({ id: i.id, url: i.url })),
        variantGroups: product.variantGroups.map((g) => ({
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
        relatedProducts: product.relatedProducts.map((rp) => ({
          id: rp.relatedProduct.id,
          name_he: rp.relatedProduct.name_he,
          name_ar: rp.relatedProduct.name_ar,
          name_en: rp.relatedProduct.name_en,
          price: Number(rp.relatedProduct.price),
          stock: rp.relatedProduct.stock,
          image: rp.relatedProduct.images[0]?.url ?? null,
        })),
      }}
    />
  );
}
