import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { PaymentActions } from "@/components/payment-actions";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const storeId = STORE_ID;
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      paymentStatus: true,
      status: true,
    },
  });
  if (!order) notFound();

  const settings = await prisma.storeSettings.findUnique({ where: { storeId } });
  const currency = settings?.currency ?? "ILS";

  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-zinc-900">תשלום</h1>
      <p className="mt-2 font-mono text-lg font-semibold text-zinc-800">{order.orderNumber}</p>
      <p className="mt-4 text-zinc-600">
        סכום לתשלום:{" "}
        <span className="font-semibold text-zinc-900">
          {Number(order.total).toFixed(2)} {currency}
        </span>
      </p>
      <p className="mt-2 text-sm text-zinc-500">
        סטטוס: {order.paymentStatus} / {order.status}
      </p>
      <div className="mt-8 space-y-4">
        <PaymentActions orderId={order.id} isPaid={order.paymentStatus === "PAID"} />
        <Link href="/account/orders" className="block text-blue-600 hover:underline">
          ההזמנות שלי
        </Link>
      </div>
      <p className="mt-8 text-xs text-zinc-400">
        שילוב PSP: שלחו webhook ל־/api/webhooks/payment/&lt;provider&gt; עם אסימון תקף.
      </p>
    </div>
  );
}
