import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";

export async function GET(req: Request) {
  const storeId = getStoreId();
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  if (ids.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const products = await prisma.product.findMany({
    where: { storeId, id: { in: ids }, active: true },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name_he: p.name_he,
      name_ar: p.name_ar,
      name_en: p.name_en,
      price: Number(p.price),
      oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
      discountPercent: p.discountPercent ?? null,
      stock: p.stock,
      image: p.images[0]?.url ?? null,
    })),
  });
}
