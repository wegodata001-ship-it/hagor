"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { deleteCoupon, upsertCoupon } from "@/app/admin/actions";
import { useAdminI18n } from "@/lib/admin-i18n";

export type CouponDTO = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrderAmount: number | null;
  usageLimit: number | null;
  active: boolean;
  expiresAt: string | null;
};

export function CouponsAdminClient({ coupons }: { coupons: CouponDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<CouponDTO | null>(null);
  const { t } = useAdminI18n();

  const refresh = () => startTransition(() => router.refresh());

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form);
    const res = await upsertCoupon(fd);
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
          <h1 className="text-xl font-semibold text-slate-900">{t("coupons")}</h1>
          <p className="text-sm text-slate-500">{t("couponsSubtitle")}</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          {t("addCoupon")}
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">{t("code")}</th>
              <th className="px-4 py-3">{t("type")}</th>
              <th className="px-4 py-3">{t("value")}</th>
              <th className="px-4 py-3">{t("active")}</th>
              <th className="px-4 py-3">{t("expiry")}</th>
              <th className="px-4 py-3 text-end">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-slate-100">
                <td className="px-4 py-2 font-mono font-medium">{c.code}</td>
                <td className="px-4 py-2">
                  {c.type === "PERCENT" ? t("couponTypePercent") : t("couponTypeFixed")}
                </td>
                <td className="px-4 py-2 tabular-nums">{c.value}</td>
                <td className="px-4 py-2">{c.active ? t("yes") : t("no")}</td>
                <td className="px-4 py-2 text-xs">
                  {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("he-IL") : "—"}
                </td>
                <td className="px-4 py-2 text-end">
                  <button type="button" className="text-blue-600 hover:underline" onClick={() => setEdit(c)}>
                    {t("edit")}
                  </button>
                  <span className="mx-2 text-slate-300">|</span>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={async () => {
                      const fd = new FormData();
                      fd.append("id", c.id);
                      const res = await deleteCoupon(fd);
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

      <AdminModal open={open} onClose={() => setOpen(false)} title={t("addCoupon")}>
        <CouponForm onSubmit={(f) => void submit(f)} onCancel={() => setOpen(false)} />
      </AdminModal>

      <AdminModal open={!!edit} onClose={() => setEdit(null)} title={t("edit")}>
        {edit && <CouponForm coupon={edit} onSubmit={(f) => void submit(f)} onCancel={() => setEdit(null)} />}
      </AdminModal>
    </div>
  );
}

function CouponForm({
  coupon,
  onSubmit,
  onCancel,
}: {
  coupon?: CouponDTO;
  onSubmit: (form: HTMLFormElement) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState(false);
  const { t } = useAdminI18n();
  const expLocal =
    coupon?.expiresAt && !Number.isNaN(Date.parse(coupon.expiresAt))
      ? new Date(coupon.expiresAt).toISOString().slice(0, 16)
      : "";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        await onSubmit(e.currentTarget);
        setPending(false);
      }}
      className="grid gap-3"
    >
      <input type="hidden" name="id" value={coupon?.id ?? ""} />
      <label className="text-xs font-medium">
        {t("couponCodeLabel")}
        <input name="code" required defaultValue={coupon?.code} className="mt-1 w-full rounded border px-2 py-1.5 font-mono text-sm" />
      </label>
      <label className="text-xs font-medium">
        {t("couponTypeLabel")}
        <select name="type" required defaultValue={coupon?.type ?? "PERCENT"} className="mt-1 w-full rounded border px-2 py-1.5 text-sm">
          <option value="PERCENT">{t("couponTypePercent")}</option>
          <option value="FIXED">{t("couponTypeFixed")}</option>
        </select>
      </label>
      <label className="text-xs font-medium">
        {t("couponValueLabel")}
        <input name="value" type="number" step="0.01" required defaultValue={coupon?.value} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium">
        {t("couponMinOrderAmountLabel")}
        <input
          name="minOrderAmount"
          type="number"
          step="0.01"
          defaultValue={coupon?.minOrderAmount ?? ""}
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs font-medium">
        {t("couponUsageLimitLabel")}
        <input
          name="usageLimit"
          type="number"
          defaultValue={coupon?.usageLimit ?? ""}
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs font-medium">
        {t("couponExpiresAtLabel")}
        <input name="expiresAt" type="datetime-local" defaultValue={expLocal} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={coupon?.active ?? true} value="on" />
        {t("couponActive")}
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
