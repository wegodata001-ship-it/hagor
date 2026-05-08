"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { saveHomeHero, saveStoreSettings } from "@/app/admin/actions";
import { useAdminI18n } from "@/lib/admin-i18n";
import { uploadAdminAsset } from "@/lib/admin-upload-client";

export function SettingsAdminClient({
  storeName,
  settings,
  hero,
}: {
  storeName: string;
  settings: {
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
    whatsappPhone: string | null;
    supportEmail: string | null;
    languageDefault: string;
    orderNumberPrefix: string;
    currency: string;
    rtlEnabled: boolean;
    secondaryColor: string;
    registrationEnabled: boolean;
    requireEmailVerificationForCheckout: boolean;
  };
  hero: {
    heroTitle_he: string | null;
    heroTitle_ar: string | null;
    heroTitle_en: string | null;
    heroSubtitle_he: string | null;
    heroSubtitle_ar: string | null;
    heroSubtitle_en: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const { t } = useAdminI18n();

  const refresh = () => startTransition(() => router.refresh());

  return (
    <div className="space-y-8">
      {toast && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">{toast}</div>}
      <h1 className="text-xl font-semibold text-slate-900">{t("storeSettingsTitle")}</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">{t("general")}</h2>
        <form
          className="mt-4 grid max-w-3xl gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const fi = form.elements.namedItem("logoFile") as HTMLInputElement;
            if (fi?.files?.[0]) {
              const path = await uploadAdminAsset(fi.files[0], "logo");
              fd.set("logoUrl", path);
            }
            const res = await saveStoreSettings(fd);
            if (!res.ok) setToast(res.error);
            else {
              setToast(t("savedSuccessfully"));
              refresh();
            }
          }}
        >
          <label className="text-xs font-medium">
            {t("storeNameLabel")}
            <input name="storeName" required defaultValue={storeName} className="ds-input mt-1 text-sm" />
          </label>
          <input type="hidden" name="logoUrl" value={settings.logoUrl ?? ""} />
          <label className="text-xs font-medium">
            {t("logoUpload")}
            <input name="logoFile" type="file" accept="image/*" className="mt-1 text-sm" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium">
              {t("primaryColor")}
              <input name="primaryColor" type="color" defaultValue={settings.primaryColor} className="mt-1 h-10 w-full" />
            </label>
            <label className="text-xs font-medium">
              {t("accentColor")}
              <input name="accentColor" type="color" defaultValue={settings.accentColor} className="mt-1 h-10 w-full" />
            </label>
          </div>
          <input type="hidden" name="secondaryColor" value={settings.secondaryColor} />
          <label className="text-xs font-medium">
            {t("whatsapp")}
            <input name="whatsappPhone" defaultValue={settings.whatsappPhone ?? ""} className="ds-input mt-1 text-sm" />
          </label>
          <label className="text-xs font-medium">
            {t("supportEmail")}
            <input name="supportEmail" type="email" defaultValue={settings.supportEmail ?? ""} className="ds-input mt-1 text-sm" />
          </label>
          <label className="text-xs font-medium">
            {t("defaultLanguage")}
            <input name="languageDefault" defaultValue={settings.languageDefault} className="ds-input mt-1 text-sm" />
          </label>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" name="rtlEnabled" defaultChecked={settings.rtlEnabled} value="on" />
            {t("rtlEnabledLabel")}
          </label>
          <input type="hidden" name="currency" value={settings.currency} />
          <label className="text-xs font-medium">
            {t("orderNumberPrefix")}
            <input name="orderNumberPrefix" defaultValue={settings.orderNumberPrefix} className="ds-input mt-1 font-mono text-sm uppercase" />
          </label>

          <div className="col-span-full border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-800">תקנון ומדיניות</h3>
            <p className="mt-1 text-xs text-slate-500">
              עריכת תקנון, פרטיות, החזרות ומשלוחים בשלוש שפות — בדף ייעודי עם עורך עשיר.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  name="registrationEnabled"
                  defaultChecked={settings.registrationEnabled}
                  value="on"
                />
                הרשמת לקוחות פעילה
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  name="requireEmailVerificationForCheckout"
                  defaultChecked={settings.requireEmailVerificationForCheckout}
                  value="on"
                />
                אימות אימייל נדרש לפני הזמנה (לקוח מחובר)
              </label>
            </div>
            <Link
              href="/admin/settings/terms"
              className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              פתיחת עורך תקנון ומדיניות
            </Link>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {pending && <AdminSpinner className="h-4 w-4 border-t-white" />}
            {t("save")}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">{t("homepageHeroOptional")}</h2>
        <form
          className="mt-4 grid gap-3 md:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const res = await saveHomeHero(fd);
            if (!res.ok) setToast(res.error);
            else {
              setToast(t("homeHeroSaved"));
              refresh();
            }
          }}
        >
          <label className="text-xs font-medium">
            {t("heroTitleHe")}
            <input name="heroTitle_he" defaultValue={hero.heroTitle_he ?? ""} className="ds-input mt-1 text-sm" />
          </label>
          <label className="text-xs font-medium">
            {t("heroTitleAr")}
            <input name="heroTitle_ar" defaultValue={hero.heroTitle_ar ?? ""} className="ds-input mt-1 text-sm" />
          </label>
          <label className="text-xs font-medium">
            {t("heroTitleEn")}
            <input name="heroTitle_en" defaultValue={hero.heroTitle_en ?? ""} className="ds-input mt-1 text-sm" />
          </label>
          <label className="md:col-span-3 text-xs font-medium">
            {t("heroSubtitleHe")}
            <textarea name="heroSubtitle_he" rows={2} defaultValue={hero.heroSubtitle_he ?? ""} className="ds-textarea mt-1 text-sm" />
          </label>
          <label className="md:col-span-3 text-xs font-medium">
            {t("heroSubtitleAr")}
            <textarea name="heroSubtitle_ar" rows={2} defaultValue={hero.heroSubtitle_ar ?? ""} className="ds-textarea mt-1 text-sm" />
          </label>
          <label className="md:col-span-3 text-xs font-medium">
            {t("heroSubtitleEn")}
            <textarea name="heroSubtitle_en" rows={2} defaultValue={hero.heroSubtitle_en ?? ""} className="ds-textarea mt-1 text-sm" />
          </label>
          <button type="submit" className="md:col-span-3 w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
            {t("saveHero")}
          </button>
        </form>
      </section>
    </div>
  );
}
