import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STORE_ID, SITE_NAME } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams?: Promise<{ orderId?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const orderId = sp.orderId?.trim();
  if (!orderId) notFound();

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: STORE_ID },
    select: { orderNumber: true, total: true },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-400">{SITE_NAME}</p>
      <h1 className="mt-3 text-3xl font-black text-white">התשלום לא הושלם</h1>
      <p className="mt-2 font-mono text-lg text-zinc-300">{order.orderNumber}</p>
      <p className="mt-4 text-zinc-400">ניתן לנסות שוב או ליצור קשר עם שירות הלקוחות.</p>
      <p className="mt-2 text-zinc-500">₪{Number(order.total).toFixed(2)}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={`/checkout/payment/${orderId}`} className="hagor-btn">
          נסה שוב
        </Link>
        <Link href="/products" className="hagor-btn-outline">
          חזרה לחנות
        </Link>
      </div>
    </div>
  );
}
