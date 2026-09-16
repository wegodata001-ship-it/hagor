import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/scope";
import { getSession } from "@/lib/auth/session";
import { kindToAssetFolder, uploadStoreAsset } from "@/lib/store-assets";
import { STORAGE_BUCKET } from "@/lib/storage";

export const runtime = "nodejs";

/** Hard cap per file — aligns with client compression target */
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_REVIEW_VIDEO_BYTES = 40 * 1024 * 1024;
const REVIEW_VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm"]);

export async function POST(req: Request) {
  try {
    assertAdmin(await getSession());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const kind = formData.get("kind");
  const entityIdRaw = formData.get("entityId");
  const originalNameRaw = formData.get("originalName");

  const folder = typeof kind === "string" ? kindToAssetFolder(kind) : null;
  if (!(file instanceof File) || !folder) {
    return NextResponse.json(
      {
        error:
          "Expected file and kind (logo|hero|banners|products|categories|reviews|general)",
      },
      { status: 400 },
    );
  }

  const mime = (file.type || "").toLowerCase();
  const isReviewVideo = folder === "reviews" && REVIEW_VIDEO_MIME_TYPES.has(mime);
  const maxBytes = isReviewVideo ? MAX_REVIEW_VIDEO_BYTES : MAX_UPLOAD_BYTES;

  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${Math.round(maxBytes / (1024 * 1024))}MB)` },
      { status: 413 },
    );
  }

  if (folder === "reviews") {
    if (!mime.startsWith("image/") && !REVIEW_VIDEO_MIME_TYPES.has(mime)) {
      return NextResponse.json({ error: "Reviews accept image, MP4, or WebM uploads only" }, { status: 400 });
    }
  } else if (folder !== "logo" && !mime.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads allowed for this kind" }, { status: 400 });
  }

  const entityId = typeof entityIdRaw === "string" ? entityIdRaw.trim() : "";
  const originalName =
    typeof originalNameRaw === "string" && originalNameRaw.trim()
      ? originalNameRaw.trim()
      : file.name;

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const path = await uploadStoreAsset({
      folder,
      buffer: buf,
      contentType: file.type || undefined,
      originalName,
      entityId: entityId || undefined,
    });
    return NextResponse.json({ path });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json(
      {
        error: `Upload failed. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, bucket ${STORAGE_BUCKET}. (${message})`,
      },
      { status: 503 },
    );
  }
}
