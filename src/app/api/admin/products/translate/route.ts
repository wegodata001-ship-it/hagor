import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth/scope";
import { getSession } from "@/lib/auth/session";
import { clientIpFromRequest, rateLimit } from "@/lib/rate-limit";
import {
  PRODUCT_TRANSLATION_LANGUAGES,
  translateProductContent,
} from "@/lib/translation/product-content";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 180;
const MAX_DESCRIPTION_LENGTH = 4000;

const schema = z.object({
  sourceLanguage: z.enum(PRODUCT_TRANSLATION_LANGUAGES),
  targetLanguages: z.array(z.enum(PRODUCT_TRANSLATION_LANGUAGES)).min(1).max(2),
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional().default(""),
});

export async function POST(req: Request) {
  try {
    assertAdmin(await getSession());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIpFromRequest(req);
  if (!rateLimit(`product-translate:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "יותר מדי בקשות תרגום. נסו שוב בעוד דקה." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid translation request" },
      { status: 400 },
    );
  }

  const targetLanguages = Array.from(
    new Set(parsed.data.targetLanguages.filter((lang) => lang !== parsed.data.sourceLanguage)),
  );
  if (targetLanguages.length === 0) {
    return NextResponse.json({ error: "No target languages requested" }, { status: 400 });
  }

  try {
    const translations = await translateProductContent({
      sourceLanguage: parsed.data.sourceLanguage,
      targetLanguages,
      name: parsed.data.name,
      description: parsed.data.description ?? "",
    });
    return NextResponse.json({ ok: true, translations });
  } catch (error) {
    console.error("[product-translate]", error);
    return NextResponse.json(
      { error: "לא הצלחנו להשלים את התרגום האוטומטי." },
      { status: 503 },
    );
  }
}
