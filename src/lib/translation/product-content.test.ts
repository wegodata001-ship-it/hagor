/**
 * Run: npx tsx src/lib/translation/product-content.test.ts
 */
import assert from "node:assert/strict";
import { productTranslationResultSchema } from "./product-content";

async function run() {
  {
    const parsed = productTranslationResultSchema.parse({
      ar: { name: "حافظة مسدس مع مصباح", description: "نص تجريبي" },
      en: { name: "Pistol Holster with Light", description: "Test text" },
    });
    assert.equal(parsed.ar?.name, "حافظة مسدس مع مصباح");
    assert.equal(parsed.en?.description, "Test text");
  }

  {
    const parsed = productTranslationResultSchema.safeParse({
      ar: { name: "", description: "نص" },
    });
    assert.equal(parsed.success, false);
  }

  {
    const parsed = productTranslationResultSchema.safeParse({
      en: { description: "Missing name" },
    });
    assert.equal(parsed.success, false);
  }

  console.log("product translation tests: OK");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
