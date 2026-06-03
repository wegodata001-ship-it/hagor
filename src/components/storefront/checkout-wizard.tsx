"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart-context";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import {
  INVALID_CUSTOMER_DETAILS,
  isCustomerDetailsValid,
  isValidEmail,
  isValidIsraeliPhone,
  validateCustomerFields,
  type CustomerFieldErrors,
} from "@/lib/checkout/customer-validation";
import type { Locale } from "@/lib/localized";

type DeliveryOption = {
  id: string;
  name_he: string;
  price: unknown;
  type: string;
};

const STEPS = ["cart", "details", "shipping", "payment"] as const;
type Step = (typeof STEPS)[number];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

export function CheckoutWizard() {
  const router = useRouter();
  const { items, clear } = useCart();
  const { t, dir, lang } = useStoreI18n();
  const [step, setStep] = useState<Step>("cart");
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [deliveryId, setDeliveryId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyHint, setVerifyHint] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [customerErrors, setCustomerErrors] = useState<CustomerFieldErrors>({});
  const [cityError, setCityError] = useState<string | undefined>();
  const [addressError, setAddressError] = useState<string | undefined>();

  const stepIndex = STEPS.indexOf(step);
  const locale = lang as Locale;

  const detailsValid = useMemo(
    () =>
      isCustomerDetailsValid({
        customerName,
        customerEmail,
        customerPhone,
      }),
    [customerName, customerEmail, customerPhone],
  );

  const selectedDelivery = useMemo(
    () => deliveryOptions.find((o) => o.id === deliveryId),
    [deliveryOptions, deliveryId],
  );
  const needsAddress = selectedDelivery?.type === "SHIPPING";

  const shippingValid = useMemo(() => {
    if (!needsAddress) return true;
    return Boolean(city.trim() && address.trim());
  }, [needsAddress, city, address]);

  const busy = loading || demoLoading;
  const canPay = detailsValid && shippingValid && termsAccepted && !busy;
  const [demoCheckoutEnabled, setDemoCheckoutEnabled] = useState(
    () => process.env.NEXT_PUBLIC_ALLOW_DEMO_PAYMENT === "true",
  );

  useEffect(() => {
    fetch("/api/delivery-options")
      .then((r) => r.json())
      .then((d: { options: DeliveryOption[] }) => {
        setDeliveryOptions(d.options);
        if (d.options[0]) setDeliveryId(d.options[0].id);
      });
    Promise.all([fetch("/api/auth/me").then((r) => r.json()), fetch("/api/store/public").then((r) => r.json())]).then(
      ([me, pub]: [
        { user: { name?: string; email?: string; pointsBalance?: number | null; emailVerified?: boolean } | null },
        { requireEmailVerificationForCheckout?: boolean; allowDemoPayment?: boolean },
      ]) => {
        if (pub.allowDemoPayment === true) {
          setDemoCheckoutEnabled(true);
        }
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

  function runDetailsValidation(): boolean {
    const { valid, errors } = validateCustomerFields(
      { customerName, customerEmail, customerPhone },
      locale,
    );
    setCustomerErrors(errors);
    return valid;
  }

  function runShippingValidation(): boolean {
    if (!needsAddress) {
      setCityError(undefined);
      setAddressError(undefined);
      return true;
    }
    let ok = true;
    if (!city.trim()) {
      setCityError(t("checkoutCityRequired"));
      ok = false;
    } else {
      setCityError(undefined);
    }
    if (!address.trim()) {
      setAddressError(t("checkoutAddressRequired"));
      ok = false;
    } else {
      setAddressError(undefined);
    }
    return ok;
  }

  function goToShipping() {
    if (!runDetailsValidation()) return;
    setStep("shipping");
  }

  function goToPayment() {
    if (!runDetailsValidation()) {
      setStep("details");
      return;
    }
    if (!runShippingValidation()) return;
    setStep("payment");
  }

  function validateBeforeCheckout(): boolean {
    setError(null);
    if (!termsAccepted) {
      setError(t("checkoutTermsRequired"));
      return false;
    }
    if (!runDetailsValidation()) {
      setStep("details");
      return false;
    }
    if (!runShippingValidation()) {
      setStep("shipping");
      return false;
    }
    if (!isValidEmail(customerEmail) || !isValidIsraeliPhone(customerPhone)) {
      setStep("details");
      return false;
    }
    return true;
  }

  function checkoutBody() {
    return {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      deliveryOptionId: deliveryId,
      city: needsAddress ? city.trim() : undefined,
      address: needsAddress ? address.trim() : undefined,
      notes: notes.trim() || undefined,
      couponCode: couponCode.trim() || undefined,
      redeemPoints: redeemPoints || undefined,
      acceptedTerms: true as const,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        optionIds: i.optionIds,
        selectedOptions: i.selectedOptions ?? null,
      })),
    };
  }

  async function createOrderId(): Promise<string | null> {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-locale": lang,
      },
      body: JSON.stringify(checkoutBody()),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.error === INVALID_CUSTOMER_DETAILS && data.fieldErrors) {
        setCustomerErrors(data.fieldErrors as CustomerFieldErrors);
        setStep("details");
        return null;
      }
      setError(typeof data.error === "string" ? data.error : t("checkoutGenericError"));
      return null;
    }
    return typeof data.orderId === "string" ? data.orderId : null;
  }

  async function payWithCard() {
    if (busy) return;
    if (!validateBeforeCheckout()) return;

    setLoading(true);
    try {
      const orderId = await createOrderId();
      if (!orderId) return;

      const payRes = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) {
        if (demoCheckoutEnabled) {
          setError(null);
          router.push(`/checkout/payment/${orderId}`);
          return;
        }
        setError(typeof payData.error === "string" ? payData.error : t("checkoutPaymentError"));
        return;
      }
      if (payData.redirectUrl) {
        clear();
        window.location.href = payData.redirectUrl as string;
        return;
      }
      clear();
      router.push(`/checkout/payment/${orderId}`);
    } finally {
      setLoading(false);
    }
  }

  async function payWithDemo() {
    if (busy) return;
    if (!demoCheckoutEnabled) {
      setError("תשלום דמו אינו פעיל במערכת.");
      return;
    }
    if (!validateBeforeCheckout()) return;

    setDemoLoading(true);
    try {
      const orderId = await createOrderId();
      if (!orderId) return;

      const demoRes = await fetch("/api/payments/demo-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const demoData = await demoRes.json();
      if (!demoRes.ok) {
        setError(typeof demoData.error === "string" ? demoData.error : t("checkoutGenericError"));
        return;
      }
      clear();
      router.push(`/payment/success?orderId=${encodeURIComponent(orderId)}`);
    } finally {
      setDemoLoading(false);
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
              <input
                required
                className="ds-input mt-1.5"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setCustomerErrors((prev) => ({ ...prev, customerName: undefined }));
                }}
              />
              <FieldError message={customerErrors.customerName} />
            </div>
            <div>
              <label className="ds-label">{t("checkoutEmail")}</label>
              <input
                required
                type="email"
                autoComplete="email"
                className="ds-input mt-1.5"
                value={customerEmail}
                onChange={(e) => {
                  setCustomerEmail(e.target.value);
                  setCustomerErrors((prev) => ({ ...prev, customerEmail: undefined }));
                }}
              />
              <FieldError message={customerErrors.customerEmail} />
            </div>
            <div>
              <label className="ds-label">טלפון</label>
              <input
                required
                type="tel"
                autoComplete="tel"
                placeholder="054-000-0000"
                className="ds-input mt-1.5"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  setCustomerErrors((prev) => ({ ...prev, customerPhone: undefined }));
                }}
              />
              <FieldError message={customerErrors.customerPhone} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("cart")} className="hagor-btn-outline flex-1">
                חזרה
              </button>
              <button
                type="button"
                disabled={!detailsValid}
                onClick={goToShipping}
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
              <>
                <div>
                  <label className="ds-label">{t("checkoutCity")}</label>
                  <input
                    required
                    className="ds-input mt-1.5"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setCityError(undefined);
                    }}
                  />
                  <FieldError message={cityError} />
                </div>
                <div>
                  <label className="ds-label">{t("checkoutAddress")}</label>
                  <textarea
                    className="ds-textarea mt-1.5"
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setAddressError(undefined);
                    }}
                  />
                  <FieldError message={addressError} />
                </div>
              </>
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
              <button
                type="button"
                disabled={!shippingValid}
                onClick={goToPayment}
                className="hagor-btn flex-1 disabled:opacity-50"
              >
                המשך לתשלום
              </button>
            </div>
          </div>
        ) : null}

        {step === "payment" ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">תשלום מאובטח בכרטיס אשראי. המלאי יירד רק לאחר אישור התשלום.</p>
            {demoCheckoutEnabled ? (
              <p className="text-xs text-amber-200/90">{t("demoPaymentHint")}</p>
            ) : null}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-700/80 bg-zinc-950/50 px-3 py-3 text-sm text-zinc-200">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-hagor-gold"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span>
                {t("checkoutTermsAccept")}{" "}
                <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-hagor-gold underline hover:text-amber-300">
                  {t("siteTerms")}
                </Link>
              </span>
            </label>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button type="button" onClick={() => setStep("shipping")} className="hagor-btn-outline w-full">
              חזרה
            </button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={!canPay}
                onClick={() => void payWithCard()}
                className="hagor-btn flex-1 disabled:opacity-50"
              >
                {loading ? t("checkoutPayLoading") : t("checkoutPayButton")}
              </button>
              {demoCheckoutEnabled ? (
                <button
                  type="button"
                  disabled={!canPay}
                  onClick={() => void payWithDemo()}
                  className="hagor-btn-demo flex-1 disabled:opacity-50"
                >
                  <span aria-hidden>✓</span>
                  {demoLoading ? t("demoPaymentLoading") : t("demoPaymentButton")}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
