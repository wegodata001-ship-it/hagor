/**
 * Run: npx tsx src/lib/assets-path.test.ts
 */
import assert from "node:assert/strict";
import { resolvePublicAssetSrc } from "./assets-path";

async function run() {
  assert.equal(resolvePublicAssetSrc("blob:test-video"), "blob:test-video");
  assert.equal(resolvePublicAssetSrc("data:text/plain;base64,QQ=="), "data:text/plain;base64,QQ==");
  assert.equal(resolvePublicAssetSrc("/hero.png"), "/hero.png");

  const relative = resolvePublicAssetSrc("hagor/reviews/review-1/video.mp4");
  assert.match(relative, /(storage\/v1\/object\/public|api\/asset-placeholder)/);

  console.log("assets path tests: OK");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
