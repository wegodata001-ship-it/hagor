import { prisma } from "@/lib/prisma";

export type StorefrontReview = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  imageUrl: string | null;
};

/** Approved reviews for homepage — safe when Prisma client or DB table is not ready yet. */
export async function loadApprovedReviews(storeId: string, take = 12): Promise<StorefrontReview[]> {
  if (typeof (prisma as { review?: unknown }).review === "undefined") {
    return [];
  }

  try {
    const rows = await prisma.review.findMany({
      where: { storeId, isApproved: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take,
      select: { id: true, name: true, rating: true, comment: true, imageUrl: true },
    });
    return rows;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("Review") ||
      msg.includes("does not exist") ||
      msg.includes("P2021") ||
      msg.includes("P2022")
    ) {
      return [];
    }
    throw err;
  }
}
