"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  deleteDeliveryOption,
  savePickupEnabled,
  upsertDelivery,
} from "@/app/admin/actions";

export type DeliveryRow = {
  id: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  type: "PICKUP" | "SHIPPING";
  price: number;
  active: boolean;
  sortOrder: number;
};

export function DeliveryAdminClient({
  pickupEnabled,
  options,
}: {
  pickupEnabled: boolean;
  options: DeliveryRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<DeliveryRow | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const { t } = useAdminI18n();

  const refresh = () => startTransition(() => router.refresh());

  async function submitDelivery(form: HTMLFormElement) {
    const fd = new FormData(form);
    const res = await upsertDelivery(fd);
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

      <h1 className="text-xl font-semibold text-slate-900">{t("deliverySettings")}</h1>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">{t("pickup")}</h2>
        <form
          className="mt-3 flex flex-wrap items-center gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const res = await savePickupEnabled(fd);
            if (!res.ok) setToast(res.error);
            else {
              setToast(t("savedSuccessfully"));
              refresh();
            }
          }}
        >
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="pickupEnabled" defaultChecked={pickupEnabled} value="on" />
            {t("pickupEnabled")}
          </label>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
            {t("save")}
          </button>
        </form>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">{t("shippingOptions")}</h2>
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
            {t("addOption")}
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-4 py-3">{t("name")}</th>
                <th className="px-4 py-3">{t("price")}</th>
                <th className="px-4 py-3">{t("type")}</th>
                <th className="px-4 py-3">{t("active")}</th>
                <th className="px-4 py-3 text-end">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {options.map((o) => (
                <tr key={o.id} className="border-b border-slate-100">
                  <td className="px-4 py-2">{o.name_he}</td>
                  <td className="px-4 py-2 tabular-nums">₪{Number(o.price).toFixed(2)}</td>
                  <td className="px-4 py-2">
                    {o.type === "PICKUP" ? t("pickupOption") : t("shippingOption")}
                  </td>
                  <td className="px-4 py-2">{o.active ? t("yes") : t("no")}</td>
                  <td className="px-4 py-2 text-end">
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => setEdit(o)}>
                      {t("edit")}
                    </button>
                    <span className="mx-2 text-slate-300">|</span>
                    <button type="button" className="text-red-600 hover:underline" onClick={() => setDelId(o.id)}>
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

      <AdminModal open={open} onClose={() => setOpen(false)} title={t("addOption")}>
        <DeliveryForm onSubmit={(f) => void submitDelivery(f)} onCancel={() => setOpen(false)} />
      </AdminModal>

      <AdminModal open={!!edit} onClose={() => setEdit(null)} title={t("edit")}>
        {edit && (
          <DeliveryForm
            row={edit}
            onSubmit={(f) => void submitDelivery(f)}
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
                const res = await deleteDeliveryOption(fd);
                if (!res.ok) setToast(res.error);
                else {
                  setDelId(null);
                  setToast(t("deletedSuccessfully"));
                  refresh();
                }
              }}
            >
              {t("delete")}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">{t("confirmDeleteOption")}</p>
      </AdminModal>
    </div>
  );
}

function DeliveryForm({
  row,
  onSubmit,
  onCancel,
}: {
  row?: DeliveryRow;
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
      className="grid gap-3"
    >
      <input type="hidden" name="id" value={row?.id ?? ""} />
      <label className="text-xs font-medium">
        {t("deliveryNameHe")}
        <input name="name_he" required defaultValue={row?.name_he} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium">
        {t("deliveryNameAr")}
        <input name="name_ar" required defaultValue={row?.name_ar} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium">
        {t("deliveryNameEn")}
        <input name="name_en" required defaultValue={row?.name_en} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium">
        {t("deliveryTypeLabel")}
        <select name="type" required defaultValue={row?.type ?? "SHIPPING"} className="mt-1 w-full rounded border px-2 py-1.5 text-sm">
          <option value="SHIPPING">{t("shippingOption")}</option>
          <option value="PICKUP">{t("pickupOption")}</option>
        </select>
      </label>
      <label className="text-xs font-medium">
        {t("deliveryPriceLabel")}
        <input name="price" type="number" step="0.01" required defaultValue={row?.price ?? 0} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium">
        {t("displayOrder")}
        <input name="sortOrder" type="number" defaultValue={row?.sortOrder ?? 0} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={row?.active ?? true} value="on" />
        {t("deliveryActive")}
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
