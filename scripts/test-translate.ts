/**
 * Real end-to-end translation smoke test — one case per user requirement.
 * Usage: npx tsx --import ./scripts/pdf-preload.mjs scripts/test-translate.ts
 */
import { translateProductContent, TranslationError } from "../src/lib/translation/product-content";

type Case = {
  name: string;
  input: Parameters<typeof translateProductContent>[0];
  expectLangs: Array<"he" | "ar" | "en">;
  expectFields: Array<"name" | "description">;
};

const cases: Case[] = [
  {
    name: "TEST 1 — HE name-only source ('נשק')",
    input: {
      sourceLanguage: "he",
      targetLanguages: ["ar", "en"],
      name: "נשק",
      description: "",
      fields: ["name"],
    },
    expectLangs: ["ar", "en"],
    expectFields: ["name"],
  },
  {
    name: "TEST 2 — HE description ('נרתיק איכותי לנשיאת ציוד.')",
    input: {
      sourceLanguage: "he",
      targetLanguages: ["ar", "en"],
      name: "",
      description: "נרתיק איכותי לנשיאת ציוד.",
      fields: ["description"],
    },
    expectLangs: ["ar", "en"],
    expectFields: ["description"],
  },
  {
    name: "TEST 3 — AR source ('حزام تكتيكي')",
    input: {
      sourceLanguage: "ar",
      targetLanguages: ["he", "en"],
      name: "حزام تكتيكي",
      description: "",
      fields: ["name"],
    },
    expectLangs: ["he", "en"],
    expectFields: ["name"],
  },
  {
    name: "TEST 4 — EN source ('Tactical Belt')",
    input: {
      sourceLanguage: "en",
      targetLanguages: ["he", "ar"],
      name: "Tactical Belt",
      description: "",
      fields: ["name"],
    },
    expectLangs: ["he", "ar"],
    expectFields: ["name"],
  },
];

async function main() {
  console.log(`provider = ${process.env.OPENAI_API_KEY ? "openai (auto)" : "mymemory (auto)"}\n`);

  let pass = 0;
  let fail = 0;
  for (const c of cases) {
    process.stdout.write(`• ${c.name}\n`);
    try {
      const started = Date.now();
      const out = await translateProductContent(c.input);
      const ms = Date.now() - started;
      let ok = true;
      for (const lang of c.expectLangs) {
        const bucket = out[lang];
        if (!bucket) {
          console.log(`    FAIL: missing bucket for ${lang}`);
          ok = false;
          continue;
        }
        for (const f of c.expectFields) {
          const v = bucket[f];
          if (typeof v !== "string" || !v.trim()) {
            console.log(`    FAIL: ${lang}.${f} is empty`);
            ok = false;
          } else {
            console.log(`    ${lang}.${f} = "${v.slice(0, 60)}"`);
          }
        }
      }
      console.log(`    ${ok ? "PASS" : "FAIL"} (${ms} ms)\n`);
      if (ok) pass++; else fail++;
    } catch (error) {
      const code = error instanceof TranslationError ? error.code : "?";
      console.log(`    FAIL [${code}] ${(error as Error).message}\n`);
      fail++;
    }
  }
  console.log(`Total: pass=${pass} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
