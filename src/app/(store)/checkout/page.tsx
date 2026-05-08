"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-context";
import { useStoreI18n } from "@/components/storefront/store-i18n";

type DeliveryOption = {
  id: string;
  name_he: string;
  price: unknown;
  type: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear } = useCart();
  const { t, dir } = useStoreI18n();
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

  useEffect(() => {
    fetch("/api/delivery-options")
      .then((r) => r.json())
      .then((d: { options: DeliveryOption[] }) => {
        setDeliveryOptions(d.options);
        if (d.options[0]) setDeliveryId(d.options[0].id);
      });
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/store/public").then((r) => r.json()),
    ]).then(
      ([
        me,
        pub,
      ]: [
        { user: { name?: string; email?: string; pointsBalance?: number | null; emailVerified?: boolean } | null },
        { requireEmailVerificationForCheckout?: boolean },
      ]) => {
        if (me.user) {
          setCustomerName(me.user.name ?? "");
          setCustomerEmail(me.user.email ?? "");
          setPointsBalance(me.user.pointsBalance ?? null);
          const needVerify = pub.requireEmailVerificationForCheckout !== false;
          if (needVerify && me.user.emailVerified === false) {
            setVerifyHint("יש לאמת את כתובת האימייל לפני השלמת הזמנה. בדקו את תיבת הדואר או התחברו מחדש לאחר לחיצה על קישור האימות.");
          }
        }
      },
    );
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
          address,
          notes,
          couponCode: couponCode || undefined,
          redeemPoints: redeemPoints || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            optionIds: i.optionIds,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const raw = typeof data.error === "string" ? data.error : "";
        if (res.status === 403 && raw.includes("אימייל")) {
          setError("נדרש אימות אימייל לפני ביצוע הזמנה. בדקו את המייל לאחר ההרשמה.");
        } else {
          setError(raw || "לא ניתן להשלים את הפעולה. בדקו את הפרטים ונסו שוב.");
        }
        return;
      }
      clear();
      router.push(`/checkout/payment/${data.orderId}`);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div dir={dir} className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-zinc-500">{t("emptyCart")}</p>
        <Link href="/products" className="mt-4 inline-block text-orange-400 hover:underline">
          המשך קנייה
        </Link>
      </div>
    );
  }

  return (
    <div dir={dir} className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-black text-white">תשלום</h1>
      {verifyHint && (
        <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {verifyHint}
        </div>
      )}
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl backdrop-blur-sm">
        <div>
          <label className="ds-label">שם מלא</label>
          <input
            required
            className="ds-input mt-1.5"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
        <div>
          <label className="ds-label">אימייל</label>
          <input
            required
            type="email"
            className="ds-input mt-1.5"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="ds-label">טלפון</label>
          <input
            required
            className="ds-input mt-1.5"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="ds-label">אופן משלוח</label>
          <select
            className="ds-select mt-1.5"
            value={deliveryId}
            onChange={(e) => setDeliveryId(e.target.value)}
          >
            {deliveryOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name_he} — ₪{Number(o.price).toFixed(2)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="ds-label">כתובת (למשלוח)</label>
          <textarea
            className="ds-textarea mt-1.5"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="ds-label">הערות</label>
          <textarea
            className="ds-textarea mt-1.5"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div>
          <label className="ds-label">קופון</label>
          <input
            className="ds-input mt-1.5"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="אופציונלי"
          />
        </div>
        {pointsBalance !== null && pointsBalance > 0 && (
          <div>
            <label className="ds-label">
              מימוש נקודות (יתרה: {pointsBalance})
            </label>
            <input
              type="number"
              min={0}
              max={pointsBalance}
              className="ds-input mt-1.5"
              value={redeemPoints}
              onChange={(e) => setRedeemPoints(Number(e.target.value))}
            />
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-3 font-medium text-white shadow-lg shadow-orange-900/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "שולח…" : "צור הזמנה והמשך לתשלום"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-400">
        יש לך חשבון?{" "}
        <Link href="/login" className="text-orange-400 hover:underline">
          התחבר
        </Link>{" "}
        למימוש נקודות.
      </p>
    </div>
  );
}
