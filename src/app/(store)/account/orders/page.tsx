import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { STORE_ID } from "@/lib/store";
import { FULFILLMENT_LABELS_HE } from "@/lib/order-tracking";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const storeId = STORE_ID;

  const profile = await prisma.customerProfile.findFirst({
    where: { userId: session.userId, storeId },
  });

  const orders = profile
    ? await prisma.order.findMany({
        where: { storeId, customerId: profile.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          items: true,
        },
      })
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-50">ההזמנות שלי</h1>
      <p className="mt-1 text-sm text-slate-400">מעקב אחר סטטוס הטיפול והמשלוח</p>
      <ul className="mt-6 space-y-4">
        {orders.map((o) => {
          const cancelled = o.status === "CANCELLED";
          const fulfillmentLabel = cancelled ? "בוטלה" : FULFILLMENT_LABELS_HE[o.fulfillmentStatus];
          return (
            <li key={o.id} className="ds-card-glass border-white/10 p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-base font-semibold text-slate-100">{o.orderNumber}</span>
                  <p className="mt-1 text-xs text-slate-500">{new Date(o.createdAt).toLocaleString("he-IL")}</p>
                </div>
                <div className="text-start md:text-end">
                  <p className="text-lg font-bold text-slate-50">₪{Number(o.total).toFixed(2)}</p>
                  <p className={`mt-1 text-xs font-medium ${cancelled ? "text-red-400" : "text-slate-400"}`}>
                    {fulfillmentLabel} · תשלום: {o.paymentStatus}
                  </p>
                </div>
              </div>
              {o.items.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm text-slate-400">
                  {o.items.slice(0, 4).map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate text-slate-300">{item.productName}</span>
                      <span className="shrink-0 text-slate-500">
                        ×{item.quantity} · ₪{Number(item.totalPrice).toFixed(2)}
                      </span>
                    </li>
                  ))}
                  {o.items.length > 4 && (
                    <li className="text-xs text-slate-500">ועוד {o.items.length - 4} פריטים…</li>
                  )}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/account/orders/${o.id}`}
                  className="inline-flex min-h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500"
                >
                  מעקב מפורט
                </Link>
                <Link
                  href={`/checkout/payment/${o.id}`}
                  className="inline-flex min-h-10 items-center rounded-xl border border-white/15 px-4 text-sm text-slate-200 hover:bg-white/5"
                >
                  תשלום
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {orders.length === 0 && <p className="mt-6 text-slate-500">אין הזמנות עדיין.</p>}
      <Link href="/products" className="mt-8 inline-block text-sm text-blue-400 hover:underline">
        המשך קנייה
      </Link>
    </div>
  );
}
