import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-16">
      <div className="ds-card-glass border-white/10 p-6 md:p-8">
        <h1 className="text-xl font-bold text-slate-50">שחזור סיסמה</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          איפוס סיסמה אוטומטי בדרך כלל נשלח באימייל. אם השירות עדיין לא הופעל בחנות זו, צרו קשר עם שירות הלקוחות
          ונעזור לכם לאמת את החשבון ולעדכן סיסמה.
        </p>
        <p className="mt-4 text-sm text-slate-300">
          חזרה ל־
          <Link href="/login" className="ms-1 text-blue-400 hover:underline">
            התחברות
          </Link>
        </p>
      </div>
    </div>
  );
}
