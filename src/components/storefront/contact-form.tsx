"use client";

import { useState } from "react";
import { useStoreI18n } from "@/components/storefront/store-i18n";

export function ContactForm() {
  const { t } = useStoreI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("contactFormError"));
        return;
      }
      setDone(true);
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="mt-3 text-sm text-emerald-400">{t("contactFormSuccess")}</p>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
      <input
        required
        className="ds-input w-full text-sm"
        placeholder={t("contactFormName")}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="ds-input w-full text-sm"
        placeholder={t("contactFormPhone")}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <input
        type="email"
        className="ds-input w-full text-sm"
        placeholder={t("contactFormEmail")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <textarea
        required
        rows={3}
        className="ds-textarea w-full text-sm"
        placeholder={t("contactFormMessage")}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <button type="submit" disabled={loading} className="hagor-btn-outline w-full text-sm disabled:opacity-50">
        {loading ? t("contactFormSending") : t("contactFormSubmit")}
      </button>
    </form>
  );
}
