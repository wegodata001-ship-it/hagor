import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderTimeline } from "@/components/account/order-timeline";
import { getCachedSession } from "@/lib/auth/cached-session";
import { getCustomerOrderById } from "@/lib/account/customer-orders";
import {
  formatOrderDate,
  getCustomerOrderStatusLabel,
  isOrderPaymentSettled,
} from "@/lib/order-tracking";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCachedSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const order = await safeQuery(
    "account.order_detail",
    () => getCustomerOrderById(session.userId, id),
    null,
    { timeoutMs: 25_000 },
  );

  if (order === null) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-zinc-900/80 p-6 text-center">
        <p className="font-medium text-zinc-100">לא ניתן לטעון את ההזמנה כרגע.</p>
        <Link href="/account/orders" className="mt-4 inline-block text-sm text-hagor-gold hover:underline">
          חזרה להזמנות
        </Link>
      </div>
    );
  }

  if (!order) notFound();

  const statusLabel = getCustomerOrderStatusLabel(order);
  const paid = isOrderPaymentSettled(order.paymentStatus, order.status);
  const cancelled = order.status === "CANCELLED";

  return (
    <div>
      <Link href="/account/orders" className="text-sm text-hagor-gold hover:underline">
        ← חזרה להזמנות
      </Link>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <p className="text-xs text-zinc-500">מספר הזמנה</p>
            <h1 className="font-mono text-2xl font-black text-white">{order.orderNumber}</h1>
            <p className="mt-2 text-sm text-zinc-400">תאריך: {formatOrderDate(order.createdAt)}</p>
          </div>
          <div className="text-start md:text-end">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                cancelled
                  ? "bg-red-500/15 text-red-300"
                  : !paid
                    ? "bg-amber-500/15 text-amber-200"
                    : "bg-hagor-gold/15 text-hagor-gold"
              }`}
            >
              {statusLabel}
            </span>
            <p className="mt-3 text-2xl font-bold text-white">₪{Number(order.total).toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="text-sm font-semibold text-zinc-300">פרטי לקוח ומשלוח</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-zinc-500">שם:</dt>
                <dd className="text-zinc-200">{order.customerName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-zinc-500">טלפון:</dt>
                <dd className="text-zinc-200" dir="ltr">
                  {order.customerPhone}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-zinc-500">משלוח:</dt>
                <dd className="text-zinc-200">{order.deliveryOptionName}</dd>
              </div>
              {order.address ? (
                <div>
                  <dt className="text-zinc-500">כתובת:</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-zinc-300">{order.address}</dd>
                </div>
              ) : null}
            </dl>

            {order.trackingNumber ? (
              <div className="mt-6 rounded-xl border border-hagor-gold/30 bg-hagor-gold/5 p-4">
                <p className="text-xs text-zinc-500">מספר מעקב</p>
                <p className="mt-1 font-mono text-base font-semibold text-hagor-gold" dir="ltr">
                  {order.trackingNumber}
                </p>
                {order.courierName ? (
                  <>
                    <p className="mt-3 text-xs text-zinc-500">חברת משלוחים</p>
                    <p className="mt-1 text-sm text-zinc-200">{order.courierName}</p>
                  </>
                ) : null}
              </div>
            ) : null}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-zinc-300">מעקב התקדמות</h2>
            <div className="mt-4">
              <OrderTimeline
                status={order.status}
                paymentStatus={order.paymentStatus}
                fulfillmentStatus={order.fulfillmentStatus}
              />
            </div>
          </section>
        </div>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-300">מוצרים</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50 text-xs text-zinc-500">
                  <th className="px-4 py-2 text-start font-medium">מוצר</th>
                  <th className="px-4 py-2 text-center font-medium">כמות</th>
                  <th className="px-4 py-2 text-end font-medium">מחיר</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-800/80 last:border-0">
                    <td className="px-4 py-3 text-zinc-200">{item.productName}</td>
                    <td className="px-4 py-3 text-center text-zinc-400">{item.quantity}</td>
                    <td className="px-4 py-3 text-end tabular-nums text-zinc-300">
                      ₪{Number(item.totalPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-end text-zinc-500">
                    סה״כ
                  </td>
                  <td className="px-4 py-3 text-end text-lg font-bold text-hagor-gold">
                    ₪{Number(order.total).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {!paid && !cancelled ? (
          <div className="mt-8">
            <Link
              href={`/checkout/payment/${order.id}`}
              className="hagor-btn inline-flex min-h-11 items-center px-6"
            >
              השלמת תשלום
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
