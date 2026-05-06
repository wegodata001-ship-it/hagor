export type UploadKind = "products" | "categories" | "banners" | "logo";

export async function uploadAdminAsset(
  file: File,
  kind: UploadKind,
  options?: { entityId?: string; originalName?: string },
): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
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
