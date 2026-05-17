import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCachedSession } from "@/lib/auth/cached-session";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getCachedSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== UserRole.CUSTOMER) {
    redirect("/");
  }

  const storeId = STORE_ID;
  const user = await safeQuery(
    "account.layout.user",
    () =>
      prisma.user.findFirst({
        where: { id: session.userId, storeId },
        select: {
          name: true,
          email: true,
          emailVerified: true,
        },
      }),
    null,
    { timeoutMs: 12_000 },
  );

  const showVerifyBanner = !!(user && !user.emailVerified);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      {showVerifyBanner && (
        <div
          className="mb-6 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 shadow-lg shadow-amber-900/20"
          role="status"
        >
          <p className="font-medium text-amber-50">יש לאמת את כתובת האימייל</p>
          <p className="mt-1 text-amber-200/90">
            בדקו את תיבת הדואר לאחר ההרשמה או בקשו קישור חדש מהתמיכה. עד לאימות, ייתכן שחלק מהפעולות (כמו השלמת הזמנה)
            יהיו חסומות.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        <aside className="lg:w-56 lg:shrink-0">
          <nav className="ds-card-glass flex flex-row gap-2 overflow-x-auto p-2 text-sm lg:flex-col lg:gap-1 lg:overflow-visible">
            <Link
              href="/account"
              className="whitespace-nowrap rounded-xl px-3 py-2 text-slate-200 hover:bg-white/5 hover:text-white"
            >
              סקירה
            </Link>
            <Link
              href="/account/orders"
              className="whitespace-nowrap rounded-xl px-3 py-2 text-slate-200 hover:bg-white/5 hover:text-white"
            >
              ההזמנות שלי
            </Link>
            <Link
              href="/account/loyalty"
              className="whitespace-nowrap rounded-xl px-3 py-2 text-slate-200 hover:bg-white/5 hover:text-white"
            >
              מועדון לקוחות
            </Link>
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
