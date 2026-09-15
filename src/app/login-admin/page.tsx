"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminI18nProvider, isRtl, useAdminI18n } from "@/lib/admin-i18n";
import { PRODUCTION_SITE_URL } from "@/lib/host";

export default function LoginAdminPage() {
  return (
    <AdminI18nProvider>
      <LoginAdminInner />
    </AdminI18nProvider>
  );
}

function LoginAdminInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { lang, setLang, t } = useAdminI18n();
  const rtl = isRtl(lang);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      let data: { ok?: boolean; role?: string; error?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError(t("errorGeneric"));
        return;
      }
      if (!res.ok) {
        setError(data.error ?? t("errorGeneric"));
        return;
      }
      if (data.role !== "STORE_OWNER" && data.role !== "SUPER_ADMIN") {
        setError(t("notStoreOwner"));
        return;
      }
      // Full navigation ensures the session cookie from the login response is applied before /admin loads.
      window.location.assign("/admin");
    } finally {
      setLoading(false);
    }
  }

  const langBtn = (code: "he" | "ar" | "en", label: string) => (
    <button
      type="button"
      onClick={() => setLang(code)}
      className={`min-w-[2.5rem] px-2.5 py-1.5 text-[11px] font-semibold tracking-wide transition ${
        lang === code
          ? "bg-[#111827] text-[#c89211]"
          : "bg-transparent text-[#6B7280] hover:text-[#111827]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      lang={lang}
      className="flex min-h-screen items-center justify-center bg-[#F7F4EE] px-4 py-10"
    >
      <div className="w-full max-w-[440px] rounded-[20px] border border-[#E8E4DC] bg-[#FFFEFB] p-7 shadow-[0_12px_40px_rgba(17,24,39,0.06)] sm:p-9">
        <div className="flex justify-center">
          <div className="inline-flex overflow-hidden rounded-lg border border-[#E8E8E8] bg-white">
            {langBtn("he", "HE")}
            {langBtn("ar", "AR")}
            {langBtn("en", "EN")}
          </div>
        </div>

        <div className="mt-7 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/icon.svg"
            alt="HAGOUR BY WAEL"
            width={56}
            height={56}
            className="h-14 w-14 rounded-[14px] shadow-sm"
          />
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#c89211]">
            HAGOUR BY WAEL
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#9CA3AF]">
            TACTICAL
          </p>
          <h1 className="mt-5 text-[22px] font-bold tracking-tight text-[#111827] sm:text-[24px]">
            {t("adminLoginTitle")}
          </h1>
          <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-[#6B7280]">
            {t("adminLoginSubtitle")}
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#374151]">{t("email")}</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-0 flex w-11 items-center justify-center text-[#9CA3AF]">
                <MailIcon />
              </span>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[50px] w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] pe-3 ps-11 text-[14px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#c89211] focus:bg-white focus:ring-2 focus:ring-[#c89211]/20"
                placeholder="name@example.com"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#374151]">{t("password")}</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-0 flex w-11 items-center justify-center text-[#9CA3AF]">
                <LockIcon />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[50px] w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] pe-11 ps-11 text-[14px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#c89211] focus:bg-white focus:ring-2 focus:ring-[#c89211]/20"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-[#9CA3AF] transition hover:text-[#111827]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex h-[50px] w-full items-center justify-center rounded-xl bg-[#111827] text-[14px] font-semibold text-[#F8F1DE] transition hover:bg-[#1f2937] hover:text-[#c89211] disabled:opacity-60"
          >
            {loading ? "…" : t("login")}
          </button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-3 text-center text-[13px]">
          <Link href="/forgot-password" className="font-medium text-[#6B7280] transition hover:text-[#c89211]">
            {t("forgotPassword")}
          </Link>
          <div className="flex w-full items-center gap-3">
            <div className="h-px flex-1 bg-[#E8E8E8]" />
            <span className="text-[11px] uppercase tracking-wider text-[#C4C4C4]">·</span>
            <div className="h-px flex-1 bg-[#E8E8E8]" />
          </div>
          <Link href={PRODUCTION_SITE_URL} className="font-medium text-[#111827] transition hover:text-[#c89211]">
            {t("backToSite")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5l8.4 5.25a1.2 1.2 0 001.2 0L21 7.5M5.25 18h13.5A2.25 2.25 0 0021 15.75v-7.5A2.25 2.25 0 0018.75 6H5.25A2.25 2.25 0 003 8.25v7.5A2.25 2.25 0 005.25 18z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V8.25a4.5 4.5 0 10-9 0v2.25M6.75 10.5h10.5A1.5 1.5 0 0118.75 12v6.75a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5V12a1.5 1.5 0 011.5-1.5z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M9.9 9.9A3 3 0 0012 15a3 3 0 002.1-.9M6.1 6.3C4 7.7 2.5 10 2.25 12c0 0 3.75 6.75 9.75 6.75 1.7 0 3.2-.4 4.5-1M17.5 14.2c1.5-1.1 2.7-2.6 3.25-3.2 0 0-3.75-6.75-9.75-6.75-.9 0-1.75.12-2.55.34" />
    </svg>
  );
}
