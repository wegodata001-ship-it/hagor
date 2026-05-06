"use client";

import { useState } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { useAdminI18n } from "@/lib/admin-i18n";

export type WebhookLogDTO = {
  id: string;
  provider: string;
  status: string;
  createdAt: string;
  rawPayload: unknown;
};

function payloadAmount(raw: unknown): string {
  if (raw && typeof raw === "object" && "amount" in raw) {
    const a = (raw as { amount?: unknown }).amount;
    if (typeof a === "number" || typeof a === "string") return String(a);
  }
  return "—";
}

export function WebhooksAdminClient({ logs }: { logs: WebhookLogDTO[] }) {
  const [sel, setSel] = useState<WebhookLogDTO | null>(null);
  const { t } = useAdminI18n();

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">{t("paymentWebhookLogTitle")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("rawPayloadsDebug")}</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">{t("provider")}</th>
              <th className="px-4 py-3">{t("amount")}</th>
              <th className="px-4 py-3">{t("status")}</th>
              <th className="px-4 py-3">{t("transactionId")}</th>
              <th className="px-4 py-3">{t("created")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((w) => (
              <tr
                key={w.id}
                className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                onClick={() => setSel(w)}
              >
                <td className="px-4 py-2">{w.provider}</td>
                <td className="px-4 py-2 tabular-nums">{payloadAmount(w.rawPayload)}</td>
                <td className="px-4 py-2">{w.status}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  {typeof w.rawPayload === "object" &&
                  w.rawPayload &&
                  "transactionId" in w.rawPayload &&
                  typeof (w.rawPayload as { transactionId?: string }).transactionId === "string"
                    ? (w.rawPayload as { transactionId: string }).transactionId.slice(0, 14)
                    : "—"}
                </td>
                <td className="px-4 py-2 text-xs">{new Date(w.createdAt).toLocaleString("he-IL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">*</p>

      <AdminModal open={!!sel} onClose={() => setSel(null)} title="Raw payload" size="lg">
        {sel && (
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-slate-900 p-4 text-left text-xs text-slate-100">
            {JSON.stringify(sel.rawPayload ?? {}, null, 2)}
          </pre>
        )}
      </AdminModal>
    </div>
  );
}
