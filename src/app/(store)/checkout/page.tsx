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

  useEffect(() => {
    fetch("/api/delivery-options")
      .then((r) => r.json())
      .then((d: { options: DeliveryOption[] }) => {
        setDeliveryOptions(d.options);
        if (d.options[0]) setDeliveryId(d.options[0].id);
      });
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user: { name?: string; email?: string; pointsBalance?: number | null } | null }) => {
        if (d.user) {
          setCustomerName(d.user.name ?? "");
          setCustomerEmail(d.user.email ?? "");
          setPointsBalance(d.user.pointsBalance ?? null);
        }
      });
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
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה");
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
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div>
          <label className="block text-sm font-medium text-zinc-200">שם מלא</label>
          <input
            required
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-200">אימייל</label>
          <input
            required
            type="email"
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-200">טלפון</label>
          <input
            required
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-200">אופן משלוח</label>
          <select
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
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
          <label className="block text-sm font-medium text-zinc-200">כתובת (למשלוח)</label>
          <textarea
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-200">הערות</label>
          <textarea
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-200">קופון</label>
          <input
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="אופציונלי"
          />
        </div>
        {pointsBalance !== null && pointsBalance > 0 && (
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              מימוש נקודות (יתרה: {pointsBalance})
            </label>
            <input
              type="number"
              min={0}
              max={pointsBalance}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={redeemPoints}
              onChange={(e) => setRedeemPoints(Number(e.target.value))}
            />
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-3 font-medium text-white disabled:bg-zinc-700"
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
