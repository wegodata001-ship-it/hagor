/**
 * Run: npx tsx src/lib/translation/product-content.test.ts
 */
import assert from "node:assert/strict";
import { productTranslationResultSchema } from "./product-content";

async function run() {
  // Full name+description response validates.
  {
    const parsed = productTranslationResultSchema.parse({
      ar: { name: "حافظة مسدس مع مصباح", description: "نص تجريبي" },
      en: { name: "Pistol Holster with Light", description: "Test text" },
    });
    assert.equal(parsed.ar?.name, "حافظة مسدس مع مصباح");
    assert.equal(parsed.en?.description, "Test text");
  }

  // Partial payloads are now valid — the API supports name-only or description-only translation.
  {
    const parsed = productTranslationResultSchema.parse({
      ar: { name: "مسدس" }, // name only
      en: { description: "Only description translated" }, // description only
    });
    assert.equal(parsed.ar?.name, "مسدس");
    assert.equal(parsed.ar?.description, undefined);
    assert.equal(parsed.en?.name, undefined);
    assert.equal(parsed.en?.description, "Only description translated");
  }

  console.log("product translation tests: OK");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
