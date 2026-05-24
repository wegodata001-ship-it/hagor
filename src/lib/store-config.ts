/** Re-exports — use `@/lib/store` for identity, `@/lib/store-assets` for uploads. */
export {
  ASSETS_FOLDER,
  getAssetsFolder,
  getSiteName,
  getStoreId,
  getStoreSlug,
  SITE_NAME,
  STORE_ID,
  STORE_SLUG,
} from "./store";

export {
  STORE_ASSET_FOLDERS,
  assertStoreAssetPath,
  buildStoreAssetPath,
  getStoreAssetContext,
  type StoreAssetFolder,
} from "./store-assets";
