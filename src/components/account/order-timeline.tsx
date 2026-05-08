"use client";

import type { OrderFulfillmentStatus, OrderStatus } from "@prisma/client";
import { orderTimelineMeta } from "@/lib/order-tracking";

export function OrderTimeline({
  status,
  fulfillmentStatus,
}: {
  status: OrderStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
}) {
  const { cancelled, steps } = orderTimelineMeta({ status, fulfillmentStatus });

  return (
    <div>
      <ol className="space-y-4">
        {steps.map((s, i) => {
          const dotClass = cancelled
            ? s.current
              ? "border-red-400 bg-red-500/25 text-red-200"
              : "border-slate-600 bg-slate-900 text-slate-600"
            : s.current
              ? "border-blue-400 bg-blue-500/20 text-blue-100 shadow-[0_0_0_3px_rgba(37,99,235,0.25)]"
              : s.done
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                : "border-slate-600 bg-slate-900 text-slate-500";

          return (
            <li key={s.key} className="flex gap-3">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${dotClass}`}
              >
                {cancelled && s.current ? "!" : s.done ? "✓" : i + 1}
              </span>
              <p
                className={`pt-1 text-sm font-medium leading-snug ${
                  cancelled && s.current
                    ? "text-red-300"
                    : s.current
                      ? "text-blue-200"
                      : s.done
                        ? "text-emerald-200"
                        : "text-slate-500"
                }`}
              >
                {s.label}
              </p>
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
