import { ASSETS_FOLDER, STORE_ID, STORE_SLUG } from "@/lib/store";
import { STORAGE_BUCKET } from "@/lib/storage";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Allowed subfolders under `store-assets/{ASSETS_FOLDER}/`. */
export const STORE_ASSET_FOLDERS = [
  "logo",
  "hero",
  "banners",
  "products",
  "categories",
  "reviews",
  "general",
] as const;

export type StoreAssetFolder = (typeof STORE_ASSET_FOLDERS)[number];

const BLOCKED_PATH_SEGMENTS = new Set(["desigma", "demo", "electronics", "base", "phones", "laptops"]);

const safeSegment = (v: string) =>
  v
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export function getStoreAssetContext() {
  return {
    storeId: STORE_ID,
    storeSlug: STORE_SLUG,
    assetsFolder: ASSETS_FOLDER,
    bucket: STORAGE_BUCKET,
  };
}

/** Reject paths outside the current store folder or known demo stores. */
export function assertStoreAssetPath(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim().replace(/^\/+/, "");
  if (!trimmed) throw new Error("Asset path is empty");

  const firstSegment = trimmed.split("/")[0]?.toLowerCase();
  if (BLOCKED_PATH_SEGMENTS.has(firstSegment)) {
    throw new Error(`Asset path must not use blocked folder: ${firstSegment}`);
  }
  if (firstSegment !== ASSETS_FOLDER.toLowerCase()) {
    throw new Error(`Asset path must start with ${ASSETS_FOLDER}/`);
  }

  for (const blocked of BLOCKED_PATH_SEGMENTS) {
    if (trimmed.toLowerCase().includes(`/${blocked}/`)) {
      throw new Error(`Asset path must not include /${blocked}/`);
    }
  }

  return trimmed;
}

export function buildStoreAssetPath(
  folder: StoreAssetFolder,
  options?: { originalName?: string; entityId?: string },
): string {
  if (!STORE_ASSET_FOLDERS.includes(folder)) {
    throw new Error(`Invalid asset folder: ${folder}`);
  }

  const ctx = getStoreAssetContext();
  const extFromName = options?.originalName?.includes(".")
    ? options.originalName.split(".").pop()
    : "png";
  const safeExt = safeSegment(String(extFromName || "png")) || "png";
  const baseName = safeSegment(
    (options?.originalName ?? folder).replace(/\.[^.]+$/, "") || folder,
  );
  const filename = `${baseName}-${Date.now()}.${safeExt}`;

  const entity = options?.entityId ? safeSegment(options.entityId) : "";
  const path = entity
    ? `${ctx.assetsFolder}/${folder}/${entity}/${filename}`
    : `${ctx.assetsFolder}/${folder}/${filename}`;

  return assertStoreAssetPath(path);
}

export type UploadStoreAssetInput = {
  folder: StoreAssetFolder;
  buffer: Buffer;
  contentType?: string;
  originalName?: string;
  entityId?: string;
};

export async function uploadStoreAsset(input: UploadStoreAssetInput): Promise<string> {
  const path = buildStoreAssetPath(input.folder, {
    originalName: input.originalName,
    entityId: input.entityId,
  });
  const ctx = getStoreAssetContext();

  console.log("Uploading asset:", {
    storeId: ctx.storeId,
    storeSlug: ctx.storeSlug,
    assetsFolder: ctx.assetsFolder,
    folder: input.folder,
    path,
    bucket: ctx.bucket,
  });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, input.buffer, {
    contentType: input.contentType || undefined,
    upsert: false,
  });

  if (error) {
    console.error("Upload failed:", { path, message: error.message });
    throw error;
  }

  return path;
}

/** Map legacy upload kinds to store asset folders. */
export function kindToAssetFolder(kind: string): StoreAssetFolder | null {
  const map: Record<string, StoreAssetFolder> = {
    logo: "logo",
    hero: "hero",
    banners: "banners",
    products: "products",
    categories: "categories",
    reviews: "reviews",
    general: "general",
  };
  return map[kind] ?? null;
}
