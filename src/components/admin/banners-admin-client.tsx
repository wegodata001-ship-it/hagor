"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AssetImg } from "@/components/asset-img";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { deleteBanner, setBannerAsHero, upsertBanner } from "@/app/admin/actions";
import { useAdminI18n } from "@/lib/admin-i18n";
import { uploadAdminAsset } from "@/lib/admin-upload-client";

export type BannerDTO = {
  id: string;
  title_he: string;
  title_ar: string;
  title_en: string;
  subtitle_he: string | null;
  subtitle_ar: string | null;
  subtitle_en: string | null;
  imageUrl: string;
  buttonText_he: string | null;
  buttonText_ar: string | null;
  buttonText_en: string | null;
  buttonUrl: string | null;
  type: "HERO" | "SECTION" | "POPUP" | "PROMO";
  isHero: boolean;
  active: boolean;
  sortOrder: number;
};

export function BannersAdminClient({ banners }: { banners: BannerDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<BannerDTO | null>(null);
  const [preview, setPreview] = useState<BannerDTO | null>(null);
  const { t } = useAdminI18n();

  const refresh = () => startTransition(() => router.refresh());

  async function submit(form: HTMLFormElement, imageFile: File | null) {
    const fd = new FormData(form);
    let imageUrl = (fd.get("imageUrl") as string)?.trim() ?? "";
    if (imageFile) imageUrl = await uploadAdminAsset(imageFile, "banners");
    if (!imageUrl) {
      setToast(t("requiredImage"));
      return;
    }
    if (imageFile && !fd.get("id")) {
      const asHero = window.confirm(t("askUseAsHero"));
      if (asHero) {
        fd.set("isHero", "on");
        fd.set("type", "HERO");
        fd.set("active", "on");
      }
    }
    fd.set("imageUrl", imageUrl);
    const res = await upsertBanner(fd);
    if (!res.ok) setToast(res.error);
    else {
      setToast(t("savedSuccessfully"));
      setOpen(false);
      setEdit(null);
      refresh();
    }
  }

  return (
    <div>
      {toast && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">{toast}</div>}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("banners")}</h1>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          {t("addBanner")}
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">{t("image")}</th>
              <th className="px-4 py-3">{t("title")}</th>
              <th className="px-4 py-3">{t("active")}</th>
              <th className="px-4 py-3">{t("order")}</th>
              <th className="px-4 py-3 text-end">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {banners.map((b) => (
              <tr
                key={b.id}
                className={`border-b border-slate-100 ${
                  b.isHero ? "bg-gradient-to-r from-blue-50 via-violet-50 to-blue-50" : ""
                }`}
              >
                <td className="px-4 py-2">
                  <div
                    className={`h-14 w-28 overflow-hidden rounded border bg-slate-50 ${
                      b.isHero ? "border-violet-400 shadow-[0_0_0_2px_rgba(99,102,241,0.25)]" : ""
                    }`}
                  >
                    <AssetImg path={b.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                </td>
                <td className="px-4 py-2 font-medium">
                  <div className="flex items-center gap-2">
                    <span>{b.title_he}</span>
                    {b.isHero && (
                      <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {t("mainHero")}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {t("type")}: {b.type}
                  </div>
                </td>
                <td className="px-4 py-2">{b.active ? t("yes") : t("no")}</td>
                <td className="px-4 py-2">{b.sortOrder}</td>
                <td className="px-4 py-2 text-end">
                  <button type="button" className="text-slate-700 hover:underline" onClick={() => setPreview(b)}>
                    {t("preview")}
                  </button>
                  <span className="mx-2 text-slate-300">|</span>
                  <button type="button" className="text-blue-600 hover:underline" onClick={() => setEdit(b)}>
                    {t("edit")}
                  </button>
                  <span className="mx-2 text-slate-300">|</span>
                  <button
                    type="button"
                    className="text-violet-700 hover:underline"
                    onClick={async () => {
                      const fd = new FormData();
                      fd.append("id", b.id);
                      const res = await setBannerAsHero(fd);
                      if (!res.ok) setToast(res.error);
                      else {
                        setToast(t("heroUpdated"));
                        refresh();
                      }
                    }}
                  >
                    ⭐ {t("setAsHero")}
                  </button>
                  <span className="mx-2 text-slate-300">|</span>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={async () => {
                      const fd = new FormData();
                      fd.append("id", b.id);
                      const res = await deleteBanner(fd);
                      if (!res.ok) setToast(res.error);
                      else {
                        setToast(t("deletedSuccessfully"));
                        refresh();
                      }
                    }}
                  >
                    {t("delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pending && (
        <div className="fixed bottom-6 left-6 z-[90] rounded-lg bg-slate-900 px-3 py-2 text-white">
          <AdminSpinner className="h-4 w-4 border-t-white" />
        </div>
      )}

      <AdminModal open={open} onClose={() => setOpen(false)} title={t("addBanner")} size="xl">
        <BannerForm onSubmit={(f, img) => void submit(f, img)} onCancel={() => setOpen(false)} />
      </AdminModal>

      <AdminModal open={!!edit} onClose={() => setEdit(null)} title={t("edit")} size="xl">
        {edit && <BannerForm banner={edit} onSubmit={(f, img) => void submit(f, img)} onCancel={() => setEdit(null)} />}
      </AdminModal>

      <AdminModal open={!!preview} onClose={() => setPreview(null)} title={t("preview")} size="xl">
        {preview && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <AssetImg path={preview.imageUrl} alt={preview.title_he} className="h-72 w-full object-cover" />
            </div>
            <div className="text-sm font-medium text-slate-800">{preview.title_he}</div>
            <div className="text-sm text-slate-600">{preview.subtitle_he ?? ""}</div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}

function BannerForm({
  banner,
  onSubmit,
  onCancel,
}: {
  banner?: BannerDTO;
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
        const fi = form.elements.namedItem("imageFile") as HTMLInputElement;
        await onSubmit(form, fi?.files?.[0] ?? null);
        setPending(false);
      }}
      className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1"
    >
      <input type="hidden" name="id" value={banner?.id ?? ""} />
      <input type="hidden" name="imageUrl" value={banner?.imageUrl ?? ""} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-medium">
          {t("bannerType")}
          <select
            name="type"
            defaultValue={banner?.type ?? "SECTION"}
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          >
            <option value="HERO">{t("bannerTypeHero")}</option>
            <option value="SECTION">{t("bannerTypeSection")}</option>
            <option value="POPUP">{t("bannerTypePopup")}</option>
            <option value="PROMO">{t("bannerTypePromo")}</option>
          </select>
        </label>
        <label className="mt-6 flex items-center gap-2 text-sm">
          <input type="checkbox" name="isHero" defaultChecked={banner?.isHero ?? false} value="on" />
          {t("mainHero")}
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-medium">
          {t("bannerTitleHe")}
          <input name="title_he" required defaultValue={banner?.title_he} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-medium">
          {t("bannerTitleAr")}
          <input name="title_ar" required defaultValue={banner?.title_ar} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-medium">
          {t("bannerTitleEn")}
          <input name="title_en" required defaultValue={banner?.title_en} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-medium">
          {t("bannerSubtitleHe")}
          <input name="subtitle_he" defaultValue={banner?.subtitle_he ?? ""} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-medium">
          {t("bannerSubtitleAr")}
          <input name="subtitle_ar" defaultValue={banner?.subtitle_ar ?? ""} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-medium">
          {t("bannerSubtitleEn")}
          <input name="subtitle_en" defaultValue={banner?.subtitle_en ?? ""} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
      </div>
      <label className="text-xs font-medium">
        {t("bannerImage")}
        <input name="imageFile" type="file" accept="image/*" className="mt-1 text-sm" />
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-medium">
          {t("buttonTextHe")}
          <input name="buttonText_he" defaultValue={banner?.buttonText_he ?? ""} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-medium">
          {t("buttonTextAr")}
          <input name="buttonText_ar" defaultValue={banner?.buttonText_ar ?? ""} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-medium">
          {t("buttonTextEn")}
          <input name="buttonText_en" defaultValue={banner?.buttonText_en ?? ""} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
      </div>
      <label className="text-xs font-medium">
        {t("buttonUrlLabel")}
        <input name="buttonUrl" defaultValue={banner?.buttonUrl ?? ""} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-medium">
          {t("displayOrder")}
          <input name="sortOrder" type="number" defaultValue={banner?.sortOrder ?? 0} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
        <label className="mt-6 flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={banner?.active ?? true} value="on" />
          {t("bannerActive")}
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
