import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STORE_ID, SITE_NAME } from "@/lib/store";
import { ClearCartOnPaid } from "@/components/storefront/clear-cart-on-paid";

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ orderId?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const orderId = sp.orderId?.trim();
  if (!orderId) notFound();

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: STORE_ID },
    select: {
      orderNumber: true,
      total: true,
      paymentStatus: true,
      customerName: true,
      items: { select: { productName: true, quantity: true, totalPrice: true } },
    },
  });
  if (!order) notFound();

  const paid =
    order.paymentStatus === "PAID" ||
    order.paymentStatus === "TEST_PAID" ||
    order.paymentStatus === "DEMO_PAID";

  if (!paid) {
    redirect(`/payment/failed?orderId=${encodeURIComponent(orderId)}`);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <ClearCartOnPaid paid />
      <p className="text-xs font-bold uppercase tracking-[0.35em] text-hagor-gold">{SITE_NAME}</p>
      <h1 className="mt-3 text-3xl font-black text-white">התשלום התקבל בהצלחה</h1>
      <p className="mt-2 font-mono text-lg text-zinc-300">{order.orderNumber}</p>
      <p className="mt-4 text-zinc-400">
        שלום {order.customerName}, קיבלנו את התשלום. נשלח אליך אימייל אישור.
      </p>
      {order.items.length > 0 ? (
        <ul className="mx-auto mt-6 max-w-sm divide-y divide-zinc-800 rounded-xl border border-zinc-800 text-start text-sm">
          {order.items.map((item, idx) => (
            <li key={`${item.productName}-${idx}`} className="flex justify-between gap-3 px-4 py-2">
              <span className="text-zinc-200">
                {item.productName} ×{item.quantity}
              </span>
              <span className="text-hagor-gold">₪{Number(item.totalPrice).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4 text-hagor-gold">₪{Number(order.total).toFixed(2)}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/track-order" className="hagor-btn">
          מעקב הזמנה
        </Link>
        <Link href="/products" className="hagor-btn-outline">
          המשך קנייה
        </Link>
      </div>
    </div>
  );
}
