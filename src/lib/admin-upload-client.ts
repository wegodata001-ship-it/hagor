import { compressImageForUpload } from "@/lib/image-compress-client";
import type { StoreAssetFolder } from "@/lib/store-assets";

export type UploadKind = StoreAssetFolder;

/** Upload a file to Supabase Storage under `store-assets/{ASSETS_FOLDER}/{folder}/`. */
export async function uploadStoreAsset(
  file: File,
  folder: StoreAssetFolder,
  options?: { entityId?: string; originalName?: string; compress?: boolean },
): Promise<string> {
  let uploadFile = file;
  if (options?.compress !== false && folder !== "logo") {
    try {
      uploadFile = await compressImageForUpload(file);
    } catch (e) {
      if (e instanceof Error && e.message === "FILE_TOO_LARGE") {
        throw new Error("Image exceeds maximum size — choose a smaller file.");
      }
      uploadFile = file;
    }
  }

  const fd = new FormData();
  fd.append("file", uploadFile);
  fd.append("kind", folder);
  if (options?.entityId) fd.append("entityId", options.entityId);
  if (options?.originalName) fd.append("originalName", options.originalName);

  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const raw = await res.text();
  let parsed: { path?: string; error?: string } | null = null;
  try {
    parsed = JSON.parse(raw) as { path?: string; error?: string };
  } catch {
    throw new Error(`Upload failed (non-JSON response, HTTP ${res.status})`);
  }
  if (!res.ok) throw new Error(parsed.error ?? `Upload failed (HTTP ${res.status})`);
  if (!parsed.path) throw new Error("Upload failed: missing path");
  return parsed.path;
}

/** @deprecated use uploadStoreAsset */
export const uploadAdminAsset = uploadStoreAsset;
