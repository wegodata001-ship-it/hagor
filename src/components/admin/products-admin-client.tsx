"use client";

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
  product,
  onSubmit,
  onCancel,
  onRefresh,
}: {
  categories: CategoryOpt[];
  product?: ProductRow;
  onSubmit: (fd: FormData, files: FileList | null) => Promise<void>;
  onCancel: () => void;
  onRefresh?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
                <img src={p.url} alt={p.name} className="h-20 w-20 rounded border object-cover" />
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
