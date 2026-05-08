"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminI18nProvider, useAdminI18n } from "@/lib/admin-i18n";

export default function LoginAdminPage() {
  return (
    <AdminI18nProvider>
      <LoginAdminInner />
    </AdminI18nProvider>
  );
}

function LoginAdminInner() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { lang, setLang, t } = useAdminI18n();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("errorGeneric"));
      return;
    }
    if (data.role !== "STORE_OWNER" && data.role !== "SUPER_ADMIN") {
      setError(t("notStoreOwner"));
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div dir={lang === "en" ? "ltr" : "rtl"} className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900">{t("adminLoginTitle")}</h1>
          <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 text-xs font-medium text-zinc-700">
            <button type="button" onClick={() => setLang("en")} className={`px-2 py-1 hover:bg-zinc-50 ${lang === "en" ? "bg-zinc-100" : ""}`}>
              {t("english")}
            </button>
            <button type="button" onClick={() => setLang("he")} className={`px-2 py-1 hover:bg-zinc-50 ${lang === "he" ? "bg-zinc-100" : ""}`}>
              {t("hebrew")}
            </button>
            <button type="button" onClick={() => setLang("ar")} className={`px-2 py-1 hover:bg-zinc-50 ${lang === "ar" ? "bg-zinc-100" : ""}`}>
              {t("arabic")}
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-sm text-zinc-600">
          {t("storeOwnersOnlyCustomers")}
          <Link href="/login" className="text-blue-600 hover:underline">
            {t("customersLoginLink")}
          </Link>
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">{t("email")}</label>
            <input
              type="email"
              required
              className="ds-input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">{t("password")}</label>
            <input
              type="password"
              required
              className="ds-input mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
          >
            {t("login")}
          </button>
        </form>
        <Link href="/" className="mt-6 block text-center text-sm text-blue-600 hover:underline">
          {t("backToSite")}
        </Link>
      </div>
    </div>
  );
}
