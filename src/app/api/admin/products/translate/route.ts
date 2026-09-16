import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth/scope";
import { getSession } from "@/lib/auth/session";
import { clientIpFromRequest, rateLimit } from "@/lib/rate-limit";
import {
  PRODUCT_TRANSLATION_LANGUAGES,
  TranslationError,
  translateProductContent,
  type TranslationErrorCode,
} from "@/lib/translation/product-content";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 180;
const MAX_DESCRIPTION_LENGTH = 4000;

const schema = z
  .object({
    sourceLanguage: z.enum(PRODUCT_TRANSLATION_LANGUAGES),
    targetLanguages: z.array(z.enum(PRODUCT_TRANSLATION_LANGUAGES)).min(1).max(2),
    name: z.string().max(MAX_NAME_LENGTH).optional().default(""),
    description: z.string().max(MAX_DESCRIPTION_LENGTH).optional().default(""),
    fields: z
      .array(z.enum(["name", "description"]))
      .min(1)
      .max(2)
      .optional(),
  })
  .refine(
    (v) => (v.fields ?? ["name"]).includes("name") ? v.name.trim().length > 0 : true,
    { message: "Source name is required when translating name.", path: ["name"] },
  )
  .refine(
    (v) => (v.fields ?? []).includes("description") ? v.description.trim().length > 0 : true,
    { message: "Source description is required when translating description.", path: ["description"] },
  );

const ERROR_STATUS: Record<TranslationErrorCode, number> = {
  SOURCE_EMPTY: 400,
  PROVIDER_NOT_CONFIGURED: 503,
  PROVIDER_ERROR: 502,
  PROVIDER_RATE_LIMIT: 429,
  PROVIDER_TIMEOUT: 504,
  PROVIDER_INVALID_RESPONSE: 502,
};

const ERROR_MESSAGE: Record<TranslationErrorCode, string> = {
  SOURCE_EMPTY: "יש להזין שם מוצר בשפת המקור לפני התרגום.",
  PROVIDER_NOT_CONFIGURED:
    "שירות התרגום אינו מוגדר בשרת. פנו למנהל המערכת.",
  PROVIDER_ERROR: "שירות התרגום החזיר שגיאה. נסו שוב בעוד רגע.",
  PROVIDER_RATE_LIMIT:
    "מכסת התרגום היומית מוצתה. נסו שוב מאוחר יותר.",
  PROVIDER_TIMEOUT: "שירות התרגום לא הגיב בזמן. נסו שוב.",
  PROVIDER_INVALID_RESPONSE: "התקבלה תגובה לא תקינה משירות התרגום.",
};

export async function POST(req: Request) {
  try {
    assertAdmin(await getSession());
  } catch {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIpFromRequest(req);
  if (!rateLimit(`product-translate:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMIT", error: "יותר מדי בקשות תרגום. נסו שוב בעוד דקה." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "BAD_REQUEST", error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "BAD_REQUEST",
        error: parsed.error.issues[0]?.message ?? "Invalid translation request",
      },
      { status: 400 },
    );
  }

  const targetLanguages = Array.from(
    new Set(parsed.data.targetLanguages.filter((lang) => lang !== parsed.data.sourceLanguage)),
  );
  if (targetLanguages.length === 0) {
    return NextResponse.json(
      { ok: false, code: "BAD_REQUEST", error: "No target languages requested" },
      { status: 400 },
    );
  }

  try {
    const translations = await translateProductContent({
      sourceLanguage: parsed.data.sourceLanguage,
      targetLanguages,
      name: parsed.data.name ?? "",
      description: parsed.data.description ?? "",
      fields: parsed.data.fields,
    });
    return NextResponse.json({ ok: true, translations });
  } catch (error) {
    if (error instanceof TranslationError) {
      // Log the *specific* upstream reason server-side so operators can diagnose.
      console.error("[product-translate]", error.code, error.message, error.cause ?? "");
      return NextResponse.json(
        { ok: false, code: error.code, error: ERROR_MESSAGE[error.code] },
        { status: ERROR_STATUS[error.code] },
      );
    }
    console.error("[product-translate] unexpected error", error);
    return NextResponse.json(
      {
        ok: false,
        code: "PROVIDER_ERROR",
        error: ERROR_MESSAGE.PROVIDER_ERROR,
      },
      { status: 502 },
    );
  }
}
