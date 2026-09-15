import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STORE_ID, SITE_NAME } from "@/lib/store";
import { ClearCartOnPaid } from "@/components/storefront/clear-cart-on-paid";
import {
  findOrderByTrackingToken,
  verifyOrderTrackingToken,
} from "@/lib/order-tracking-access";
import { wasCustomerConfirmationEmailSent } from "@/lib/email/email-idempotency";
import { formatSelectedOptionsLines, parseSelectedOptions } from "@/lib/hagour-product-options";
import { FULFILLMENT_LABELS_HE } from "@/lib/order-tracking";
import type { OrderFulfillmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function money(n: number): string {
  return `₪${n.toFixed(2)}`;
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ t?: string; orderId?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const token = sp.t?.trim() || "";
  const bareOrderId = sp.orderId?.trim() || "";

  // Privacy: full order details require a signed tracking token.
  // Bare orderId must not expose customer PII or line items.
  if (!token) {
    if (bareOrderId) {
      const paid = await prisma.order.findFirst({
        where: { id: bareOrderId, storeId: STORE_ID },
        select: { paymentStatus: true, orderNumber: true },
      });
      if (
        paid &&
        (paid.paymentStatus === "PAID" ||
          paid.paymentStatus === "TEST_PAID" ||
          paid.paymentStatus === "DEMO_PAID")
      ) {
        return (
          <main className="mx-auto max-w-lg px-4 py-16 text-center">
            <ClearCartOnPaid paid />
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-hagor-gold">{SITE_NAME}</p>
            <h1 className="mt-4 text-3xl font-black text-white">ההזמנה התקבלה בהצלחה</h1>
            <p className="mt-3 text-sm text-zinc-400">
              התשלום התקבל. למעקב מלא אחרי ההזמנה הזינו מספר הזמנה עם טלפון או אימייל.
            </p>
            {paid.orderNumber ? (
              <p className="mt-4 font-mono text-hagor-gold">{paid.orderNumber}</p>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/track-order" className="hagor-btn">
                מעקב אחר ההזמנה
              </Link>
              <Link href="/products" className="hagor-btn-outline">
                המשך בקנייה
              </Link>
            </div>
          </main>
        );
      }
      redirect(`/payment/failed?orderId=${encodeURIComponent(bareOrderId)}`);
    }
    notFound();
  }

  const verified = verifyOrderTrackingToken(token);
  if (!verified) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-hagor-gold">{SITE_NAME}</p>
        <h1 className="mt-4 text-2xl font-black text-white">קישור לא תקף</h1>
        <p className="mt-3 text-sm text-zinc-400">למעקב הזמנה השתמשו במספר הזמנה יחד עם טלפון או אימייל.</p>
        <Link href="/track-order" className="hagor-btn mt-8 inline-flex">
          מעקב אחר ההזמנה
        </Link>
      </main>
    );
  }

  const publicView = await findOrderByTrackingToken(token);
  if (!publicView) notFound();

  const order = await prisma.order.findFirst({
    where: { id: verified.orderId, storeId: STORE_ID },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      subtotal: true,
      deliveryPrice: true,
      discountAmount: true,
      pointsDiscountAmount: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      customerName: true,
      deliveryOptionName: true,
      address: true,
      items: {
        select: {
          productName: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          selectedOptions: true,
        },
      },
      payments: {
        where: { status: { in: ["PAID", "TEST_PAID", "DEMO_PAID"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { amount: true, provider: true },
      },
    },
  });
  if (!order) notFound();

  const paid =
    order.paymentStatus === "PAID" ||
    order.paymentStatus === "TEST_PAID" ||
    order.paymentStatus === "DEMO_PAID";

  if (!paid) {
    redirect(`/payment/failed?orderId=${encodeURIComponent(order.id)}`);
  }

  const emailSent = await wasCustomerConfirmationEmailSent(order.id);
  const paidAmount = order.payments[0] ? Number(order.payments[0].amount) : Number(order.total);
  const discount = Number(order.discountAmount) + Number(order.pointsDiscountAmount);
  const trackHref = `/track-order?t=${encodeURIComponent(token)}`;
  const fulfillmentLabel =
    FULFILLMENT_LABELS_HE[order.fulfillmentStatus as OrderFulfillmentStatus] ?? "הזמנה התקבלה";

  return (
    <main className="relative mx-auto max-w-2xl overflow-x-hidden px-4 py-10 sm:py-14">
      <ClearCartOnPaid paid />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,rgba(200,146,17,0.18),transparent_60%)]"
      />

      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-hagor-gold">{SITE_NAME}</p>

        <div className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full border border-hagor-gold/50 bg-hagor-gold/10 shadow-[0_0_40px_rgba(200,146,17,0.25)] sm:h-20 sm:w-20">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-hagor-gold sm:h-9 sm:w-9" fill="none" aria-hidden>
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-3xl font-black leading-tight text-white sm:text-4xl">
          ההזמנה התקבלה בהצלחה
        </h1>
        <p className="mt-3 text-base text-zinc-300 sm:text-lg">תודה על הרכישה, {order.customerName}</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
          {emailSent
            ? "התשלום התקבל בהצלחה ואישור ההזמנה נשלח אליך במייל."
            : "התשלום התקבל בהצלחה וההזמנה נקלטה במערכת."}
        </p>
      </div>

      <section className="mt-10 rounded-2xl border border-zinc-800 bg-[#0d0d0d]/95 p-5 shadow-[0_0_40px_rgba(200,146,17,0.06)] sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-zinc-500">מספר הזמנה</p>
            <p className="mt-1 font-mono text-base font-semibold text-hagor-gold">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">סטטוס</p>
            <p className="mt-1 text-base font-semibold text-emerald-400">שולם</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">סכום ששולם</p>
            <p className="mt-1 text-base font-semibold text-white">{money(paidAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">אמצעי תשלום</p>
            <p className="mt-1 text-base font-semibold text-white">כרטיס אשראי</p>
          </div>
        </div>

        <div className="mt-7 border-t border-zinc-800 pt-6">
          <h2 className="text-sm font-bold tracking-wide text-hagor-gold">פרטי ההזמנה</h2>
          <ul className="mt-4 space-y-3">
            {order.items.map((item, idx) => {
              const opts = parseSelectedOptions(item.selectedOptions);
              const lines = formatSelectedOptionsLines(opts, "he");
              return (
                <li
                  key={`${item.productName}-${idx}`}
                  className="flex flex-col gap-1 border-b border-zinc-900 pb-3 last:border-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 text-start">
                    <p className="font-medium text-zinc-100">{item.productName}</p>
                    {lines.map((line) => (
                      <p key={line} className="text-xs text-zinc-500">
                        {line}
                      </p>
                    ))}
                    <p className="mt-1 text-sm text-zinc-400">
                      {item.quantity} × {money(Number(item.unitPrice))}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-hagor-gold sm:pt-0.5">
                    {money(Number(item.totalPrice))}
                  </p>
                </li>
              );
            })}
          </ul>

          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-3 text-zinc-400">
              <dt>Subtotal</dt>
              <dd>{money(Number(order.subtotal))}</dd>
            </div>
            <div className="flex justify-between gap-3 text-zinc-400">
              <dt>משלוח{order.deliveryOptionName ? ` (${order.deliveryOptionName})` : ""}</dt>
              <dd>{money(Number(order.deliveryPrice))}</dd>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between gap-3 text-emerald-400/90">
                <dt>הנחה</dt>
                <dd>−{money(discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t border-zinc-800 pt-3 text-base font-bold text-white">
              <dt>סה״כ ששולם</dt>
              <dd className="text-hagor-gold">{money(paidAmount)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 sm:p-6">
        <h2 className="text-sm font-bold text-hagor-gold">מה קורה עכשיו?</h2>
        <ol className="mt-4 space-y-3 text-start text-sm text-zinc-300">
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-hagor-gold/40 text-xs text-hagor-gold">
              1
            </span>
            <span>ההזמנה התקבלה ({fulfillmentLabel})</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-hagor-gold/40 text-xs text-hagor-gold">
              2
            </span>
            <span>התשלום אושר</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-hagor-gold/40 text-xs text-hagor-gold">
              3
            </span>
            <span>אנחנו מכינים את ההזמנה</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-hagor-gold/40 text-xs text-hagor-gold">
              4
            </span>
            <span>תקבל/י עדכון בהמשך</span>
          </li>
        </ol>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={trackHref} className="hagor-btn">
          מעקב אחר ההזמנה
        </Link>
        <Link href="/products" className="hagor-btn-outline">
          המשך בקנייה
        </Link>
      </div>
    </main>
  );
}
