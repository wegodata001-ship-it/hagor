import { z } from "zod";

export const PRODUCT_TRANSLATION_LANGUAGES = ["he", "ar", "en"] as const;
export type ProductTranslationLanguage = (typeof PRODUCT_TRANSLATION_LANGUAGES)[number];

const languageContentSchema = z.object({
  name: z.string().trim().min(1).max(180),
  description: z.string().max(4000),
});

export const productTranslationResultSchema = z.object({
  he: languageContentSchema.optional(),
  ar: languageContentSchema.optional(),
  en: languageContentSchema.optional(),
});

export type ProductTranslationResult = z.infer<typeof productTranslationResultSchema>;

export type TranslateProductContentInput = {
  sourceLanguage: ProductTranslationLanguage;
  targetLanguages: ProductTranslationLanguage[];
  name: string;
  description: string;
};

function configuredOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("Translation service is not configured.");
  }
  return key;
}

function configuredBaseUrl(): string {
  return (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
}

function configuredModel(): string {
  return process.env.OPENAI_TRANSLATION_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
}

function systemPrompt(targetLanguages: ProductTranslationLanguage[]): string {
  return [
    "You translate ecommerce product content for a tactical equipment store.",
    "Translate ONLY the provided product name and description.",
    "Return JSON only.",
    "Do not add facts, materials, warranties, dimensions, compatibility, features, or marketing claims.",
    "Preserve brand names, model numbers, SKU-like identifiers, calibers, and technical names exactly as written.",
    "Preserve numbers, measurements, punctuation, and paragraph / line-break structure when present.",
    `Return exactly these target language keys when requested: ${targetLanguages.join(", ")}.`,
  ].join(" ");
}

export async function translateProductContent(
  input: TranslateProductContentInput,
): Promise<ProductTranslationResult> {
  const apiKey = configuredOpenAiKey();
  const baseUrl = configuredBaseUrl();
  const model = configuredModel();

  const targetLanguages = input.targetLanguages.filter(
    (lang): lang is ProductTranslationLanguage =>
      PRODUCT_TRANSLATION_LANGUAGES.includes(lang) && lang !== input.sourceLanguage,
  );
  if (targetLanguages.length === 0) {
    return {};
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
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
        {
          role: "system",
          content: systemPrompt(targetLanguages),
        },
        {
          role: "user",
          content: JSON.stringify({
            sourceLanguage: input.sourceLanguage,
            targetLanguages,
            product: {
              name: input.name,
              description: input.description,
            },
            outputShape: {
              ar: { name: "...", description: "..." },
              en: { name: "...", description: "..." },
              he: { name: "...", description: "..." },
            },
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Translation request failed (${response.status}): ${message.slice(0, 300)}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Translation response was empty.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Translation response was not valid JSON.");
  }

  const validated = productTranslationResultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("Translation response validation failed.");
  }

  const missingTargets = targetLanguages.filter((lang) => !validated.data[lang]);
  if (missingTargets.length > 0) {
    throw new Error(`Translation response missing languages: ${missingTargets.join(", ")}`);
  }

  return validated.data;
}
