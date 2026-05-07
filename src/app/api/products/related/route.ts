import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";

export async function GET(req: Request) {
  const storeId = getStoreId();
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId")?.trim() ?? "";
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  const [main, related] = await Promise.all([
    prisma.product.findFirst({
      where: { storeId, id: productId, active: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
    prisma.productRelatedProduct.findMany({
      where: { productId, product: { storeId } },
      orderBy: { sortOrder: "asc" },
      include: {
        relatedProduct: {
          include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
        },
      },
    }),
  ]);

  if (!main) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    main: {
      id: main.id,
      name_he: main.name_he,
      name_ar: main.name_ar,
      name_en: main.name_en,
      price: Number(main.price),
      stock: main.stock,
      image: main.images[0]?.url ?? null,
    },
    related: related
      .map((r) => r.relatedProduct)
      .filter((p) => p.active)
      .map((p) => ({
        id: p.id,
        name_he: p.name_he,
        name_ar: p.name_ar,
        name_en: p.name_en,
        price: Number(p.price),
        stock: p.stock,
        image: p.images[0]?.url ?? null,
      })),
  });
}

