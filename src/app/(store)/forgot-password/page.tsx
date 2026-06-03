"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "לא ניתן לשלוח");
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-16">
      <div className="ds-card-glass border-white/10 p-6 md:p-8">
        <h1 className="text-xl font-bold text-slate-50">שחזור סיסמה</h1>
        {done ? (
          <p className="mt-3 text-sm leading-relaxed text-emerald-400">
            אם כתובת האימייל קיימת במערכת, נשלח אליך קישור לאיפוס סיסמה.
          </p>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
            <label className="block text-sm text-zinc-400">אימייל</label>
            <input
              type="email"
              required
              className="ds-input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button type="submit" disabled={loading} className="hagor-btn w-full disabled:opacity-50">
              {loading ? "שולח…" : "שלח קישור לאיפוס"}
            </button>
          </form>
        )}
        <p className="mt-4 text-sm text-slate-300">
          <Link href="/login" className="text-hagor-gold hover:underline">
            חזרה להתחברות
          </Link>
        </p>
      </div>
    </div>
  );
}
