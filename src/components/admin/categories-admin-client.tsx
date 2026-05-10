"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { deleteAllStoreCategories, deleteCategory, upsertCategory } from "@/app/admin/actions";
import { AdminBulkDeleteModal } from "@/components/admin/admin-bulk-delete-modal";
import { useAdminI18n } from "@/lib/admin-i18n";
import { uploadAdminAsset } from "@/lib/admin-upload-client";
import { CategoryTreeTable } from "@/components/admin/category-tree-table";

export type CategoryRow = {
  id: string;
  parentId: string | null;
  name_he: string;
  name_ar: string;
  name_en: string;
  description_he: string | null;
  description_ar: string | null;
  description_en: string | null;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
};

export function CategoriesAdminClient({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<CategoryRow | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [presetParentId, setPresetParentId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { t } = useAdminI18n();

  const refresh = () => startTransition(() => router.refresh());

  async function submit(form: HTMLFormElement, file?: File | null) {
    const fd = new FormData(form);
    if (file) {
      const path = await uploadAdminAsset(file, "categories");
      fd.set("imageUrl", path);
    }
    const res = await upsertCategory(fd);
    if (!res.ok) setToast(res.error);
    else {
      setToast(t("savedSuccessfully"));
      setOpen(false);
      setEdit(null);
      refresh();
    }
  }

  const mains = categories
    .filter((c) => c.parentId == null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      {toast && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">{toast}</div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("categories")}</h1>
          <p className="text-sm text-slate-500">{t("categoriesSubtitle")}</p>
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
            {t("bulkDeleteAllCategories")}
          </button>
          <button
            type="button"
            onClick={() => {
              setPresetParentId(null);
              setOpen(true);
            }}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            {t("addMainCategory")}
          </button>
        </div>
      </div>

      <AdminBulkDeleteModal
        open={bulkDeleteOpen}
        onClose={() => !bulkDeleting && setBulkDeleteOpen(false)}
        title={t("bulkDeleteCategoriesTitle")}
        description={t("bulkDeleteCategoriesWarning")}
        typeDeleteHint={t("typeDeleteToConfirm")}
        cancelLabel={t("cancel")}
        confirmLabel={t("bulkDeleteAllCategories")}
        pending={bulkDeleting}
        onConfirmed={async (phrase) => {
          setBulkDeleting(true);
          try {
            const res = await deleteAllStoreCategories(phrase);
            if (!res.ok) setToast(res.error);
            else {
              setToast(t("allCategoriesDeletedToast"));
              setBulkDeleteOpen(false);
              refresh();
            }
          } finally {
            setBulkDeleting(false);
          }
        }}
      />

      <CategoryTreeTable
        categories={categories}
        onEdit={(cat) => setEdit(cat)}
        onDelete={(id) => setDelId(id)}
        onAddChild={(parentId) => {
          setPresetParentId(parentId);
          setOpen(true);
        }}
        accordionMode
      />

      {pending && (
        <div className="fixed bottom-6 left-6 z-[90] flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-white">
          <AdminSpinner className="h-4 w-4 border-t-white" />
          <span className="text-sm">{t("updating")}</span>
        </div>
      )}

      <AdminModal open={open} onClose={() => setOpen(false)} title={t("add")} size="lg">
        <CategoryForm
          categories={mains}
          presetParentId={presetParentId}
          onSubmit={(f, file) => void submit(f, file)}
          onCancel={() => setOpen(false)}
        />
      </AdminModal>

      <AdminModal open={!!edit} onClose={() => setEdit(null)} title={t("edit")} size="lg">
        {edit && (
          <CategoryForm
            category={edit}
            categories={mains}
            onSubmit={(f, file) => void submit(f, file)}
            onCancel={() => setEdit(null)}
          />
        )}
      </AdminModal>

      <AdminModal
        open={!!delId}
        onClose={() => setDelId(null)}
        title={t("delete")}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setDelId(null)}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
              onClick={async () => {
                if (!delId) return;
                const fd = new FormData();
                fd.append("id", delId);
                const res = await deleteCategory(fd);
                if (!res.ok) setToast(res.error);
                else {
                  setDelId(null);
                  setToast("נמחק");
                  refresh();
                }
              }}
            >
              {t("delete")}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">{t("confirmDeleteCategory")}</p>
      </AdminModal>
    </div>
  );
}

function CategoryForm({
  category,
  categories,
  presetParentId,
  onSubmit,
  onCancel,
}: {
  category?: CategoryRow;
  categories: CategoryRow[];
  presetParentId?: string | null;
  onSubmit: (form: HTMLFormElement, file: File | null) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState(false);
  const { t } = useAdminI18n();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const form = e.currentTarget;
        const input = form.elements.namedItem("imageFile") as HTMLInputElement;
        const file = input?.files?.[0] ?? null;
        await onSubmit(form, file);
        setPending(false);
      }}
      className="grid gap-3"
    >
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <label className="text-xs font-medium">
        {t("parentCategory")}
        <select
          name="parentId"
          defaultValue={category?.parentId ?? presetParentId ?? ""}
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
        >
          <option value="">{t("mainCategory")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_he}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-medium">
          {t("categoryNameHe")}
          <input name="name_he" required defaultValue={category?.name_he} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-medium">
          {t("categoryNameAr")}
          <input name="name_ar" required defaultValue={category?.name_ar} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-medium">
          {t("categoryNameEn")}
          <input name="name_en" required defaultValue={category?.name_en} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
      </div>
      <label className="text-xs font-medium">
        {t("categoryDescriptionHe")}
        <textarea name="description_he" rows={2} defaultValue={category?.description_he ?? ""} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium">
        {t("categoryDescriptionAr")}
        <textarea name="description_ar" rows={2} defaultValue={category?.description_ar ?? ""} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium">
        {t("categoryDescriptionEn")}
        <textarea name="description_en" rows={2} defaultValue={category?.description_en ?? ""} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium">
        {t("categoryImage")}
        <input name="imageFile" type="file" accept="image/*" className="mt-1 text-sm" />
      </label>
      <input type="hidden" name="imageUrl" value={category?.imageUrl ?? ""} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-medium">
          {t("displayOrder")}
          <input name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
        <label className="mt-6 flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={category?.active ?? true} value="on" />
          {t("categoryActive")}
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">
          {t("cancel")}
        </button>
        <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">
          {pending && <AdminSpinner className="h-4 w-4 border-t-white" />}
          {t("save")}
        </button>
      </div>
    </form>
  );
}
