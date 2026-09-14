import type { Locale } from "@/lib/localized";
import { pickLocalized } from "@/lib/localized";
import type { StoreProductCardData } from "@/components/storefront/product-card";

export type HomeProductCard = StoreProductCardData & {
  categoryId: string;
  sku: string;
  createdAt: string;
  featured: boolean;
  salesCount: number;
  categoryName_he: string;
  categoryName_ar: string;
  categoryName_en: string;
};

export type ProductSort =
  | "popular"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc";

export type PriceBucket = "all" | "under100" | "100-200" | "200-400" | "over400";
export type StockFilter = "all" | "in";

export type ProductFilterState = {
  sort: ProductSort;
  categoryId: string;
  price: PriceBucket;
  stock: StockFilter;
  q: string;
};

export const DEFAULT_FILTER_STATE: ProductFilterState = {
  sort: "popular",
  categoryId: "",
  price: "all",
  stock: "in",
  q: "",
};

/** Final price the customer pays (already discounted in `price`). */
export function effectivePrice(p: Pick<StoreProductCardData, "price">): number {
  return Number(p.price) || 0;
}

function matchesPriceBucket(price: number, bucket: PriceBucket): boolean {
  switch (bucket) {
    case "under100":
      return price <= 100;
    case "100-200":
      return price >= 100 && price <= 200;
    case "200-400":
      return price >= 200 && price <= 400;
    case "over400":
      return price > 400;
    default:
      return true;
  }
}

function localizedName(p: HomeProductCard, lang: Locale): string {
  return pickLocalized(p, "name", lang);
}

function localizedCategory(p: HomeProductCard, lang: Locale): string {
  return pickLocalized(
    {
      name_he: p.categoryName_he,
      name_ar: p.categoryName_ar,
      name_en: p.categoryName_en,
    },
    "name",
    lang,
  );
}

export function filterAndSortHomeProducts(
  products: HomeProductCard[],
  state: ProductFilterState,
  lang: Locale,
): HomeProductCard[] {
  const q = state.q.trim().toLowerCase();

  let list = products.filter((p) => {
    if (state.categoryId && p.categoryId !== state.categoryId) return false;
    if (state.stock === "in" && p.stock <= 0) return false;
    if (!matchesPriceBucket(effectivePrice(p), state.price)) return false;
    if (q) {
      const hay = [
        localizedName(p, lang),
        p.name_he,
        p.name_ar,
        p.name_en,
        p.sku,
        localizedCategory(p, lang),
        p.categoryName_he,
        p.categoryName_ar,
        p.categoryName_en,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...list];
  sorted.sort((a, b) => {
    switch (state.sort) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "price-asc":
        return effectivePrice(a) - effectivePrice(b);
      case "price-desc":
        return effectivePrice(b) - effectivePrice(a);
      case "name-asc":
        return localizedName(a, lang).localeCompare(localizedName(b, lang), lang === "ar" ? "ar" : "he");
      case "name-desc":
        return localizedName(b, lang).localeCompare(localizedName(a, lang), lang === "ar" ? "ar" : "he");
      case "popular":
      default: {
        const salesDiff = (b.salesCount || 0) - (a.salesCount || 0);
        if (salesDiff !== 0) return salesDiff;
        const featDiff = Number(b.featured) - Number(a.featured);
        if (featDiff !== 0) return featDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    }
  });

  return sorted;
}

export function hasActiveFilters(state: ProductFilterState): boolean {
  return (
    state.categoryId !== "" ||
    state.price !== "all" ||
    state.stock !== "in" ||
    state.q.trim() !== "" ||
    state.sort !== "popular"
  );
}

export function parseFilterState(sp: URLSearchParams): ProductFilterState {
  const sortRaw = sp.get("sort") || DEFAULT_FILTER_STATE.sort;
  const sort = (
    ["popular", "newest", "price-asc", "price-desc", "name-asc", "name-desc"] as ProductSort[]
  ).includes(sortRaw as ProductSort)
    ? (sortRaw as ProductSort)
    : DEFAULT_FILTER_STATE.sort;

  const priceRaw = sp.get("price") || DEFAULT_FILTER_STATE.price;
  const price = (
    ["all", "under100", "100-200", "200-400", "over400"] as PriceBucket[]
  ).includes(priceRaw as PriceBucket)
    ? (priceRaw as PriceBucket)
    : DEFAULT_FILTER_STATE.price;

  const stockRaw = sp.get("stock");
  const stock: StockFilter =
    stockRaw === "all" || stockRaw === "in" ? stockRaw : DEFAULT_FILTER_STATE.stock;

  return {
    sort,
    categoryId: sp.get("cat")?.trim() || "",
    price,
    stock,
    q: sp.get("q")?.trim() || "",
  };
}

export function writeFilterParams(state: ProductFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.sort !== DEFAULT_FILTER_STATE.sort) params.set("sort", state.sort);
  if (state.categoryId) params.set("cat", state.categoryId);
  if (state.price !== "all") params.set("price", state.price);
  if (state.stock !== DEFAULT_FILTER_STATE.stock) params.set("stock", state.stock);
  if (state.q.trim()) params.set("q", state.q.trim());
  return params;
}
