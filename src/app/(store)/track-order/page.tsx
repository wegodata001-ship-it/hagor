import { SITE_NAME } from "@/lib/store";
import { findOrderByTrackingToken } from "@/lib/order-tracking-access";
import { TrackOrderClient } from "./track-order-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `מעקב הזמנה | ${SITE_NAME}`,
  description: "מעקב הזמנה מאובטח לפי מספר הזמנה וטלפון או אימייל",
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams?: Promise<{ t?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const token = sp.t?.trim() || "";
  const initialOrder = token ? await findOrderByTrackingToken(token) : null;

  return (
    <main className="mx-auto max-w-3xl overflow-x-hidden px-4 py-12 md:py-16">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-hagor-gold">{SITE_NAME}</p>
        <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">מעקב אחר ההזמנה</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-400">
          הזינו את פרטי ההזמנה כדי לצפות בסטטוס העדכני שלה
        </p>
      </div>

      <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-[0_0_40px_rgba(200,146,17,0.06)] md:p-8">
        <TrackOrderClient
          initialOrder={initialOrder}
          initialToken={token || undefined}
          tokenError={Boolean(token && !initialOrder)}
        />
      </div>
    </main>
  );
}
