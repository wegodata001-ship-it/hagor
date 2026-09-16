import { z } from "zod";

export const PRODUCT_TRANSLATION_LANGUAGES = ["he", "ar", "en"] as const;
export type ProductTranslationLanguage = (typeof PRODUCT_TRANSLATION_LANGUAGES)[number];

const languageContentSchema = z.object({
  name: z.string().max(180).optional(),
  description: z.string().max(4000).optional(),
});

export const productTranslationResultSchema = z.object({
  he: languageContentSchema.optional(),
  ar: languageContentSchema.optional(),
  en: languageContentSchema.optional(),
});

export type ProductTranslationResult = z.infer<typeof productTranslationResultSchema>;

export type ProductTranslationField = "name" | "description";

export type TranslateProductContentInput = {
  sourceLanguage: ProductTranslationLanguage;
  targetLanguages: ProductTranslationLanguage[];
  name: string;
  description: string;
  /**
   * Which fields to translate. Defaults to ["name","description"] when both are
   * non-empty; callers can pass ["name"] or ["description"] for independent
   * partial translations.
   */
  fields?: ProductTranslationField[];
};

/** Machine-readable error codes returned to the client for UX branching. */
export type TranslationErrorCode =
  | "SOURCE_EMPTY"
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_ERROR"
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_INVALID_RESPONSE";

export class TranslationError extends Error {
  constructor(
    public readonly code: TranslationErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TranslationError";
  }
}

// ─── Provider selection ────────────────────────────────────────────────────
type Provider = "openai" | "mymemory" | "none";

function resolveProvider(): Provider {
  const forced = process.env.TRANSLATION_PROVIDER?.trim().toLowerCase();
  if (forced === "openai" || forced === "mymemory" || forced === "none") return forced;
  // Auto: prefer OpenAI when key present (higher quality), else free MyMemory.
  return process.env.OPENAI_API_KEY?.trim() ? "openai" : "mymemory";
}

// ─── Public entry point ────────────────────────────────────────────────────
export async function translateProductContent(
  input: TranslateProductContentInput,
): Promise<ProductTranslationResult> {
  const fields: ProductTranslationField[] =
    input.fields && input.fields.length > 0
      ? Array.from(new Set(input.fields))
      : ["name", "description"];

  const wantsName = fields.includes("name");
  const wantsDescription = fields.includes("description");

  if (wantsName && !input.name.trim()) {
    throw new TranslationError("SOURCE_EMPTY", "Source name is empty.");
  }
  if (!wantsName && wantsDescription && !input.description.trim()) {
    throw new TranslationError("SOURCE_EMPTY", "Source description is empty.");
  }

  const targetLanguages = Array.from(
    new Set(
      input.targetLanguages.filter(
        (lang): lang is ProductTranslationLanguage =>
          PRODUCT_TRANSLATION_LANGUAGES.includes(lang) && lang !== input.sourceLanguage,
      ),
    ),
  );
  if (targetLanguages.length === 0) return {};

  const provider = resolveProvider();
  const payload: Required<Pick<TranslateProductContentInput, "sourceLanguage" | "targetLanguages" | "name" | "description">> & {
    fields: ProductTranslationField[];
  } = {
    sourceLanguage: input.sourceLanguage,
    targetLanguages,
    name: (input.name ?? "").trim(),
    description: input.description ?? "",
    fields,
  };

  switch (provider) {
    case "openai":
      return translateWithOpenAi(payload);
    case "mymemory":
      return translateWithMyMemory(payload);
    case "none":
      throw new TranslationError(
        "PROVIDER_NOT_CONFIGURED",
        "Translation is disabled (TRANSLATION_PROVIDER=none).",
      );
  }
}

// ─── OpenAI provider (optional; used when OPENAI_API_KEY is set) ───────────
async function translateWithOpenAi(
  input: TranslateProductContentInput & { fields: ProductTranslationField[] },
): Promise<ProductTranslationResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new TranslationError(
      "PROVIDER_NOT_CONFIGURED",
      "OPENAI_API_KEY is missing in the environment.",
    );
  }
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model =
    process.env.OPENAI_TRANSLATION_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  const fieldsHint =
    input.fields.length === 2
      ? "Translate BOTH the product name and description."
      : input.fields.includes("name")
        ? "Translate ONLY the product name. Do NOT return a description field."
        : "Translate ONLY the product description. Do NOT return a name field.";

  const system = [
    "You translate ecommerce product content for a tactical equipment store.",
    fieldsHint,
    "Return JSON only.",
    "Do not add facts, materials, warranties, dimensions, compatibility, features, or marketing claims.",
    "Preserve brand names, model numbers, SKU-like identifiers, calibers, and technical names exactly as written.",
    "Preserve numbers, measurements, punctuation, and paragraph / line-break structure when present.",
    `Return exactly these target language keys: ${input.targetLanguages.join(", ")}.`,
  ].join(" ");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: JSON.stringify({
              sourceLanguage: input.sourceLanguage,
              targetLanguages: input.targetLanguages,
              fields: input.fields,
              product: {
                name: input.fields.includes("name") ? input.name : undefined,
                description: input.fields.includes("description") ? input.description : undefined,
              },
              outputShape: Object.fromEntries(
                input.targetLanguages.map((lang) => [
                  lang,
                  Object.fromEntries(input.fields.map((f) => [f, "..."])),
                ]),
              ),
            }),
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw new TranslationError("PROVIDER_TIMEOUT", "OpenAI request timed out.", error);
    }
    throw new TranslationError("PROVIDER_ERROR", "OpenAI request failed.", error);
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 429) {
    throw new TranslationError("PROVIDER_RATE_LIMIT", "OpenAI rate limit reached.");
  }
  if (!response.ok) {
    const message = await safeReadText(response);
    throw new TranslationError(
      "PROVIDER_ERROR",
      `OpenAI HTTP ${response.status}: ${message.slice(0, 200)}`,
    );
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new TranslationError("PROVIDER_INVALID_RESPONSE", "OpenAI response was empty.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new TranslationError("PROVIDER_INVALID_RESPONSE", "OpenAI response was not valid JSON.");
  }
  const validated = productTranslationResultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new TranslationError(
      "PROVIDER_INVALID_RESPONSE",
      "OpenAI response failed schema validation.",
    );
  }
  const missing = input.targetLanguages.filter((lang) => {
    const bucket = validated.data[lang];
    if (!bucket) return true;
    if (input.fields.includes("name") && !bucket.name?.trim()) return true;
    if (input.fields.includes("description") && bucket.description == null) return true;
    return false;
  });
  if (missing.length > 0) {
    throw new TranslationError(
      "PROVIDER_INVALID_RESPONSE",
      `OpenAI response missing languages: ${missing.join(", ")}`,
    );
  }
  return validated.data;
}

// ─── MyMemory provider (free, no key; default fallback) ────────────────────
/**
 * MyMemory translation API — free, no API key required.
 * https://mymemory.translated.net/doc/spec.php
 *
 * Free tier: 5,000 words/day per IP (anonymous), 50,000/day when the request
 * includes a contact email in the `de` query param (MYMEMORY_EMAIL).
 */
async function translateWithMyMemory(
  input: TranslateProductContentInput & { fields: ProductTranslationField[] },
): Promise<ProductTranslationResult> {
  const out: ProductTranslationResult = {};
  const wantsName = input.fields.includes("name");
  const wantsDescription = input.fields.includes("description");
  for (const target of input.targetLanguages) {
    const [name, description] = await Promise.all([
      wantsName ? myMemoryOne(input.name, input.sourceLanguage, target) : Promise.resolve(undefined),
      wantsDescription && input.description.trim()
        ? myMemoryOne(input.description, input.sourceLanguage, target)
        : Promise.resolve(wantsDescription ? "" : undefined),
    ]);
    const bucket: { name?: string; description?: string } = {};
    if (typeof name === "string") bucket.name = name;
    if (typeof description === "string") bucket.description = description;
    out[target] = bucket;
  }
  return out;
}

/**
 * MyMemory has a per-request length limit (~500 chars); for long descriptions
 * we split on blank lines/paragraphs, translate each chunk, and rejoin.
 */
async function myMemoryOne(
  text: string,
  source: ProductTranslationLanguage,
  target: ProductTranslationLanguage,
): Promise<string> {
  if (!text.trim()) return "";
  const chunks = splitForMyMemory(text);
  const translated = await Promise.all(chunks.map((chunk) => myMemoryFetch(chunk, source, target)));
  return translated.join("");
}

function splitForMyMemory(text: string): string[] {
  // Preserve original whitespace/paragraph structure. Split on paragraph
  // boundaries first; if any chunk is still too long, further split on sentence
  // boundaries. Keep separators inline so `join("")` reconstructs the input.
  const MAX = 480;
  if (text.length <= MAX) return [text];
  const parts = text.split(/(\n\s*\n)/); // paragraphs + their separators
  const out: string[] = [];
  for (const part of parts) {
    if (part.length <= MAX) {
      out.push(part);
      continue;
    }
    // Split further on sentence ends / newlines.
    const sub = part.split(/([\n\.!?؟।]+\s*)/);
    let buf = "";
    for (const s of sub) {
      if ((buf + s).length > MAX && buf) {
        out.push(buf);
        buf = s;
      } else {
        buf += s;
      }
    }
    if (buf) out.push(buf);
  }
  return out;
}

async function myMemoryFetch(
  text: string,
  source: ProductTranslationLanguage,
  target: ProductTranslationLanguage,
): Promise<string> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${source}|${target}`);
  const email = process.env.MYMEMORY_EMAIL?.trim();
  if (email) url.searchParams.set("de", email);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw new TranslationError("PROVIDER_TIMEOUT", "MyMemory request timed out.", error);
    }
    throw new TranslationError("PROVIDER_ERROR", "MyMemory request failed.", error);
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 429) {
    throw new TranslationError(
      "PROVIDER_RATE_LIMIT",
      "MyMemory rate limit reached (5,000 words/day anonymous).",
    );
  }
  if (!response.ok) {
    const message = await safeReadText(response);
    throw new TranslationError(
      "PROVIDER_ERROR",
      `MyMemory HTTP ${response.status}: ${message.slice(0, 200)}`,
    );
  }

  const body = (await response.json()) as {
    responseData?: { translatedText?: string; match?: number };
    responseStatus?: number | string;
    responseDetails?: string;
  };
  const status = Number(body.responseStatus ?? 0);
  const translated = body.responseData?.translatedText;
  if (status === 429 || /QUERY LENGTH LIMIT|LIMIT EXCEEDED/i.test(String(body.responseDetails ?? ""))) {
    throw new TranslationError(
      "PROVIDER_RATE_LIMIT",
      body.responseDetails || "MyMemory rate limit / length limit reached.",
    );
  }
  if (typeof translated !== "string" || !translated || (status && status !== 200)) {
    throw new TranslationError(
      "PROVIDER_INVALID_RESPONSE",
      body.responseDetails || `MyMemory returned status ${status}.`,
    );
  }
  return translated;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
