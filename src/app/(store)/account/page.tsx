import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCachedSession } from "@/lib/auth/cached-session";
import { STORE_ID } from "@/lib/store";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

type UserWithProfile = Prisma.UserGetPayload<{ include: { customerProfile: true } }>;

type AccountLoaded =
  | { kind: "nouser" }
  | {
      kind: "ok";
      user: UserWithProfile;
      orders: Array<{
        id: string;
        orderNumber: string;
        total: unknown;
        createdAt: Date;
        status: string;
        fulfillmentStatus: string;
      }>;
      totalOrders: number;
    };

export default async function AccountHomePage() {
  const session = await getCachedSession();
  if (!session) redirect("/login");
  const storeId = STORE_ID;

  const loaded = await safeQuery<AccountLoaded | null>(
    "account.home",
    async (): Promise<AccountLoaded> => {
      const user = await prisma.user.findFirst({
        where: { id: session.userId, storeId },
        include: { customerProfile: true },
      });
      if (!user) return { kind: "nouser" };

      const profile = user.customerProfile;
      const orders = profile
        ? await prisma.order.findMany({
            where: { storeId, customerId: profile.id },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              orderNumber: true,
              total: true,
              createdAt: true,
              status: true,
              fulfillmentStatus: true,
            },
          })
        : [];

      const totalOrders = profile
        ? await prisma.order.count({ where: { storeId, customerId: profile.id } })
        : 0;

      return { kind: "ok", user, orders, totalOrders };
    },
    null,
    { timeoutMs: 20_000 },
  );

  if (loaded === null) {
    return (
      <div className="ds-card-glass border-amber-500/30 p-6 text-center">
        <p className="font-medium text-slate-100">לא ניתן לטעון את החשבון כרגע.</p>
        <p className="mt-2 text-sm text-slate-400">נסו לרענן את העמוד בעוד רגע.</p>
      </div>
    );
  }

  if (loaded.kind === "nouser") {
    redirect("/login");
  }

  const { user, orders, totalOrders } = loaded;
  const profile = user.customerProfile;
  const lastOrder = orders[0] ?? null;

  const initial = (user.name?.trim().charAt(0) || user.email?.charAt(0) || "?").toUpperCase();

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ds-card-glass border-white/10 p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-bold text-white shadow-lg"
              aria-hidden
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-start">
              <h1 className="text-xl font-bold text-slate-50">{user.name}</h1>
              <p className="mt-1 truncate text-sm text-slate-400">{user.email}</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                    <span aria-hidden>✓</span> אימייל מאומת
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-200">
                    ממתין לאימות אימייל
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm text-slate-400">
                עדכון פרטים מתקדם —{" "}
                <span className="text-slate-500">בקרוב דרך התמיכה</span>
              </p>
            </div>
          </div>
        </div>

        <div className="ds-card-glass border-white/10 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">סיכום הזמנות</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-950/50 p-4">
              <dt className="text-xs text-slate-500">סה״כ הזמנות</dt>
              <dd className="mt-1 text-2xl font-bold text-slate-50">{totalOrders}</dd>
            </div>
            <div className="rounded-xl bg-slate-950/50 p-4">
              <dt className="text-xs text-slate-500">הזמנה אחרונה</dt>
              <dd className="mt-1 text-sm font-medium text-slate-200">
                {lastOrder ? (
                  <>
                    <span className="font-mono text-blue-300">{lastOrder.orderNumber}</span>
                    <span className="mt-1 block text-xs font-normal text-slate-500">
                      {new Date(lastOrder.createdAt).toLocaleDateString("he-IL")}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500">אין עדיין</span>
                )}
              </dd>
            </div>
          </dl>
          {profile && (
            <p className="mt-4 text-sm text-slate-400">
              נקודות מועדון:{" "}
              <span className="font-semibold text-slate-100">{profile.pointsBalance}</span>
            </p>
          )}
          <Link
            href="/account/orders"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500"
          >
            מעקב הזמנות
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="ds-card-glass border-white/10 p-5">
          <h2 className="text-sm font-semibold text-slate-200">פרטים אישיים</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>
              <span className="text-slate-500">שם: </span>
              {user.name}
            </li>
            <li>
              <span className="text-slate-500">אימייל: </span>
              {user.email}
            </li>
            <li>
              <span className="text-slate-500">טלפון: </span>
              {profile?.phone ?? "—"}
            </li>
          </ul>
        </section>
        <section className="ds-card-glass border-white/10 p-5">
          <h2 className="text-sm font-semibold text-slate-200">כתובות</h2>
          <p className="mt-3 text-sm text-slate-500">ניהול כתובות שמורות — בקרוב.</p>
        </section>
        <section className="ds-card-glass border-white/10 p-5 md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-200">מעקב הזמנות</h2>
          {orders.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">עדיין אין הזמנות להצגה.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/10">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                  <div>
                    <span className="font-mono text-sm text-slate-200">{o.orderNumber}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {new Date(o.createdAt).toLocaleString("he-IL")}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="text-sm font-semibold text-slate-100">₪{Number(o.total).toFixed(2)}</span>
                    <Link href={`/account/orders/${o.id}`} className="ms-3 text-xs text-blue-400 hover:underline">
                      פרטים
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ds-card-glass border-white/10 p-5">
          <h2 className="text-sm font-semibold text-slate-200">אבטחה</h2>
          <p className="mt-3 text-sm text-slate-500">שינוי סיסמה — צרו קשר עם התמיכה או השתמשו בשחזור כשיהיה זמין.</p>
          <Link href="/forgot-password" className="mt-2 inline-block text-sm text-blue-400 hover:underline">
            שכחתי סיסמה
          </Link>
        </section>
        <section className="ds-card-glass border-white/10 p-5">
          <h2 className="text-sm font-semibold text-slate-200">התראות</h2>
          <p className="mt-3 text-sm text-slate-500">הגדרות דוא״ל והתראות — בקרוב.</p>
        </section>
      </div>
    </div>
  );
}
