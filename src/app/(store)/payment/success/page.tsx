import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STORE_ID, SITE_NAME } from "@/lib/store";

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
    },
  });
  if (!order) notFound();

  const paid = order.paymentStatus === "PAID";

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.35em] text-hagor-gold">{SITE_NAME}</p>
      <h1 className="mt-3 text-3xl font-black text-white">{paid ? "תודה! התשלום התקבל" : "ההזמנה התקבלה"}</h1>
      <p className="mt-2 font-mono text-lg text-zinc-300">{order.orderNumber}</p>
      <p className="mt-4 text-zinc-400">
        {paid
          ? `שלום ${order.customerName}, קיבלנו את התשלום. נשלח אליך אימייל אישור.`
          : "ממתינים לאישור סופי מהבנק — תקבל עדכון באימייל."}
      </p>
      <p className="mt-2 text-hagor-gold">₪{Number(order.total).toFixed(2)}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/account/orders" className="hagor-btn">
          מעקב הזמנה
        </Link>
        <Link href="/products" className="hagor-btn-outline">
          המשך קנייה
        </Link>
      </div>
    </div>
  );
}
