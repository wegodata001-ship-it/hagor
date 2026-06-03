import { ReviewsAdminClient, type ReviewDTO } from "@/components/admin/reviews-admin-client";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireAdminSession();
  const storeId = getStoreId();

  const reviews: ReviewDTO[] = await safeQuery(
    "admin.reviews",
    async () => {
      const rows = await prisma.review.findMany({
        where: { storeId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      });
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        rating: r.rating,
        comment: r.comment,
        imageUrl: r.imageUrl,
        isApproved: r.isApproved,
        sortOrder: r.sortOrder,
        createdAt: r.createdAt.toISOString(),
      }));
    },
    [],
    { timeoutMs: 25_000 },
  );

  return <ReviewsAdminClient reviews={reviews} />;
}
