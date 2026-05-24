"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart-context";
import { useStoreI18n } from "@/components/storefront/store-i18n";

type DeliveryOption = {
  id: string;
  name_he: string;
  price: unknown;
  type: string;
};

const STEPS = ["cart", "details", "shipping", "payment"] as const;
type Step = (typeof STEPS)[number];

export function CheckoutWizard() {
  const router = useRouter();
  const { items, clear } = useCart();
  const { t, dir } = useStoreI18n();
  const [step, setStep] = useState<Step>("cart");
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [deliveryId, setDeliveryId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyHint, setVerifyHint] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);

  useEffect(() => {
    fetch("/api/delivery-options")
      .then((r) => r.json())
      .then((d: { options: DeliveryOption[] }) => {
        setDeliveryOptions(d.options);
        if (d.options[0]) setDeliveryId(d.options[0].id);
      });
    Promise.all([fetch("/api/auth/me").then((r) => r.json()), fetch("/api/store/public").then((r) => r.json())]).then(
      ([me, pub]: [{ user: { name?: string; email?: string; pointsBalance?: number | null; emailVerified?: boolean } | null }, { requireEmailVerificationForCheckout?: boolean }]) => {
        if (me.user) {
          setCustomerName(me.user.name ?? "");
          setCustomerEmail(me.user.email ?? "");
          setPointsBalance(me.user.pointsBalance ?? null);
          const needVerify = pub.requireEmailVerificationForCheckout !== false;
          if (needVerify && me.user.emailVerified === false) {
            setVerifyHint("יש לאמת את כתובת האימייל לפני השלמת הזמנה.");
          }
        }
      },
    );
  }, []);

  const selectedDelivery = useMemo(
    () => deliveryOptions.find((o) => o.id === deliveryId),
    [deliveryOptions, deliveryId],
  );
  const needsAddress = selectedDelivery?.type === "SHIPPING";

  async function createOrder() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          deliveryOptionId: deliveryId,
          address: needsAddress ? address : undefined,
          notes,
          couponCode: couponCode || undefined,
          redeemPoints: redeemPoints || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            optionIds: i.optionIds,
            selectedOptions: i.selectedOptions ?? null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "לא ניתן להשלים את הפעולה.");
        return;
      }
      const payRes = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderId }),
      });
      const payData = await payRes.json();
      if (payRes.ok && payData.redirectUrl) {
        clear();
        window.location.href = payData.redirectUrl as string;
        return;
      }
      clear();
      router.push(`/checkout/payment/${data.orderId}`);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0 && step === "cart") {
    return (
      <div dir={dir} className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-zinc-500">{t("emptyCart")}</p>
        <Link href="/products" className="mt-4 inline-block text-hagor-gold hover:underline">
          המשך קנייה
        </Link>
      </div>
    );
  }

  return (
    <div dir={dir} className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-black text-white">{t("checkout")}</h1>
      <ol className="mt-4 flex flex-wrap gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`rounded-full border px-3 py-1 ${i <= stepIndex ? "border-hagor-gold/60 bg-hagor-gold/15 text-hagor-gold" : "border-zinc-700 text-zinc-500"}`}
          >
            {i + 1}. {t(`checkoutStep_${s}`)}
          </li>
        ))}
      </ol>

      {verifyHint ? (
        <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {verifyHint}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl backdrop-blur-sm">
        {step === "cart" ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">{items.length} פריטים בעגלה</p>
            <button type="button" onClick={() => setStep("details")} className="hagor-btn w-full">
              המשך לפרטים
            </button>
          </div>
        ) : null}

        {step === "details" ? (
          <div className="space-y-4">
            <div>
              <label className="ds-label">שם מלא</label>
              <input required className="ds-input mt-1.5" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <label className="ds-label">אימייל</label>
              <input required type="email" className="ds-input mt-1.5" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
            <div>
              <label className="ds-label">טלפון</label>
              <input required className="ds-input mt-1.5" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("cart")} className="hagor-btn-outline flex-1">
                חזרה
              </button>
              <button
                type="button"
                disabled={!customerName || !customerEmail || !customerPhone}
                onClick={() => setStep("shipping")}
                className="hagor-btn flex-1 disabled:opacity-50"
              >
                המשך למשלוח
              </button>
            </div>
          </div>
        ) : null}

        {step === "shipping" ? (
          <div className="space-y-4">
            <div>
              <label className="ds-label">אופן משלוח</label>
              <select className="ds-select mt-1.5" value={deliveryId} onChange={(e) => setDeliveryId(e.target.value)}>
                {deliveryOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name_he} — ₪{Number(o.price).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            {needsAddress ? (
              <div>
                <label className="ds-label">כתובת למשלוח</label>
                <textarea className="ds-textarea mt-1.5" rows={2} required value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            ) : null}
            <div>
              <label className="ds-label">הערות</label>
              <textarea className="ds-textarea mt-1.5" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div>
              <label className="ds-label">קופון</label>
              <input className="ds-input mt-1.5" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="אופציונלי" />
            </div>
            {pointsBalance !== null && pointsBalance > 0 ? (
              <div>
                <label className="ds-label">מימוש נקודות (יתרה: {pointsBalance})</label>
                <input type="number" min={0} max={pointsBalance} className="ds-input mt-1.5" value={redeemPoints} onChange={(e) => setRedeemPoints(Number(e.target.value))} />
              </div>
            ) : null}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("details")} className="hagor-btn-outline flex-1">
                חזרה
              </button>
              <button type="button" onClick={() => setStep("payment")} className="hagor-btn flex-1">
                המשך לתשלום
              </button>
            </div>
          </div>
        ) : null}

        {step === "payment" ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">תשלום מאובטח בכרטיס אשראי. המלאי יירד רק לאחר אישור התשלום.</p>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("shipping")} className="hagor-btn-outline flex-1">
                חזרה
              </button>
              <button type="button" disabled={loading} onClick={() => void createOrder()} className="hagor-btn flex-1 disabled:opacity-50">
                {loading ? "יוצר הזמנה…" : "מעבר לתשלום באשראי"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
