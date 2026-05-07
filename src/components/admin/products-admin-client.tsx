"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AssetImg } from "@/components/asset-img";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { useAdminI18n } from "@/lib/admin-i18n";
import { uploadAdminAsset } from "@/lib/admin-upload-client";
import {
  addProductImage,
  deleteProduct,
  deleteProductImage,
  reorderProductImage,
  setMainProductImage,
  upsertProduct,
} from "@/app/admin/actions";

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
  categoryId: string;
  category: { name_he: string };
  images: Img[];
  variantGroups: VariantGroup[];
  relatedProducts: RelatedProduct[];
};

export type CategoryOpt = { id: string; label: string };

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
  initialOpenAdd,
}: {
  products: ProductRow[];
  categories: CategoryOpt[];
  initialOpenAdd?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { t } = useAdminI18n();

  useEffect(() => {
    if (initialOpenAdd || searchParams.get("add") === "1") {
      setAddOpen(true);
      router.replace("/admin/products", { scroll: false });
    }
  }, [initialOpenAdd, router, searchParams]);

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const handleUpsert = async (form: FormData, files: FileList | null, editing: ProductRow | null) => {
    const res = await upsertProduct(form);
    if (!res.ok) {
      setToast(res.error);
      return;
    }
    const pid = res.data.productId;

    if (files && files.length > 0 && pid) {
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
      {toast && (
        <SuccessBar message={toast === "error" ? "שגיאה" : toast} onDismiss={() => setToast(null)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("products")}</h1>
          <p className="text-sm text-slate-500">{t("productsSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {t("addProduct")}
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
            {products.map((p) => {
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
        {products.length === 0 && (
          <p className="p-8 text-center text-slate-500">{t("noProducts")}</p>
        )}
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
  product,
  onSubmit,
  onCancel,
  onRefresh,
}: {
  categories: CategoryOpt[];
  allProducts: ProductRow[];
  product?: ProductRow;
  onSubmit: (fd: FormData, files: FileList | null) => Promise<void>;
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
  const previews = useMemo(
    () => selectedFiles.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [selectedFiles],
  );

  useEffect(() => {
    return () => {
      for (const p of previews) URL.revokeObjectURL(p.url);
    };
  }, [previews]);

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
    const files = (form.elements.namedItem("images") as HTMLInputElement)?.files;
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
      <label className="text-xs font-medium text-slate-700">
        {t("productImagesLabel")}
        <input
          name="images"
          type="file"
          accept="image/*"
          multiple
          className="mt-1 text-sm"
          onChange={(e) => setSelectedFiles(Array.from(e.currentTarget.files ?? []))}
        />
      </label>
      {selectedFiles.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
          <div className="text-xs font-medium text-orange-800">תצוגה מקדימה לפני שמירה</div>
          <ul className="mt-2 flex flex-wrap gap-3">
            {previews.map((p) => (
              <li key={p.url} className="w-20">
                <Image
                  src={p.url}
                  alt={p.name}
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded border object-cover"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {product && product.images.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-700">{t("existingImages")}</div>
          <ul className="mt-2 flex flex-wrap gap-3">
            {[...product.images].sort((a, b) => a.sortOrder - b.sortOrder).map((im) => (
              <li key={im.id} className="relative w-20">
                <AssetImg path={im.url} alt="" className="h-20 w-20 rounded border object-cover" />
                <div className="mt-1 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="text-[10px] text-slate-600"
                    onClick={async () => {
                      const fd = new FormData();
                      fd.append("imageId", im.id);
                      fd.append("direction", "up");
                      await reorderProductImage(fd);
                      onRefresh?.();
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="text-[10px] text-slate-600"
                    onClick={async () => {
                      const fd = new FormData();
                      fd.append("imageId", im.id);
                      fd.append("direction", "down");
                      await reorderProductImage(fd);
                      onRefresh?.();
                    }}
                  >
                    ↓
                  </button>
                  {!im.isMain && (
                    <button
                      type="button"
                      className="text-[10px] text-blue-600"
                      onClick={async () => {
                        const fd = new FormData();
                        fd.append("productId", product.id);
                        fd.append("imageId", im.id);
                        await setMainProductImage(fd);
                        onRefresh?.();
                      }}
                    >
                      {t("main")}
                    </button>
                  )}
                  {im.isMain && <span className="text-[10px] text-emerald-700">{t("main")}</span>}
                  <button
                    type="button"
                    className="text-[10px] text-red-600"
                    onClick={async () => {
                      const fd = new FormData();
                      fd.append("imageId", im.id);
                      await deleteProductImage(fd);
                      onRefresh?.();
                    }}
                  >
                    {t("deleteShort")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
