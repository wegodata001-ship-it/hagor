"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { AssetImg } from "@/components/asset-img";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { ProductImagesSection } from "@/components/admin/product-images-section";
import { useAdminI18n } from "@/lib/admin-i18n";
import type { GalleryDisplayConfig } from "@/lib/product-gallery-display";
import { uploadAdminAsset } from "@/lib/admin-upload-client";
import {
  addProductImage,
  deleteAllStoreProducts,
  deleteProduct,
  upsertProduct,
} from "@/app/admin/actions";
import { AdminBulkDeleteModal } from "@/components/admin/admin-bulk-delete-modal";
import { AdminQueryAlert } from "@/components/admin/admin-query-alert";

type Img = { id: string; url: string; isMain: boolean; sortOrder: number };
type VariantOption = {
  id: string;
  value: string;
  priceAdd: number;
  stock: number | null;
  sku: string | null;
  image: string | null;
  isDefault: boolean;
  sortOrder: number;
};
type VariantGroup = { id: string; name: string; sortOrder: number; options: VariantOption[] };
type RelatedProduct = { id: string; name_he: string; name_ar: string; name_en: string; price: number; image: string | null; sortOrder: number };
export type ProductRow = {
  id: string;
  sku: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  description_he: string | null;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
  stock: number;
  active: boolean;
  featured: boolean;
  createdAt: string;
  categoryId: string;
  category: { name_he: string };
  images: Img[];
  variantGroups: VariantGroup[];
  relatedProducts: RelatedProduct[];
};

export type CategoryOpt = { id: string; label: string };

/** Same threshold as admin dashboard low-stock query (`stock: { lt: 5 }`). */
const LOW_STOCK_LT = 5;

type StockFilter = "all" | "in" | "low" | "out";
type StatusFilter = "all" | "active" | "inactive";
type SortKey =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "stock-asc"
  | "stock-desc";

type ProductFilters = {
  search: string;
  category: string;
  stock: StockFilter;
  status: StatusFilter;
  minPrice: string;
  maxPrice: string;
  sort: SortKey;
};

const DEFAULT_FILTERS: ProductFilters = {
  search: "",
  category: "all",
  stock: "all",
  status: "all",
  minPrice: "",
  maxPrice: "",
  sort: "newest",
};

function parseFiltersFromParams(sp: URLSearchParams): ProductFilters {
  const stockRaw = sp.get("stock") ?? "all";
  const statusRaw = sp.get("status") ?? "all";
  const sortRaw = sp.get("sort") ?? "newest";
  const stock: StockFilter =
    stockRaw === "in" || stockRaw === "low" || stockRaw === "out" ? stockRaw : "all";
  const status: StatusFilter =
    statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "all";
  const sort: SortKey =
    sortRaw === "oldest" ||
    sortRaw === "name-asc" ||
    sortRaw === "name-desc" ||
    sortRaw === "price-asc" ||
    sortRaw === "price-desc" ||
    sortRaw === "stock-asc" ||
    sortRaw === "stock-desc"
      ? sortRaw
      : "newest";
  return {
    search: sp.get("search") ?? "",
    category: sp.get("category") ?? "all",
    stock,
    status,
    minPrice: sp.get("minPrice") ?? "",
    maxPrice: sp.get("maxPrice") ?? "",
    sort,
  };
}

function filtersActive(f: ProductFilters): boolean {
  return (
    f.search.trim() !== "" ||
    f.category !== "all" ||
    f.stock !== "all" ||
    f.status !== "all" ||
    f.minPrice.trim() !== "" ||
    f.maxPrice.trim() !== "" ||
    f.sort !== "newest"
  );
}

function productMatchesSearch(p: ProductRow, q: string): boolean {
  if (!q) return true;
  const hay = [
    p.name_he,
    p.name_ar,
    p.name_en,
    p.sku,
    p.description_he ?? "",
    p.description_ar ?? "",
    p.description_en ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function filterAndSortProducts(list: ProductRow[], f: ProductFilters): ProductRow[] {
  const q = f.search.trim().toLowerCase();
  const min = f.minPrice.trim() === "" ? null : Number(f.minPrice);
  const max = f.maxPrice.trim() === "" ? null : Number(f.maxPrice);
  const minOk = min != null && Number.isFinite(min) ? min : null;
  const maxOk = max != null && Number.isFinite(max) ? max : null;

  const rows = list.filter((p) => {
    if (!productMatchesSearch(p, q)) return false;
    if (f.category !== "all" && p.categoryId !== f.category) return false;
    if (f.stock === "in" && !(p.stock > 0)) return false;
    if (f.stock === "out" && p.stock !== 0) return false;
    if (f.stock === "low" && !(p.stock > 0 && p.stock < LOW_STOCK_LT)) return false;
    if (f.status === "active" && !p.active) return false;
    if (f.status === "inactive" && p.active) return false;
    if (minOk != null && p.price < minOk) return false;
    if (maxOk != null && p.price > maxOk) return false;
    return true;
  });

  const nameOf = (p: ProductRow) => p.name_he || p.name_en || p.name_ar || "";
  return [...rows].sort((a, b) => {
    switch (f.sort) {
      case "name-asc":
        return nameOf(a).localeCompare(nameOf(b), "he");
      case "name-desc":
        return nameOf(b).localeCompare(nameOf(a), "he");
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "stock-asc":
        return a.stock - b.stock;
      case "stock-desc":
        return b.stock - a.stock;
      case "oldest":
        return a.createdAt.localeCompare(b.createdAt);
      case "newest":
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });
}

function SuccessBar({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
      {message}
    </div>
  );
}

export function ProductsAdminClient({
  products,
  categories,
  galleryDisplay,
  initialOpenAdd,
  loadError = null,
  loadHint = null,
}: {
  products: ProductRow[];
  categories: CategoryOpt[];
  galleryDisplay: GalleryDisplayConfig;
  initialOpenAdd?: boolean;
  loadError?: string | null;
  loadHint?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { t } = useAdminI18n();

  const [filters, setFilters] = useState<ProductFilters>(() => parseFiltersFromParams(searchParams));
  const [searchInput, setSearchInput] = useState(() => parseFiltersFromParams(searchParams).search);

  useEffect(() => {
    if (initialOpenAdd || searchParams.get("add") === "1") {
      setAddOpen(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("add");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [initialOpenAdd, router, searchParams, pathname]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput }));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.search.trim()) next.set("search", filters.search.trim());
    if (filters.category !== "all") next.set("category", filters.category);
    if (filters.stock !== "all") next.set("stock", filters.stock);
    if (filters.status !== "all") next.set("status", filters.status);
    if (filters.minPrice.trim()) next.set("minPrice", filters.minPrice.trim());
    if (filters.maxPrice.trim()) next.set("maxPrice", filters.maxPrice.trim());
    if (filters.sort !== "newest") next.set("sort", filters.sort);
    const qs = next.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    const currentQs = searchParams.toString();
    // Ignore transient `add` when comparing so open-add flow does not fight URL sync.
    const currentComparable = new URLSearchParams(currentQs);
    currentComparable.delete("add");
    if (qs !== currentComparable.toString()) {
      router.replace(target, { scroll: false });
    }
  }, [filters, pathname, router, searchParams]);

  const filteredProducts = useMemo(() => filterAndSortProducts(products, filters), [products, filters]);
  const hasActiveFilters = filtersActive(filters);

  const clearFilters = () => {
    setSearchInput("");
    setFilters(DEFAULT_FILTERS);
  };

  const setFilter = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const handleUpsert = async (form: FormData, files: File[] | null, editing: ProductRow | null) => {
    const res = await upsertProduct(form);
    if (!res.ok) {
      setToast(res.error);
      return;
    }
    const pid = res.data.productId;

    if (files?.length && pid) {
      const hadImages = (editing?.images.length ?? 0) > 0;
      let order = editing?.images.length ?? 0;
      for (let i = 0; i < files.length; i++) {
        const path = await uploadAdminAsset(files[i], "products", {
          entityId: pid,
          originalName: files[i].name,
        });
        const fd = new FormData();
        fd.append("productId", pid);
        fd.append("url", path);
        fd.append("sortOrder", String(order++));
        const setMain = !hadImages && i === 0;
        fd.append("isMain", setMain ? "on" : "");
        const ir = await addProductImage(fd);
        if (!ir.ok) {
          setToast(ir.error);
          return;
        }
      }
    }
    setToast(t("savedSuccessfully"));
    setAddOpen(false);
    setEditProduct(null);
    refresh();
  };

  const handleDelete = async (id: string) => {
    const fd = new FormData();
    fd.append("id", id);
    const res = await deleteProduct(fd);
    if (!res.ok) setToast(res.error);
    else {
      setToast(t("deletedSuccessfully"));
      setDeleteId(null);
      refresh();
    }
  };

  return (
    <div>
      <AdminQueryAlert error={loadError} hint={loadHint} />
      {toast && (
        <SuccessBar message={toast === "error" ? "שגיאה" : toast} onDismiss={() => setToast(null)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("products")}</h1>
          <p className="text-sm text-slate-500">{t("productsSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkDeleteOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_22px_-6px_rgba(239,68,68,0.65)] transition hover:bg-red-500 hover:shadow-[0_0_26px_-4px_rgba(239,68,68,0.75)]"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
            {t("bulkDeleteAllProducts")}
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {t("addProduct")}
          </button>
        </div>
      </div>

      <AdminBulkDeleteModal
        open={bulkDeleteOpen}
        onClose={() => !bulkDeleting && setBulkDeleteOpen(false)}
        title={t("bulkDeleteProductsTitle")}
        description={t("bulkDeleteProductsWarning")}
        typeDeleteHint={t("typeDeleteToConfirm")}
        cancelLabel={t("cancel")}
        confirmLabel={t("bulkDeleteAllProducts")}
        pending={bulkDeleting}
        onConfirmed={async (phrase) => {
          setBulkDeleting(true);
          try {
            const res = await deleteAllStoreProducts(phrase);
            if (!res.ok) setToast(res.error);
            else {
              setToast(t("allProductsDeletedToast"));
              setBulkDeleteOpen(false);
              refresh();
            }
          } finally {
            setBulkDeleting(false);
          }
        }}
      />

      <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
          <label className="relative block min-w-0 sm:col-span-2 lg:col-span-1">
            <span className="sr-only">{t("productSearchPlaceholder")}</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("productSearchPlaceholder")}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pe-3 ps-9 text-sm text-slate-800"
              autoComplete="off"
            />
          </label>
          <select
            value={filters.category}
            onChange={(e) => setFilter("category", e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            aria-label={t("allCategories")}
          >
            <option value="all">{t("allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={filters.stock}
            onChange={(e) => setFilter("stock", e.target.value as StockFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            aria-label={t("allStock")}
          >
            <option value="all">{t("allStock")}</option>
            <option value="in">{t("stockInStock")}</option>
            <option value="low">{t("stockLow")}</option>
            <option value="out">{t("stockOut")}</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value as StatusFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            aria-label={t("status")}
          >
            <option value="all">{t("allStatuses")}</option>
            <option value="active">{t("statusActive")}</option>
            <option value="inactive">{t("statusInactive")}</option>
          </select>
          <select
            value={filters.sort}
            onChange={(e) => setFilter("sort", e.target.value as SortKey)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            aria-label={t("sortBy")}
          >
            <option value="newest">{t("sortNewest")}</option>
            <option value="oldest">{t("sortOldest")}</option>
            <option value="name-asc">{t("sortNameAsc")}</option>
            <option value="name-desc">{t("sortNameDesc")}</option>
            <option value="price-asc">{t("sortPriceAsc")}</option>
            <option value="price-desc">{t("sortPriceDesc")}</option>
            <option value="stock-asc">{t("sortStockAsc")}</option>
            <option value="stock-desc">{t("sortStockDesc")}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">{t("priceFrom")}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={filters.minPrice}
              onChange={(e) => setFilter("minPrice", e.target.value)}
              className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              inputMode="decimal"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">{t("priceTo")}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={filters.maxPrice}
              onChange={(e) => setFilter("maxPrice", e.target.value)}
              className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              inputMode="decimal"
            />
          </div>
          <p className="text-sm text-slate-600">
            {t("showingProductsCount")
              .replace("{shown}", String(filteredProducts.length))
              .replace("{total}", String(products.length))}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="ms-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <X className="h-3.5 w-3.5" />
              {t("clearFilters")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">{t("image")}</th>
              <th className="px-4 py-3">{t("name")}</th>
              <th className="px-4 py-3">{t("price")}</th>
              <th className="px-4 py-3">{t("stock")}</th>
              <th className="px-4 py-3">{t("active")}</th>
              <th className="px-4 py-3 text-end">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => {
              const main = p.images.find((i) => i.isMain) ?? p.images[0];
              return (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-2">
                    <div className="h-12 w-12 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                      <AssetImg path={main?.url} alt="" className="h-full w-full object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-2 font-medium text-slate-900">{p.name_he}</td>
                  <td className="px-4 py-2 tabular-nums">₪{p.price.toFixed(2)}</td>
                  <td className="px-4 py-2 tabular-nums">{p.stock}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {p.active ? t("active") : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-end">
                    <button
                      type="button"
                      onClick={() => setEditProduct(p)}
                      className="text-blue-600 hover:underline"
                    >
                      {t("edit")}
                    </button>
                    <span className="mx-2 text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setDeleteId(p.id)}
                      className="text-red-600 hover:underline"
                    >
                      {t("delete")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.length === 0 ? (
          <p className="p-8 text-center text-slate-500">{t("noProducts")}</p>
        ) : filteredProducts.length === 0 ? (
          <p className="p-8 text-center text-slate-500">{t("noProductsMatchFilters")}</p>
        ) : null}
      </div>

      {pending && (
        <div className="fixed bottom-6 left-6 z-[90] flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-white shadow-lg">
          <AdminSpinner className="h-4 w-4 border-t-white" />
          <span className="text-sm">{t("updating")}</span>
        </div>
      )}

      <AdminModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t("addProduct")}
        size="xl"
      >
        <ProductForm
          categories={categories}
          allProducts={products}
          galleryDisplay={galleryDisplay}
          onSubmit={(fd, files) => handleUpsert(fd, files, null)}
          onCancel={() => setAddOpen(false)}
        />
      </AdminModal>

      <AdminModal
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        title={t("edit")}
        size="xl"
      >
        {editProduct && (
          <ProductForm
            categories={categories}
            allProducts={products}
            galleryDisplay={galleryDisplay}
            product={editProduct}
            onSubmit={(fd, files) => handleUpsert(fd, files, editProduct)}
            onCancel={() => setEditProduct(null)}
            onRefresh={refresh}
          />
        )}
      </AdminModal>

      <AdminModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title={t("delete")}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              onClick={() => setDeleteId(null)}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              onClick={() => deleteId && void handleDelete(deleteId)}
            >
              {t("delete")}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">{t("confirmDeleteProduct")}</p>
      </AdminModal>
    </div>
  );
}

function ProductForm({
  categories,
  allProducts,
  galleryDisplay,
  product,
  onSubmit,
  onCancel,
  onRefresh,
}: {
  categories: CategoryOpt[];
  allProducts: ProductRow[];
  galleryDisplay: GalleryDisplayConfig;
  product?: ProductRow;
  onSubmit: (fd: FormData, files: File[] | null) => Promise<void>;
  onCancel: () => void;
  onRefresh?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [variantGroups, setVariantGroups] = useState<
    Array<{
      id: string;
      name: string;
      sortOrder: number;
      options: Array<{
        id: string;
        value: string;
        priceAdd: number;
        stock: number | null;
        sku: string | null;
        image: string | null;
        isDefault: boolean;
        sortOrder: number;
        uploading?: boolean;
      }>;
    }>
  >(() => {
    const groups = product?.variantGroups ?? [];
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      sortOrder: g.sortOrder,
      options: (g.options ?? []).map((o) => ({
        id: o.id,
        value: o.value,
        priceAdd: o.priceAdd,
        stock: o.stock,
        sku: o.sku,
        image: o.image,
        isDefault: o.isDefault,
        sortOrder: o.sortOrder,
      })),
    }));
  });
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>(() => {
    const rel = product?.relatedProducts ?? [];
    return [...rel].sort((a, b) => a.sortOrder - b.sortOrder);
  });
  const [relatedModalOpen, setRelatedModalOpen] = useState(false);
  const [relatedQuery, setRelatedQuery] = useState("");
  const { t } = useAdminI18n();

  async function internalSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (!product?.id) fd.append("id", "");
    else fd.set("id", product.id);
    const sku = (fd.get("sku") as string)?.trim();
    if (!sku && !product) {
      fd.set("sku", `SKU-${Date.now()}`);
    }
    const files = selectedFiles.length > 0 ? selectedFiles : null;
    fd.set("variantGroups", JSON.stringify(variantGroups));
    fd.set(
      "relatedProducts",
      JSON.stringify(relatedProducts.map((p, idx) => ({ id: p.id, sortOrder: idx }))),
    );
    setPending(true);
    try {
      await onSubmit(fd, files);
      setSelectedFiles([]);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={internalSubmit} className="grid gap-3">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-slate-700">
          {t("productNameHe")}
          <input
            name="name_he"
            required
            defaultValue={product?.name_he}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          {t("productNameAr")}
          <input
            name="name_ar"
            required
            defaultValue={product?.name_ar}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          {t("productNameEn")}
          <input
            name="name_en"
            required
            defaultValue={product?.name_en}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="sm:col-span-3 text-xs font-medium text-slate-700">
          {t("productDescriptionHe")}
          <textarea
            name="description_he"
            rows={2}
            defaultValue={product?.description_he ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="sm:col-span-3 text-xs font-medium text-slate-700">
          {t("productDescriptionAr")}
          <textarea
            name="description_ar"
            rows={2}
            defaultValue={product?.description_ar ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="sm:col-span-3 text-xs font-medium text-slate-700">
          {t("productDescriptionEn")}
          <textarea
            name="description_en"
            rows={2}
            defaultValue={product?.description_en ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-slate-700">
          {t("productSku")}
          <input
            name="sku"
            required={!!product}
            defaultValue={product?.sku}
            placeholder={t("productSkuPlaceholder")}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          {t("productCategory")}
          <select
            name="categoryId"
            required
            defaultValue={product?.categoryId}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-700">
          {t("stock")}
          <input
            name="stock"
            type="number"
            required
            defaultValue={product?.stock ?? 0}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          {t("price")}
          <input
            name="price"
            type="number"
            step="0.01"
            required
            defaultValue={product?.price ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          {t("productOldPrice")}
          <input
            name="oldPrice"
            type="number"
            step="0.01"
            defaultValue={product?.oldPrice ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          {t("productDiscountPercent")}
          <input
            name="discountPercent"
            type="number"
            defaultValue={product?.discountPercent ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={product?.active ?? true} value="on" />
        {t("productActive")}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} value="on" />
        {t("productFeatured")}
      </label>

      <ProductImagesSection
        product={product ? { id: product.id, images: product.images } : null}
        galleryDisplay={galleryDisplay}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        onRefresh={onRefresh}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">אפשרויות מוצר</div>
            <div className="mt-0.5 text-xs text-slate-500">קבוצות דינמיות (צבע, נפח, RAM ועוד) עם תוספת מחיר לכל אפשרות.</div>
          </div>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
            onClick={() =>
              setVariantGroups((prev) => [
                ...prev,
                {
                  id: `new-group-${Date.now()}`,
                  name: "",
                  sortOrder: prev.length,
                  options: [],
                },
              ])
            }
          >
            + הוסף קבוצת אפשרויות
          </button>
        </div>

        {variantGroups.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
            אין אפשרויות מוגדרות. הוסיפו קבוצה כדי לאפשר וריאציות ומחיר דינמי.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {variantGroups.map((g) => (
              <div key={g.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-700">
                    שם קבוצה
                    <input
                      value={g.name}
                      onChange={(e) =>
                        setVariantGroups((prev) =>
                          prev.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)),
                        )
                      }
                      placeholder="לדוגמה: צבע / נפח / RAM"
                      className="mt-1 w-64 max-w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      onClick={() =>
                        setVariantGroups((prev) =>
                          prev.map((x) =>
                            x.id === g.id
                              ? {
                                  ...x,
                                  options: [
                                    ...x.options,
                                    {
                                      id: `new-opt-${Date.now()}`,
                                      value: "",
                                      priceAdd: 0,
                                      stock: null,
                                      sku: null,
                                      image: null,
                                      isDefault: x.options.length === 0,
                                      sortOrder: x.options.length,
                                    },
                                  ],
                                }
                              : x,
                          ),
                        )
                      }
                    >
                      ➕ הוסף אפשרות
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => setVariantGroups((prev) => prev.filter((x) => x.id !== g.id))}
                    >
                      מחק קבוצה
                    </button>
                  </div>
                </div>

                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2">ערך</th>
                        <th className="px-3 py-2">תוספת מחיר</th>
                        <th className="px-3 py-2">מלאי</th>
                        <th className="px-3 py-2">SKU</th>
                        <th className="px-3 py-2">תמונה</th>
                        <th className="px-3 py-2">ברירת מחדל</th>
                        <th className="px-3 py-2 text-end"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.options.map((o) => (
                        <tr key={o.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">
                            <input
                              value={o.value}
                              onChange={(e) =>
                                setVariantGroups((prev) =>
                                  prev.map((x) =>
                                    x.id !== g.id
                                      ? x
                                      : {
                                          ...x,
                                          options: x.options.map((oo) => (oo.id === o.id ? { ...oo, value: e.target.value } : oo)),
                                        },
                                  ),
                                )
                              }
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                              placeholder="לדוגמה: שחור / 256GB"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={Number.isFinite(o.priceAdd) ? o.priceAdd : 0}
                              onChange={(e) => {
                                const v = Number(e.target.value || 0);
                                setVariantGroups((prev) =>
                                  prev.map((x) =>
                                    x.id !== g.id
                                      ? x
                                      : { ...x, options: x.options.map((oo) => (oo.id === o.id ? { ...oo, priceAdd: v } : oo)) },
                                  ),
                                );
                              }}
                              type="number"
                              step="0.01"
                              className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs tabular-nums"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={o.stock ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const v = raw.trim() === "" ? null : Number(raw);
                                setVariantGroups((prev) =>
                                  prev.map((x) =>
                                    x.id !== g.id ? x : { ...x, options: x.options.map((oo) => (oo.id === o.id ? { ...oo, stock: v } : oo)) },
                                  ),
                                );
                              }}
                              type="number"
                              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs tabular-nums"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={o.sku ?? ""}
                              onChange={(e) =>
                                setVariantGroups((prev) =>
                                  prev.map((x) =>
                                    x.id !== g.id ? x : { ...x, options: x.options.map((oo) => (oo.id === o.id ? { ...oo, sku: e.target.value || null } : oo)) },
                                  ),
                                )
                              }
                              className="w-40 rounded-md border border-slate-300 px-2 py-1 text-xs font-mono"
                              placeholder="אופציונלי"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 overflow-hidden rounded border border-slate-200 bg-slate-50">
                                <AssetImg path={o.image} alt="" className="h-full w-full object-cover" />
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="max-w-[180px] text-[11px]"
                                onChange={async (e) => {
                                  const input = e.currentTarget;
                                  const f = input.files?.[0] ?? null;
                                  if (!f) return;
                                  setVariantGroups((prev) =>
                                    prev.map((x) =>
                                      x.id !== g.id
                                        ? x
                                        : {
                                            ...x,
                                            options: x.options.map((oo) => (oo.id === o.id ? { ...oo, uploading: true } : oo)),
                                          },
                                    ),
                                  );
                                  try {
                                    const path = await uploadAdminAsset(f, "products", {
                                      entityId: product?.id ?? "new",
                                      originalName: f.name,
                                    });
                                    setVariantGroups((prev) =>
                                      prev.map((x) =>
                                        x.id !== g.id
                                          ? x
                                          : {
                                              ...x,
                                              options: x.options.map((oo) => (oo.id === o.id ? { ...oo, image: path, uploading: false } : oo)),
                                            },
                                      ),
                                    );
                                  } catch {
                                    setVariantGroups((prev) =>
                                      prev.map((x) =>
                                        x.id !== g.id
                                          ? x
                                          : {
                                              ...x,
                                              options: x.options.map((oo) => (oo.id === o.id ? { ...oo, uploading: false } : oo)),
                                            },
                                      ),
                                    );
                                  } finally {
                                    // The input may be unmounted after state updates; guard access.
                                    try {
                                      input.value = "";
                                    } catch {
                                      // ignore
                                    }
                                  }
                                }}
                              />
                              {o.uploading ? <span className="text-[10px] text-slate-500">מעלה…</span> : null}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="radio"
                              name={`default-${g.id}`}
                              checked={o.isDefault}
                              onChange={() =>
                                setVariantGroups((prev) =>
                                  prev.map((x) =>
                                    x.id !== g.id
                                      ? x
                                      : { ...x, options: x.options.map((oo) => ({ ...oo, isDefault: oo.id === o.id })) },
                                  ),
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-end">
                            <button
                              type="button"
                              className="text-[11px] text-red-600 hover:underline"
                              onClick={() =>
                                setVariantGroups((prev) =>
                                  prev.map((x) =>
                                    x.id !== g.id ? x : { ...x, options: x.options.filter((oo) => oo.id !== o.id).map((oo, idx) => ({ ...oo, sortOrder: idx })) },
                                  ),
                                )
                              }
                            >
                              מחק
                            </button>
                          </td>
                        </tr>
                      ))}
                      {g.options.length === 0 && (
                        <tr className="border-t border-slate-100">
                          <td className="px-3 py-3 text-center text-xs text-slate-500" colSpan={7}>
                            אין אפשרויות בקבוצה.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">מוצרים משלימים</div>
            <div className="mt-0.5 text-xs text-slate-500">בחרו מוצרים קיימים כדי להציע Cross‑sell לפני הוספה לסל.</div>
          </div>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
            onClick={() => setRelatedModalOpen(true)}
          >
            + הוסף מוצר משלים
          </button>
        </div>

        {relatedProducts.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
            אין מוצרים משלימים כרגע.
          </div>
        ) : (
          <ul className="mt-4 grid gap-2">
            {relatedProducts.map((rp, idx) => (
              <li key={rp.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="h-10 w-10 overflow-hidden rounded-md border border-slate-200 bg-white">
                  <AssetImg path={rp.image} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900">{rp.name_he}</div>
                  <div className="text-xs text-slate-500">₪{rp.price.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={idx === 0}
                    onClick={() =>
                      setRelatedProducts((prev) => {
                        if (idx === 0) return prev;
                        const next = [...prev];
                        const tmp = next[idx - 1];
                        next[idx - 1] = next[idx];
                        next[idx] = tmp;
                        return next;
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={idx === relatedProducts.length - 1}
                    onClick={() =>
                      setRelatedProducts((prev) => {
                        if (idx === prev.length - 1) return prev;
                        const next = [...prev];
                        const tmp = next[idx + 1];
                        next[idx + 1] = next[idx];
                        next[idx] = tmp;
                        return next;
                      })
                    }
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => setRelatedProducts((prev) => prev.filter((x) => x.id !== rp.id))}
                  >
                    הסר
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <AdminModal open={relatedModalOpen} onClose={() => setRelatedModalOpen(false)} title="הוסף מוצרים משלימים" size="lg">
          <div className="space-y-3">
            <input
              value={relatedQuery}
              onChange={(e) => setRelatedQuery(e.target.value)}
              placeholder="חפש מוצר..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-white">
              <ul className="divide-y divide-slate-100">
                {allProducts
                  .filter((p) => p.id !== product?.id)
                  .filter((p) => {
                    const q = relatedQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      p.name_he.toLowerCase().includes(q) ||
                      p.name_en.toLowerCase().includes(q) ||
                      p.sku.toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 60)
                  .map((p) => {
                    const main = p.images.find((i) => i.isMain) ?? p.images[0];
                    const checked = relatedProducts.some((x) => x.id === p.id);
                    return (
                      <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setRelatedProducts((prev) => {
                              const exists = prev.some((x) => x.id === p.id);
                              if (exists) return prev.filter((x) => x.id !== p.id);
                              return [
                                ...prev,
                                {
                                  id: p.id,
                                  name_he: p.name_he,
                                  name_ar: p.name_ar,
                                  name_en: p.name_en,
                                  price: p.price,
                                  image: main?.url ?? null,
                                  sortOrder: prev.length,
                                },
                              ];
                            });
                          }}
                        />
                        <div className="h-10 w-10 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                          <AssetImg path={main?.url ?? null} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-900">{p.name_he}</div>
                          <div className="text-xs text-slate-500">₪{p.price.toFixed(2)} • {p.sku}</div>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm" onClick={() => setRelatedModalOpen(false)}>
                סגור
              </button>
              <button type="button" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => setRelatedModalOpen(false)}>
                שמור בחירה
              </button>
            </div>
          </div>
        </AdminModal>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending && <AdminSpinner className="h-4 w-4 border-t-white" />}
          {t("save")}
        </button>
      </div>
    </form>
  );
}
