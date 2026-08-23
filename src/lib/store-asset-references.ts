import { prisma } from "@/lib/prisma";
import { STORAGE_BUCKET } from "@/lib/storage";
import { assertStoreAssetPath } from "@/lib/store-assets";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Resolve a stored image value to a Supabase object path, or null if it is not in Storage. */
export function extractStorageObjectPath(pathOrUrl: string): string | null {
  const raw = pathOrUrl.trim();
  if (!raw) return null;

  const publicMarker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = raw.indexOf(publicMarker);
  if (idx >= 0) {
    try {
      return decodeURIComponent(raw.slice(idx + publicMarker.length).split("?")[0]);
    } catch {
      return raw.slice(idx + publicMarker.length).split("?")[0];
    }
  }

  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) return null;
  return raw.replace(/^\/+/, "");
}

function referenceKeys(pathOrUrl: string): string[] {
  const raw = pathOrUrl.trim();
  const storage = extractStorageObjectPath(raw);
  return Array.from(new Set([raw, storage].filter((x): x is string => Boolean(x))));
}

/** How many other DB fields still point at this asset (after optional exclusions). */
export async function countStoreAssetReferences(opts: {
  storeId: string;
  pathOrUrl: string;
  excludeOrderItemId?: string;
}): Promise<number> {
  const keys = referenceKeys(opts.pathOrUrl);
  if (keys.length === 0) return 0;

  const [orderItems, productImages, variantOptions, banners, reviews, categories, settings] =
    await Promise.all([
      prisma.orderItem.count({
        where: {
          storeId: opts.storeId,
          productImage: { in: keys },
          ...(opts.excludeOrderItemId ? { NOT: { id: opts.excludeOrderItemId } } : {}),
        },
      }),
      prisma.productImage.count({
        where: { storeId: opts.storeId, url: { in: keys } },
      }),
      prisma.productVariantOption.count({
        where: {
          image: { in: keys },
          group: { product: { storeId: opts.storeId } },
        },
      }),
      prisma.banner.count({
        where: { storeId: opts.storeId, imageUrl: { in: keys } },
      }),
      prisma.review.count({
        where: { storeId: opts.storeId, imageUrl: { in: keys } },
      }),
      prisma.category.count({
        where: { storeId: opts.storeId, imageUrl: { in: keys } },
      }),
      prisma.storeSettings.count({
        where: {
          storeId: opts.storeId,
          OR: [{ logoUrl: { in: keys } }, { heroImageUrl: { in: keys } }],
        },
      }),
    ]);

  return orderItems + productImages + variantOptions + banners + reviews + categories + settings;
}

/**
 * Remove the file from Supabase Storage only when nothing else references it
 * and the path belongs to this store's asset folder.
 */
export async function deleteStoreAssetIfUnreferenced(opts: {
  storeId: string;
  pathOrUrl: string;
  excludeOrderItemId?: string;
}): Promise<"deleted" | "kept" | "skipped"> {
  const storagePath = extractStorageObjectPath(opts.pathOrUrl);
  if (!storagePath) return "skipped";

  try {
    assertStoreAssetPath(storagePath);
  } catch {
    return "skipped";
  }

  const refs = await countStoreAssetReferences(opts);
  if (refs > 0) return "kept";

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
  if (error) throw error;
  return "deleted";
}
