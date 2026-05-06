import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { STORE_ID } from "@/lib/store";

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
      })
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">ההזמנות שלי</h1>
      <ul className="mt-6 space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-zinc-900">{o.orderNumber}</span>
              <span className="font-mono text-xs text-zinc-400">{o.id.slice(0, 10)}…</span>
              <span className="text-sm">
                {o.status} · {o.paymentStatus}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-zinc-800">
              <span>{new Date(o.createdAt).toLocaleString("he-IL")}</span>
              <span className="font-semibold">₪{Number(o.total).toFixed(2)}</span>
            </div>
            <Link
              href={`/checkout/payment/${o.id}`}
              className="mt-2 inline-block text-sm text-blue-600 hover:underline"
            >
              פרטי תשלום
            </Link>
          </li>
        ))}
      </ul>
      {orders.length === 0 && <p className="mt-6 text-zinc-600">אין הזמנות עדיין.</p>}
      <Link href="/products" className="mt-8 inline-block text-blue-600 hover:underline">
        המשך קנייה
      </Link>
    </div>
  );
}
