"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStoreI18n } from "@/components/storefront/store-i18n";

export function PaymentActions({
  orderId,
  isPaid,
  paymentReady = true,
  successHref,
}: {
  orderId: string;
  isPaid: boolean;
  paymentReady?: boolean;
  /** Signed success URL when already paid — never bare orderId for PII. */
  successHref?: string;
}) {
  const { t } = useStoreI18n();
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const autoStarted = useRef(false);

  async function payWithCard() {
    if (loading || !paymentReady) return;
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
        setMsg(typeof data.error === "string" ? data.error : t("checkoutPaymentError"));
        return;
      }
      window.location.href = data.redirectUrl as string;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isPaid || !paymentReady) return;
    if (autoStarted.current) return;
    autoStarted.current = true;
    void payWithCard();
  }, [isPaid, paymentReady]);

  if (isPaid) {
    return (
      <div className="space-y-3">
        <p className="font-medium text-emerald-400">{t("paymentSuccessTitle")}</p>
        <Link href={successHref || "/track-order"} className="hagor-btn inline-block">
          {t("paymentSuccessView")}
        </Link>
      </div>
    );
  }

  if (!paymentReady) {
    return <p className="text-center text-sm text-amber-200">{t("checkoutPaymentError")}</p>;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={loading}
        onClick={() => void payWithCard()}
        className="hagor-btn w-full disabled:opacity-50"
      >
        {loading ? t("checkoutPayLoading") : t("checkoutPayButton")}
      </button>
      <p className="text-center text-xs text-zinc-500">{t("checkoutPaySecureHint")}</p>
      {msg ? <p className="text-sm text-red-400">{msg}</p> : null}
    </div>
  );
}
