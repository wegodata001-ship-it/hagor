"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  deleteLoyaltyReward,
  saveLoyaltySettings,
  upsertLoyaltyReward,
} from "@/app/admin/actions";

export type LoyaltySettingsDTO = {
  enabled: boolean;
  pointsPerShekel: number;
  minOrderForPoints: number;
  pointsToIlsRate: number;
  allowRedeem: boolean;
  pointsExpireDays: number | null;
};

export type LoyaltyRewardDTO = {
  id: string;
  title_he: string;
  title_ar: string;
  title_en: string;
  requiredPoints: number;
  rewardType: string;
  value: string | null;
  active: boolean;
};

export function LoyaltyAdminClient({
  settings,
  rewards,
}: {
  settings: LoyaltySettingsDTO;
  rewards: LoyaltyRewardDTO[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<LoyaltyRewardDTO | null>(null);
  const { t } = useAdminI18n();

  const refresh = () => startTransition(() => router.refresh());

  return (
    <div className="space-y-10">
      {toast && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">{toast}</div>}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{t("loyalty")}</h1>
        <form
          className="mt-4 grid max-w-lg gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const res = await saveLoyaltySettings(fd);
            if (!res.ok) setToast(res.error);
            else {
              setToast(t("savedSuccessfully"));
              refresh();
            }
          }}
        >
          <label className="flex gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={settings.enabled} value="on" />
            {t("loyaltyEnabledLabel")}
          </label>
          <label className="text-xs font-medium">
            {t("pointsPerShekelLabel")}
            <input
              name="pointsPerShekel"
              type="number"
              step="0.0001"
              required
              defaultValue={settings.pointsPerShekel}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            {t("minOrderForPointsLabel")}
            <input
              name="minOrderForPoints"
              type="number"
              step="0.01"
              required
              defaultValue={settings.minOrderForPoints}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            {t("pointsToIlsRateLabel")}
            <input
              name="pointsToIlsRate"
              type="number"
              step="0.0001"
              required
              defaultValue={settings.pointsToIlsRate}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" name="allowRedeem" defaultChecked={settings.allowRedeem} value="on" />
            {t("loyaltyAllowRedeemLabel")}
          </label>
          <label className="text-xs font-medium">
            {t("pointsExpireDaysLabel")}
            <input
              name="pointsExpireDays"
              type="number"
              defaultValue={settings.pointsExpireDays ?? ""}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            />
          </label>
          <button type="submit" className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
            {t("saveSettings")}
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{t("rewards")}</h2>
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
            {t("addReward")}
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-4 py-3">{t("title")}</th>
                <th className="px-4 py-3">{t("points")}</th>
                <th className="px-4 py-3">{t("type")}</th>
                <th className="px-4 py-3">{t("value")}</th>
                <th className="px-4 py-3">{t("active")}</th>
                <th className="px-4 py-3 text-end">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-4 py-2">{r.title_he}</td>
                  <td className="px-4 py-2">{r.requiredPoints}</td>
                  <td className="px-4 py-2">
                    {r.rewardType === "DISCOUNT"
                      ? t("rewardTypeDiscount")
                      : r.rewardType === "FREE_SHIPPING"
                        ? t("rewardTypeFreeShipping")
                        : r.rewardType === "FREE_PRODUCT"
                          ? t("rewardTypeFreeProduct")
                          : t("rewardTypeCoupon")}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{r.value ?? "—"}</td>
                  <td className="px-4 py-2">{r.active ? t("yes") : t("no")}</td>
                  <td className="px-4 py-2 text-end">
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => setEdit(r)}>
                      {t("edit")}
                    </button>
                    <span className="mx-2 text-slate-300">|</span>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={async () => {
                        const fd = new FormData();
                        fd.append("id", r.id);
                        const res = await deleteLoyaltyReward(fd);
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
      </section>

      {pending && (
        <div className="fixed bottom-6 left-6 z-[90] rounded-lg bg-slate-900 px-3 py-2 text-white">
          <AdminSpinner className="h-4 w-4 border-t-white" />
        </div>
      )}

      <AdminModal open={open} onClose={() => setOpen(false)} title={t("addReward")} size="lg">
        <RewardForm
          onSubmit={async (form) => {
            const fd = new FormData(form);
            const res = await upsertLoyaltyReward(fd);
            if (!res.ok) setToast(res.error);
            else {
              setToast(t("savedSuccessfully"));
              setOpen(false);
              refresh();
            }
          }}
          onCancel={() => setOpen(false)}
        />
      </AdminModal>

      <AdminModal open={!!edit} onClose={() => setEdit(null)} title={t("edit")} size="lg">
        {edit && (
          <RewardForm
            reward={edit}
            onSubmit={async (form) => {
              const fd = new FormData(form);
              const res = await upsertLoyaltyReward(fd);
              if (!res.ok) setToast(res.error);
              else {
                setToast(t("savedSuccessfully"));
                setEdit(null);
                refresh();
              }
            }}
            onCancel={() => setEdit(null)}
          />
        )}
      </AdminModal>
    </div>
  );
}

function RewardForm({
  reward,
  onSubmit,
  onCancel,
}: {
  reward?: LoyaltyRewardDTO;
  onSubmit: (form: HTMLFormElement) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState(false);
  const { t } = useAdminI18n();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        await onSubmit(e.currentTarget);
        setPending(false);
      }}
      className="grid gap-2"
    >
      <input type="hidden" name="id" value={reward?.id ?? ""} />
      <label className="text-xs font-medium">
        {t("rewardTitleHe")}
        <input name="title_he" required defaultValue={reward?.title_he} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium">
        {t("rewardTitleAr")}
        <input name="title_ar" required defaultValue={reward?.title_ar} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium">
        {t("rewardTitleEn")}
        <input name="title_en" required defaultValue={reward?.title_en} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium">
        {t("rewardRequiredPoints")}
        <input name="requiredPoints" type="number" required defaultValue={reward?.requiredPoints} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium">
        {t("rewardTypeLabel")}
        <select name="rewardType" required defaultValue={reward?.rewardType ?? "DISCOUNT"} className="mt-1 w-full rounded border px-2 py-1.5 text-sm">
          <option value="DISCOUNT">{t("rewardTypeDiscount")}</option>
          <option value="FREE_SHIPPING">{t("rewardTypeFreeShipping")}</option>
          <option value="FREE_PRODUCT">{t("rewardTypeFreeProduct")}</option>
          <option value="COUPON">{t("rewardTypeCoupon")}</option>
        </select>
      </label>
      <label className="text-xs font-medium">
        {t("rewardValueLabel")}
        <input name="value" defaultValue={reward?.value ?? ""} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={reward?.active ?? true} value="on" />
        {t("rewardActive")}
      </label>
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
