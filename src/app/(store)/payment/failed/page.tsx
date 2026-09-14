import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STORE_ID, SITE_NAME } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams?: Promise<{ orderId?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const orderId = sp.orderId?.trim() || "";

  const order = orderId
    ? await prisma.order.findFirst({
        where: { id: orderId, storeId: STORE_ID },
        select: { orderNumber: true, total: true },
      })
    : null;

  const retryHref = orderId ? `/checkout/payment/${encodeURIComponent(orderId)}` : "/checkout";

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-400">{SITE_NAME}</p>
      <h1 className="mt-3 text-3xl font-black text-white">התשלום לא הושלם</h1>
      {order?.orderNumber ? <p className="mt-2 font-mono text-lg text-zinc-300">{order.orderNumber}</p> : null}
      <p className="mt-4 text-zinc-400">הסל נשמר. אפשר לנסות שוב לתשלום.</p>
      {order ? <p className="mt-2 text-zinc-500">₪{Number(order.total).toFixed(2)}</p> : null}
      <div className="mt-8 flex justify-center">
        <Link href={retryHref} className="hagor-btn">
          נסה שוב
        </Link>
      </div>
    </div>
  );
}
