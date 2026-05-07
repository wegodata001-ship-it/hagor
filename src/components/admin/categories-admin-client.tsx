"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { deleteCategory, upsertCategory } from "@/app/admin/actions";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("categories")}</h1>
          <p className="text-sm text-slate-500">{t("categoriesSubtitle")}</p>
        </div>
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
