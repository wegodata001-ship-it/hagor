"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function mapLoginError(raw: string | undefined): string {
  if (!raw) return "משהו השתבש. נסו שוב.";
  const t = raw.toLowerCase();
  if (t.includes("invalid credentials") || t.includes("אימייל או סיסמה")) return "אימייל או סיסמה שגויים.";
  if (t.includes("too many") || t.includes("יותר מדי")) return raw;
  if (t.includes("server") || t.includes("שרת")) return raw;
  if (t.includes("misconfigured") || t.includes("מוגדרת")) return raw;
  return raw;
}

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyBanner, setVerifyBanner] = useState<string | null>(null);

  useEffect(() => {
    const v = searchParams.get("verify");
    if (v === "ok") {
      setVerifyBanner("האימייל אומת בהצלחה. אפשר להתחבר.");
    } else if (v === "expired") {
      setVerifyBanner("הקישור לאימות פג תוקף או כבר נוצל. נסו להירשם מחדש או צרו קשר עם התמיכה.");
    } else if (v === "invalid") {
      setVerifyBanner("קישור אימות לא תקין.");
    }
  }, [searchParams]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(mapLoginError(data.error));
        return;
      }
      if (data.role === "STORE_OWNER" || data.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/account");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-16">
      <div className="ds-card-glass border-white/10 p-6 md:p-8">
        <h1 className="text-center text-2xl font-bold tracking-tight text-slate-50">כניסת לקוחות</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          חשבון לקוח. ניהול חנות —{" "}
          <Link href="/login-admin" className="text-blue-400 hover:text-blue-300 hover:underline">
            כניסת מנהל
          </Link>
        </p>

        {verifyBanner && (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-200">
            {verifyBanner}
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="ds-label">אימייל</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="ds-input mt-1.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="ds-label">סיסמה</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="ds-input mt-1.5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-blue-500"
              />
              זכור אותי
            </label>
            <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 hover:underline">
              שכחת סיסמה?
            </Link>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loading ? "מתחבר…" : "כניסה"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          אין חשבון?{" "}
          <Link href="/register" className="text-blue-400 hover:underline">
            הרשמה
          </Link>
        </p>
      </div>
    </div>
  );
}
