"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function PaymentActions({
  orderId,
  isPaid,
  provider,
}: {
  orderId: string;
  isPaid: boolean;
  provider?: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);

  async function payWithCard() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        setMsg(data.error ?? "לא ניתן להתחיל תשלום");
        return;
      }
      window.location.href = data.redirectUrl as string;
    } finally {
      setLoading(false);
    }
  }

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
      if (res.ok) window.location.href = `/payment/success?orderId=${encodeURIComponent(orderId)}`;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isPaid || autoStarted || provider === "demo") return;
    setAutoStarted(true);
    void payWithCard();
  }, [isPaid, autoStarted, provider]);

  if (isPaid) {
    return (
      <div className="space-y-3">
        <p className="font-medium text-emerald-400">התשלום התקבל בהצלחה</p>
        <Link href={`/payment/success?orderId=${orderId}`} className="hagor-btn inline-block">
          צפייה באישור
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button type="button" disabled={loading} onClick={() => void payWithCard()} className="hagor-btn w-full disabled:opacity-50">
        {loading ? "מעביר לתשלום מאובטח…" : "תשלום בכרטיס אשראי"}
      </button>
      {provider === "demo" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => void demoPay()}
          className="hagor-btn-outline w-full disabled:opacity-50"
        >
          תשלום דמו (פיתוח)
        </button>
      )}
      {msg && <p className="text-sm text-red-400">{msg}</p>}
    </div>
  );
}
