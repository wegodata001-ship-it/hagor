"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("הסיסמאות אינן תואמות");
      return;
    }
    if (!token) {
      setError("קישור לא תקין");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "לא ניתן לעדכן");
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return <p className="mt-3 text-sm text-red-400">קישור לא תקין. בקשו איפוס סיסמה מחדש.</p>;
  }

  if (done) {
    return (
      <p className="mt-3 text-sm text-emerald-400">
        הסיסמה עודכנה.{" "}
        <Link href="/login" className="text-hagor-gold hover:underline">
          התחברות
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
      <input
        type="password"
        required
        className="ds-input w-full"
        placeholder="סיסמה חדשה"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="password"
        required
        className="ds-input w-full"
        placeholder="אימות סיסמה"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button type="submit" disabled={loading} className="hagor-btn w-full disabled:opacity-50">
        {loading ? "שומר…" : "עדכן סיסמה"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-16">
      <div className="ds-card-glass border-white/10 p-6 md:p-8">
        <h1 className="text-xl font-bold text-slate-50">סיסמה חדשה</h1>
        <Suspense fallback={<p className="mt-3 text-sm text-zinc-400">טוען…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
