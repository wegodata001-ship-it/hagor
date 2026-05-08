"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { evaluatePasswordRules, passwordMeetsAllRules } from "@/lib/password-strength";

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

function PasswordChecklist({ password }: { password: string }) {
  const r = useMemo(() => evaluatePasswordRules(password), [password]);
  const metCount = [r.min8, r.upper, r.lower, r.number, r.special].filter(Boolean).length;
  const all = r.min8 && r.upper && r.lower && r.number && r.special;
  const pct = (metCount / 5) * 100;

  const rows: { ok: boolean; label: string }[] = [
    { ok: r.min8, label: "לפחות 8 תווים" },
    { ok: r.upper, label: "אות גדולה באנגלית" },
    { ok: r.lower, label: "אות קטנה באנגלית" },
    { ok: r.number, label: "מספר" },
    { ok: r.special, label: "סימן מיוחד" },
  ];

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li
            key={row.label}
            className={`flex items-center gap-2 text-sm transition-colors duration-200 ${
              row.ok ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            <span
              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-transform duration-200 ${
                row.ok
                  ? "scale-100 bg-emerald-500/20 text-emerald-300"
                  : "scale-95 bg-red-500/10 text-red-400/80"
              }`}
              aria-hidden
            >
              {row.ok ? "✓" : "✕"}
            </span>
            {row.label}
          </li>
        ))}
      </ul>
      {password.length > 0 && (
        <div className="pt-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                all ? "bg-emerald-500" : "bg-blue-500/70"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {all && (
            <p className="mt-2 text-sm font-medium text-emerald-400 transition-opacity duration-300">
              סיסמה חזקה
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
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

  useEffect(() => {
    fetch("/api/store/public")
      .then((r) => r.json())
      .then((d: { registrationEnabled?: boolean }) => {
        setRegistrationOpen(d.registrationEnabled !== false);
      })
      .catch(() => setRegistrationOpen(true));
  }, []);

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
    else if (!passwordMeetsAllRules(values.password)) {
      errors.password = "הסיסמה אינה עומדת בכל הדרישות";
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

    if (registrationOpen === false) {
      setError("ההרשמה סגורה כרגע.");
      return;
    }

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
      setError(typeof data.error === "string" ? data.error : "שגיאה בהרשמה");
      return;
    }
    if (data.requiresEmailVerification) {
      setVerifyUrl(typeof data.verifyUrl === "string" ? data.verifyUrl : null);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  if (registrationOpen === false) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 md:py-16">
        <div className="ds-card-glass border-white/10 p-6 text-center">
          <h1 className="text-xl font-bold text-slate-50">הרשמה סגורה</h1>
          <p className="mt-3 text-sm text-slate-400">כרגע אין אפשרות להירשם דרך האתר. צרו קשר עם התמיכה.</p>
          <Link href="/login" className="mt-6 inline-block text-blue-400 hover:underline">
            חזרה להתחברות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-16">
      <div className="ds-card-glass border-white/10 p-6 md:p-8">
        <h1 className="text-center text-2xl font-bold text-slate-50">הרשמת לקוחות</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          יוצר חשבון לקוח (CUSTOMER). בעלי חנות נרשמים בנפרד.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="ds-label">שם מלא</label>
            <input
              required
              className="ds-input mt-1.5"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              onBlur={() => setTouched((s) => ({ ...s, name: true }))}
            />
            {showFieldError("name") && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
          </div>
          <div>
            <label className="ds-label">אימייל</label>
            <input
              type="email"
              required
              className="ds-input mt-1.5"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              onBlur={() => setTouched((s) => ({ ...s, email: true }))}
            />
            {showFieldError("email") && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
          </div>
          <div>
            <label className="ds-label">אימות אימייל</label>
            <input
              type="email"
              required
              className="ds-input mt-1.5"
              value={form.confirmEmail}
              onChange={(e) => setForm((s) => ({ ...s, confirmEmail: e.target.value }))}
              onBlur={() => setTouched((s) => ({ ...s, confirmEmail: true }))}
            />
            {showFieldError("confirmEmail") && (
              <p className="mt-1 text-sm text-red-400">{errors.confirmEmail}</p>
            )}
          </div>
          <div>
            <label className="ds-label">טלפון</label>
            <input
              type="tel"
              required
              className="ds-input mt-1.5"
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
              onBlur={() => setTouched((s) => ({ ...s, phone: true }))}
            />
            {showFieldError("phone") && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
          </div>
          <div>
            <label className="ds-label">סיסמה</label>
            <input
              type="password"
              required
              minLength={8}
              className="ds-input mt-1.5"
              value={form.password}
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              onBlur={() => setTouched((s) => ({ ...s, password: true }))}
            />
            <PasswordChecklist password={form.password} />
            {showFieldError("password") && (
              <p className="mt-1 text-sm text-red-400">{errors.password}</p>
            )}
          </div>
          <div>
            <label className="ds-label">אימות סיסמה</label>
            <input
              type="password"
              required
              minLength={8}
              className="ds-input mt-1.5"
              value={form.confirmPassword}
              onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))}
              onBlur={() => setTouched((s) => ({ ...s, confirmPassword: true }))}
            />
            {showFieldError("confirmPassword") && (
              <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
            )}
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => {
                setForm((s) => ({ ...s, acceptTerms: e.target.checked }));
                setTouched((s) => ({ ...s, acceptTerms: true }));
              }}
              className="mt-1 h-4 w-4 rounded border-white/20"
            />
            <span>אני מאשר את תנאי השימוש</span>
          </label>
          {showFieldError("acceptTerms") && (
            <p className="-mt-2 text-sm text-red-400">{errors.acceptTerms}</p>
          )}
          <p className="-mt-2 text-xs text-slate-500">
            בהרשמה אתם מסכימים גם ל
            <Link href="/terms" className="text-blue-400 hover:underline">
              {" "}
              תקנון
            </Link>{" "}
            ו
            <Link href="/privacy" className="text-blue-400 hover:underline">
              {" "}
              מדיניות פרטיות
            </Link>
            .
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {verifyUrl && (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              ההרשמה הצליחה. לאימות האימייל פתחו את הקישור שנשלח למייל, או{" "}
              <a href={verifyUrl} className="font-medium underline">
                לחצו כאן
              </a>
              .
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting || registrationOpen === null}
            className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {isSubmitting ? "שולח…" : "הרשמה"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          כבר רשומים?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            התחברות
          </Link>
        </p>
      </div>
    </div>
  );
}
