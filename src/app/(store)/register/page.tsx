"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RegisterForm = {
  name: string;
  email: string;
  confirmEmail: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

type RegisterErrors = Partial<Record<keyof RegisterForm, string>>;

const phoneRegex = /^[+]?[0-9\s\-()]{7,20}$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    confirmEmail: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [touched, setTouched] = useState<Partial<Record<keyof RegisterForm, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

  function validate(values: RegisterForm): RegisterErrors {
    const errors: RegisterErrors = {};
    const name = values.name.trim();
    const email = values.email.trim();
    const confirmEmail = values.confirmEmail.trim();
    const phone = values.phone.trim();

    if (!name) errors.name = "יש להזין שם מלא";
    if (!email) errors.email = "יש להזין אימייל";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "יש להזין אימייל תקין";
    if (!confirmEmail) errors.confirmEmail = "יש להזין אימייל לאימות";
    else if (email && email.toLowerCase() !== confirmEmail.toLowerCase()) {
      errors.confirmEmail = "האימיילים אינם תואמים";
    }
    if (!phone || !phoneRegex.test(phone)) errors.phone = "יש להזין מספר טלפון תקין";
    if (!values.password) errors.password = "יש להזין סיסמה";
    else if (!strongPasswordRegex.test(values.password)) {
      errors.password =
        "הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה, מספר ותו מיוחד";
    }
    if (!values.confirmPassword) errors.confirmPassword = "יש לאמת סיסמה";
    else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = "הסיסמאות אינן תואמות";
    }
    if (!values.acceptTerms) errors.acceptTerms = "יש לאשר את תנאי השימוש";
    return errors;
  }

  const errors = validate(form);
  const showFieldError = (field: keyof RegisterForm) => (submitted || touched[field]) && !!errors[field];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    setVerifyUrl(null);

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setIsSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "שגיאה");
      return;
    }
    if (data.requiresEmailVerification) {
      setVerifyUrl(typeof data.verifyUrl === "string" ? data.verifyUrl : null);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-center text-2xl font-bold text-zinc-900">הרשמת לקוחות</h1>
      <p className="mt-2 text-center text-sm text-zinc-600">
        יוצר חשבון לקוח (CUSTOMER). בעלי חנות נרשמים בנפרד דרך הצוות או יוצרים משתמש STORE_OWNER בפריסה.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">שם מלא</label>
          <input
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            onBlur={() => setTouched((s) => ({ ...s, name: true }))}
          />
          {showFieldError("name") && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">אימייל</label>
          <input
            type="email"
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            onBlur={() => setTouched((s) => ({ ...s, email: true }))}
          />
          {showFieldError("email") && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">אימות אימייל</label>
          <input
            type="email"
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={form.confirmEmail}
            onChange={(e) => setForm((s) => ({ ...s, confirmEmail: e.target.value }))}
            onBlur={() => setTouched((s) => ({ ...s, confirmEmail: true }))}
          />
          {showFieldError("confirmEmail") && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmEmail}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">טלפון</label>
          <input
            type="tel"
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            onBlur={() => setTouched((s) => ({ ...s, phone: true }))}
          />
          {showFieldError("phone") && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">סיסמה</label>
          <input
            type="password"
            required
            minLength={8}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            onBlur={() => setTouched((s) => ({ ...s, password: true }))}
          />
          {showFieldError("password") && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">אימות סיסמה</label>
          <input
            type="password"
            required
            minLength={8}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={form.confirmPassword}
            onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))}
            onBlur={() => setTouched((s) => ({ ...s, confirmPassword: true }))}
          />
          {showFieldError("confirmPassword") && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>
        <label className="flex items-start gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={form.acceptTerms}
            onChange={(e) => {
              setForm((s) => ({ ...s, acceptTerms: e.target.checked }));
              setTouched((s) => ({ ...s, acceptTerms: true }));
            }}
            className="mt-1"
          />
          <span>אני מאשר את תנאי השימוש</span>
        </label>
        {showFieldError("acceptTerms") && (
          <p className="-mt-2 text-sm text-red-600">{errors.acceptTerms}</p>
        )}
        <p className="-mt-2 text-xs text-zinc-500">
          בהרשמה אתם מסכימים גם ל
          <Link href="/terms" className="text-blue-600 hover:underline">
            {" "}תקנון
          </Link>
          {" "}ו
          <Link href="/privacy" className="text-blue-600 hover:underline">
            {" "}מדיניות פרטיות
          </Link>
          .
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {verifyUrl && (
          <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            ההרשמה הצליחה. נשלח קישור אימות למייל. להמשך התחברות לחצו:{" "}
            <a href={verifyUrl} className="underline">
              אימות אימייל
            </a>
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {isSubmitting ? "שולח..." : "הרשמה"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-600">
        כבר רשומים?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          התחברות
        </Link>
      </p>
    </div>
  );
}
