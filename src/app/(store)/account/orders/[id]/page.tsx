import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { STORE_ID } from "@/lib/store";
import { OrderTimeline } from "@/components/account/order-timeline";

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const storeId = STORE_ID;
  const { id } = await params;

  const profile = await prisma.customerProfile.findFirst({
    where: { userId: session.userId, storeId },
  });
  if (!profile) redirect("/account/orders");

  const order = await prisma.order.findFirst({
    where: { id, storeId, customerId: profile.id },
    include: { items: true },
  });
  if (!order) notFound();

  const shipped = order.fulfillmentStatus === "SHIPPED";
  const completed = order.fulfillmentStatus === "COMPLETED";
  const cancelled = order.status === "CANCELLED";

  let accent = "border-white/10";
  if (cancelled) accent = "border-red-500/30";
  else if (completed) accent = "border-emerald-500/35";
  else if (shipped) accent = "border-blue-500/35";

  return (
    <div>
      <Link href="/account/orders" className="text-sm text-blue-400 hover:underline">
        ← חזרה להזמנות
      </Link>
      <div className={`ds-card-glass mt-4 border ${accent} p-5 md:p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-50 md:text-2xl">הזמנה {order.orderNumber}</h1>
            <p className="mt-1 text-sm text-slate-400">{new Date(order.createdAt).toLocaleString("he-IL")}</p>
          </div>
          <div className="text-start md:text-end">
            <p className="text-2xl font-bold text-slate-50">₪{Number(order.total).toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-500">סטטוס תשלום: {order.paymentStatus}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-300">מסלול משלוח</h2>
            <p className="mt-2 text-sm text-slate-400">{order.deliveryOptionName}</p>
            {order.address && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">{order.address}</p>
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-300">מצב הזמנה</h2>
            <div className="mt-3">
              <OrderTimeline status={order.status} fulfillmentStatus={order.fulfillmentStatus} />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-300">מוצרים</h2>
          <ul className="mt-3 divide-y divide-white/10">
            {order.items.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <span className="text-slate-200">{item.productName}</span>
                <span className="text-slate-500">
                  {item.quantity} × ₪{Number(item.unitPrice).toFixed(2)} = ₪{Number(item.totalPrice).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/checkout/payment/${order.id}`}
            className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500"
          >
            עמוד תשלום
          </Link>
        </div>
      </div>
    </div>
  );
}
