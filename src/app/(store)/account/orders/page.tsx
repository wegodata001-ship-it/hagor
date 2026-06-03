import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth/cached-session";
import { listCustomerOrders } from "@/lib/account/customer-orders";
import { formatOrderDate, getCustomerOrderStatusLabel, isOrderPaymentSettled } from "@/lib/order-tracking";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const session = await getCachedSession();
  if (!session) redirect("/login");

  const orders = await safeQuery("account.orders_list", () => listCustomerOrders(session.userId), [], {
    timeoutMs: 25_000,
  });

  return (
    <div>
      <h1 className="text-2xl font-black text-white">ההזמנות שלי</h1>
      <p className="mt-1 text-sm text-zinc-400">מעקב אחר כל ההזמנות, סטטוס ופרטי משלוח</p>

      {orders.length === 0 ? (
        <p className="mt-8 text-zinc-500">אין הזמנות עדיין.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/80">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-zinc-700/80 text-start text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium">מספר הזמנה</th>
                <th className="px-4 py-3 font-medium">תאריך</th>
                <th className="px-4 py-3 font-medium">סכום</th>
                <th className="px-4 py-3 font-medium">סטטוס</th>
                <th className="px-4 py-3 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const statusLabel = getCustomerOrderStatusLabel(o);
                const paid = isOrderPaymentSettled(o.paymentStatus, o.status);
                return (
                  <tr key={o.id} className="border-b border-zinc-800/80 last:border-0 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-mono font-semibold text-zinc-100">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatOrderDate(o.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-100">₪{Number(o.total).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          o.status === "CANCELLED"
                            ? "bg-red-500/15 text-red-300"
                            : !paid
                              ? "bg-amber-500/15 text-amber-200"
                              : "bg-hagor-gold/15 text-hagor-gold"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/account/orders/${o.id}`}
                        className="inline-flex min-h-9 items-center rounded-lg border border-hagor-gold/50 px-3 text-xs font-medium text-hagor-gold hover:bg-hagor-gold/10"
                      >
                        הצג פרטים
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Link href="/products" className="mt-8 inline-block text-sm text-hagor-gold hover:underline">
        המשך קנייה
      </Link>
    </div>
  );
}
