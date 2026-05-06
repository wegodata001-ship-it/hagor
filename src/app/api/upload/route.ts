import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/scope";
import { getSession } from "@/lib/auth/session";
import { ASSETS_FOLDER } from "@/lib/store";
import { STORAGE_BUCKET } from "@/lib/storage";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const kinds = new Set(["logo", "products", "categories", "banners"]);
const safeSegment = (v: string) =>
  v
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

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
  if (!(file instanceof File) || typeof kind !== "string" || !kinds.has(kind)) {
    return NextResponse.json(
      { error: "Expected file and kind (logo|products|categories|banners)" },
      { status: 400 },
    );
  }

  const folder = ASSETS_FOLDER;
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const safeExt = safeSegment(String(ext || "bin")) || "bin";
  const safeEntity =
    typeof entityIdRaw === "string" && entityIdRaw.trim().length > 0
      ? safeSegment(entityIdRaw)
      : "";
  const safeNameBase =
    typeof originalNameRaw === "string" && originalNameRaw.trim().length > 0
      ? safeSegment(originalNameRaw.replace(/\.[^.]+$/, ""))
      : "";
  const filename = `${safeNameBase || randomUUID()}-${randomUUID().slice(0, 8)}.${safeExt}`;
  const path =
    kind === "products" && safeEntity
      ? `${folder}/${kind}/${safeEntity}/${filename}`
      : `${folder}/${kind}/${filename}`;

  try {
    const supabase = getSupabaseAdmin();
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buf, {
      contentType: file.type || undefined,
    });
    if (error) throw error;
    return NextResponse.json({ path });
  } catch {
    return NextResponse.json(
      {
        error:
          `Upload failed. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, bucket ${STORAGE_BUCKET}.`,
      },
      { status: 503 },
    );
  }
}
