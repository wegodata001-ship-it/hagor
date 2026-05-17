import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteBaseUrl } from "@/lib/payments/config";
import { STORE_ID } from "@/lib/store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const products = await prisma.product.findMany({
      where: { storeId: STORE_ID, active: true },
      select: { id: true, updatedAt: true },
    });
    return [
      ...staticRoutes,
      ...products.map((p) => ({
        url: `${base}/products/${p.id}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
