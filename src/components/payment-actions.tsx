"use client";

import { useState } from "react";

export function PaymentActions({
  orderId,
  isPaid,
}: {
  orderId: string;
  isPaid: boolean;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function demoPay() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/payments/demo-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      setMsg(data.message ?? (res.ok ? "בוצע" : data.error));
      if (res.ok) window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  if (isPaid) {
    return <p className="font-medium text-green-700">התשלום התקבל</p>;
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={() => demoPay()}
        className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700 disabled:bg-zinc-400"
      >
        {loading ? "מעבד…" : "השלם תשלום (דמו)"}
      </button>
      <p className="mt-2 text-xs text-zinc-500">
        דורש ALLOW_DEMO_PAYMENT=true או התחברות לקוח שביצע את ההזמנה / בעל חנות.
      </p>
      {msg && <p className="mt-2 text-sm text-zinc-700">{msg}</p>}
    </div>
  );
}
