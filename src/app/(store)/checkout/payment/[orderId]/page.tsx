import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPaymentProviderConfig } from "@/lib/payments/config";
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

  const [settings, paymentConfig] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { storeId }, select: { currency: true } }),
    getPaymentProviderConfig(),
  ]);
  const currency = settings?.currency ?? "ILS";

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-center text-2xl font-black text-white">תשלום מאובטח</h1>
      <p className="mt-2 text-center font-mono text-lg text-hagor-gold">{order.orderNumber}</p>
      <p className="mt-4 text-center text-zinc-400">
        סכום לתשלום:{" "}
        <span className="font-semibold text-white">
          {Number(order.total).toFixed(2)} {currency}
        </span>
      </p>
      <p className="mt-2 text-center text-xs text-zinc-500">
        ספק: {paymentConfig.provider} · המלאי יירד רק לאחר אישור תשלום
      </p>
      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
        <PaymentActions
          orderId={order.id}
          isPaid={order.paymentStatus === "PAID"}
          provider={paymentConfig.provider}
        />
      </div>
      <Link href="/account/orders" className="mt-6 block text-center text-sm text-hagor-gold hover:underline">
        ההזמנות שלי
      </Link>
    </div>
  );
}
