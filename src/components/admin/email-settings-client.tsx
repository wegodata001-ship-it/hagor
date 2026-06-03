"use client";

import Link from "next/link";
import { useState } from "react";
import { sendTestEmailAction } from "@/app/admin/actions";
import { useAdminI18n } from "@/lib/admin-i18n";

export function EmailSettingsClient({
  configured,
  adminEmail,
  smtpHost,
  fromName,
  fromAddress,
  contactReceiver,
}: {
  configured: boolean;
  adminEmail: string;
  smtpHost: string;
  fromName: string;
  fromAddress: string;
  contactReceiver: string;
}) {
  const { t } = useAdminI18n();
  const [to, setTo] = useState(adminEmail);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendTest() {
    setPending(true);
    setMsg(null);
    const fd = new FormData();
    fd.set("to", to.trim());
    const res = await sendTestEmailAction(fd);
    setMsg(res.ok ? t("testEmailSent") : (res.error ?? t("errorGeneric")));
    setPending(false);
  }

  return (
    <div className="max-w-xl">
      <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
        ← {t("storeSettings")}
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">{t("emailSettings")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("emailSettingsSubtitle")}</p>

      <dl className="mt-6 space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">SMTP</dt>
          <dd className="font-mono text-slate-800">{smtpHost}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">{t("emailFrom")}</dt>
          <dd className="text-slate-800">
            {fromName} &lt;{fromAddress || "—"}&gt;
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">{t("contactReceiverEmail")}</dt>
          <dd className="text-slate-800">{contactReceiver || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">{t("emailStatus")}</dt>
          <dd className={configured ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
            {configured ? t("emailConfigured") : t("emailNotConfigured")}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-slate-500">{t("emailEnvHint")}</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="block text-sm font-medium text-slate-700">{t("testEmailTo")}</label>
        <input
          type="email"
          className="ds-input mt-2 w-full"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <button
          type="button"
          disabled={pending || !configured}
          onClick={() => void sendTest()}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? t("testEmailSending") : t("sendTestEmail")}
        </button>
        {msg ? <p className="mt-3 text-sm text-slate-700">{msg}</p> : null}
      </div>
    </div>
  );
}
