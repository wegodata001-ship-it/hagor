"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      setError(data.error ?? "שגיאה");
      return;
    }
    if (data.role === "STORE_OWNER" || data.role === "SUPER_ADMIN") {
      router.push("/admin");
    } else {
      router.push("/account");
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-center text-2xl font-bold text-zinc-900">כניסת לקוחות</h1>
      <p className="mt-2 text-center text-sm text-zinc-600">
        חשבון לקוח רגיל (CUSTOMER). ניהול חנות —{" "}
        <Link href="/login-admin" className="text-blue-600 hover:underline">
          כניסת מנהל חנות
        </Link>
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">אימייל</label>
          <input
            type="email"
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">סיסמה</label>
          <input
            type="password"
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
        >
          כניסה
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-600">
        אין חשבון?{" "}
        <Link href="/register" className="text-blue-600 hover:underline">
          הרשמה
        </Link>
      </p>
    </div>
  );
}
