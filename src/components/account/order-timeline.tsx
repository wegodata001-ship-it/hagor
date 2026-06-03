"use client";

import type { OrderFulfillmentStatus, OrderPaymentStatus, OrderStatus } from "@prisma/client";
import { orderTimelineMeta } from "@/lib/order-tracking";

export function OrderTimeline({
  status,
  paymentStatus,
  fulfillmentStatus,
}: {
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
}) {
  const { cancelled, awaitingPayment, steps } = orderTimelineMeta({
    status,
    paymentStatus,
    fulfillmentStatus,
  });

  if (awaitingPayment) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <p className="text-sm font-medium text-amber-100">ממתין לתשלום</p>
        <p className="mt-1 text-xs text-amber-200/80">לאחר אישור התשלום יופיע מסלול המשלוח.</p>
      </div>
    );
  }

  return (
    <div>
      <ol className="relative space-y-0 border-s-2 border-zinc-700/80 ps-6 ms-2">
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          const dotClass = cancelled
            ? "border-red-500/50 bg-red-950 text-red-300"
            : s.current
              ? "border-hagor-gold bg-hagor-gold/20 text-hagor-gold shadow-[0_0_12px_rgba(200,146,17,0.35)]"
              : s.done
                ? "border-emerald-600/60 bg-emerald-950/40 text-emerald-400"
                : "border-zinc-600 bg-zinc-900 text-zinc-500";

          const labelClass = cancelled
            ? "text-red-300"
            : s.current
              ? "text-hagor-gold font-bold"
              : s.done
                ? "text-zinc-300"
                : "text-zinc-500";

          return (
            <li key={s.key} className={`relative ${isLast ? "" : "pb-6"}`}>
              <span
                className={`absolute -start-[1.65rem] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold ${dotClass}`}
              >
                {s.done ? "✓" : s.current ? "●" : ""}
              </span>
              <p className={`text-sm leading-snug ${labelClass}`}>{s.label}</p>
              {!isLast && s.current ? (
                <span className="mt-1 block text-xs text-hagor-gold/80">שלב נוכחי</span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {cancelled && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          ההזמנה בוטלה
        </p>
      )}
    </div>
  );
}
