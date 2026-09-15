"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart-context";
import { PrivacyPolicyLink } from "@/components/storefront/privacy-policy-link";
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
  name_ar?: string;
  name_en?: string;
  price: unknown;
  type: string;
};

const STEPS = ["cart", "details", "shipping", "payment"] as const;
type Step = (typeof STEPS)[number];
type CouponStatus = "none" | "not_found" | "inactive" | "expired" | "usage_limit" | "min_order" | "applied";
type QuoteResponse = {
  subtotal: number;
  deliveryPrice: number;
  deliveryName: string;
  total: number;
  currency: string;
  pointsDiscount: number;
  pointsUsed: number;
  pointsBalance: number;
  coupon: {
    requestedCode: string | null;
    appliedCode: string | null;
    status: CouponStatus;
    type: "PERCENT" | "FIXED" | null;
    typeLabel: string | null;
    value: number | null;
    minOrderAmount: number | null;
    discountAmount: number;
    subtotalAfterDiscount: number;
  };
};
type CouponNoticeState =
  | { tone: "success"; title: string; body?: string | null }
  | { tone: "error"; title: string; body?: string | null }
  | null;

const CHECKOUT_DRAFT_KEY = `checkout-draft:${process.env.NEXT_PUBLIC_STORE_ID ?? "store"}`;
const COPY = {
  he: {
    continueShopping: "המשך קנייה",
    cartItems: "פריטים בעגלה",
    back: "חזרה",
    continueDetails: "המשך לפרטים",
    continueShipping: "המשך למשלוח",
    continuePayment: "המשך לתשלום",
    secureCardNote: "תשלום מאובטח בכרטיס אשראי. המלאי יירד רק לאחר אישור התשלום.",
    shippingMethod: "אופן משלוח",
    notes: "הערות",
    coupon: "קופון",
    couponPlaceholder: "הזינו קוד קופון",
    applyCoupon: "הפעל קופון",
    removeCoupon: "הסר",
    couponEmpty: "יש להזין קוד קופון לפני ההפעלה.",
    couponAppliedTitle: (code: string) => `הקופון ${code} הופעל בהצלחה`,
    couponAppliedPercent: (value: number) => `קיבלת ${value}% הנחה`,
    couponAppliedFixed: (value: number) => `קיבלת ₪${value.toFixed(2)} הנחה`,
    couponInvalid: "הקופון שהוזן אינו תקין",
    couponExpired: "תוקף הקופון הסתיים",
    couponInactive: "הקופון אינו פעיל כרגע",
    couponUsageLimit: "מכסת השימוש בקופון נוצלה",
    couponMinOrder: (amount: number) => `הקופון תקף להזמנות מעל ₪${amount.toFixed(2)}`,
    couponRemoved: "הקופון הוסר והמחיר חזר לחישוב הרגיל.",
    couponDropped: "הקופון הוסר כי העגלה כבר לא עומדת בתנאים שלו.",
    orderSummary: "סיכום הזמנה",
    couponSummary: "קופון",
    beforeDiscount: "סכום לפני הנחה",
    afterDiscount: "סכום לאחר הנחה",
    subtotal: "סכום ביניים",
    products: "מוצרים",
    shipping: "משלוח",
    freeShipping: "חינם",
    total: "סה\"כ לתשלום",
    points: "נקודות",
    activeCoupon: "קופון פעיל",
    validationError: "לא ניתן היה לחשב את הקופון כרגע.",
  },
  ar: {
    continueShopping: "متابعة التسوق",
    cartItems: "منتجات في السلة",
    back: "رجوع",
    continueDetails: "المتابعة للتفاصيل",
    continueShipping: "المتابعة للشحن",
    continuePayment: "المتابعة للدفع",
    secureCardNote: "دفع آمن ببطاقة ائتمان. سيتم خصم المخزون فقط بعد تأكيد الدفع.",
    shippingMethod: "طريقة الشحن",
    notes: "ملاحظات",
    coupon: "قسيمة",
    couponPlaceholder: "أدخل رمز القسيمة",
    applyCoupon: "تفعيل القسيمة",
    removeCoupon: "إزالة",
    couponEmpty: "يرجى إدخال رمز القسيمة أولاً.",
    couponAppliedTitle: (code: string) => `تم تفعيل القسيمة ${code} بنجاح`,
    couponAppliedPercent: (value: number) => `حصلت على خصم ${value}%`,
    couponAppliedFixed: (value: number) => `حصلت على خصم ₪${value.toFixed(2)}`,
    couponInvalid: "رمز القسيمة غير صالح",
    couponExpired: "انتهت صلاحية القسيمة",
    couponInactive: "القسيمة غير مفعّلة حالياً",
    couponUsageLimit: "تم الوصول إلى حد استخدام القسيمة",
    couponMinOrder: (amount: number) => `القسيمة صالحة للطلبات فوق ₪${amount.toFixed(2)}`,
    couponRemoved: "تمت إزالة القسيمة وعاد السعر إلى الحساب العادي.",
    couponDropped: "تمت إزالة القسيمة لأن السلة لم تعد تستوفي الشروط.",
    orderSummary: "ملخص الطلب",
    couponSummary: "القسيمة",
    beforeDiscount: "المبلغ قبل الخصم",
    afterDiscount: "المبلغ بعد الخصم",
    subtotal: "المجموع الفرعي",
    products: "المنتجات",
    shipping: "الشحن",
    freeShipping: "مجاني",
    total: "الإجمالي للدفع",
    points: "النقاط",
    activeCoupon: "القسيمة المفعّلة",
    validationError: "تعذر حساب القسيمة حالياً.",
  },
  en: {
    continueShopping: "Continue shopping",
    cartItems: "items in cart",
    back: "Back",
    continueDetails: "Continue to details",
    continueShipping: "Continue to shipping",
    continuePayment: "Continue to payment",
    secureCardNote: "Secure card payment. Inventory is reduced only after payment approval.",
    shippingMethod: "Shipping method",
    notes: "Notes",
    coupon: "Coupon",
    couponPlaceholder: "Enter coupon code",
    applyCoupon: "Apply coupon",
    removeCoupon: "Remove",
    couponEmpty: "Enter a coupon code first.",
    couponAppliedTitle: (code: string) => `Coupon ${code} applied successfully`,
    couponAppliedPercent: (value: number) => `You received ${value}% off`,
    couponAppliedFixed: (value: number) => `You received ₪${value.toFixed(2)} off`,
    couponInvalid: "The coupon code is invalid",
    couponExpired: "Coupon has expired",
    couponInactive: "Coupon is not active yet",
    couponUsageLimit: "Coupon usage limit has been reached",
    couponMinOrder: (amount: number) => `Coupon is valid for orders above ₪${amount.toFixed(2)}`,
    couponRemoved: "Coupon removed and totals returned to the original price.",
    couponDropped: "Coupon was removed because the cart no longer matches its rules.",
    orderSummary: "Order summary",
    couponSummary: "Coupon",
    beforeDiscount: "Amount before discount",
    afterDiscount: "Amount after discount",
    subtotal: "Subtotal",
    products: "Products",
    shipping: "Shipping",
    freeShipping: "Free",
    total: "Total to pay",
    points: "Points",
    activeCoupon: "Active coupon",
    validationError: "Could not validate the coupon right now.",
  },
} as const;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

function money(amount: number, currency: string) {
  if (currency === "ILS") return `₪${amount.toFixed(2)}`;
  return `${amount.toFixed(2)} ${currency}`;
}

export function CheckoutWizard() {
  const router = useRouter();
  const { items } = useCart();
  const { t, dir, lang } = useStoreI18n();
  const copy = COPY[lang];
  const [step, setStep] = useState<Step>("cart");
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [deliveryId, setDeliveryId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [couponNotice, setCouponNotice] = useState<CouponNoticeState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyHint, setVerifyHint] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [customerErrors, setCustomerErrors] = useState<CustomerFieldErrors>({});
  const [cityError, setCityError] = useState<string | undefined>();
  const [addressError, setAddressError] = useState<string | undefined>();
  const quoteSeq = useRef(0);

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

  const busy = loading || quoteLoading;
  const canPay = detailsValid && shippingValid && termsAccepted && !busy;
  const activeCouponCode = quote?.coupon.appliedCode ?? appliedCouponCode;
  const currentCurrency = quote?.currency ?? "ILS";

  function checkoutBody() {
    return {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      deliveryOptionId: deliveryId,
      city: needsAddress ? city.trim() : undefined,
      address: needsAddress ? address.trim() : undefined,
      notes: notes.trim() || undefined,
      couponCode: appliedCouponCode ?? undefined,
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<{
          step: Step;
          deliveryId: string;
          customerName: string;
          customerEmail: string;
          customerPhone: string;
          city: string;
          address: string;
          notes: string;
          couponInput: string;
          appliedCouponCode: string | null;
          redeemPoints: number;
          termsAccepted: boolean;
        }>;
        if (draft.step && STEPS.includes(draft.step)) setStep(draft.step);
        if (draft.deliveryId) setDeliveryId(draft.deliveryId);
        if (typeof draft.customerName === "string") setCustomerName(draft.customerName);
        if (typeof draft.customerEmail === "string") setCustomerEmail(draft.customerEmail);
        if (typeof draft.customerPhone === "string") setCustomerPhone(draft.customerPhone);
        if (typeof draft.city === "string") setCity(draft.city);
        if (typeof draft.address === "string") setAddress(draft.address);
        if (typeof draft.notes === "string") setNotes(draft.notes);
        if (typeof draft.couponInput === "string") setCouponInput(draft.couponInput);
        if (typeof draft.appliedCouponCode === "string" || draft.appliedCouponCode === null) {
          setAppliedCouponCode(draft.appliedCouponCode ?? null);
        }
        if (typeof draft.redeemPoints === "number") setRedeemPoints(draft.redeemPoints);
        if (typeof draft.termsAccepted === "boolean") setTermsAccepted(draft.termsAccepted);
      }
    } catch {
      // ignore corrupt checkout draft
    }

    fetch("/api/delivery-options")
      .then((r) => r.json())
      .then((d: { options: DeliveryOption[] }) => {
        setDeliveryOptions(d.options);
        setDeliveryId((current) => current || d.options[0]?.id || "");
      });
    Promise.all([fetch("/api/auth/me").then((r) => r.json()), fetch("/api/store/public").then((r) => r.json())]).then(
      ([me, pub]: [
        { user: { name?: string; email?: string; pointsBalance?: number | null; emailVerified?: boolean } | null },
        { requireEmailVerificationForCheckout?: boolean },
      ]) => {
        if (me.user) {
          setCustomerName((current) => current || me.user?.name || "");
          setCustomerEmail((current) => current || me.user?.email || "");
          setPointsBalance(me.user.pointsBalance ?? null);
          const needVerify = pub.requireEmailVerificationForCheckout !== false;
          if (needVerify && me.user.emailVerified === false) {
            setVerifyHint("יש לאמת את כתובת האימייל לפני השלמת הזמנה.");
          }
        }
      },
    );
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        CHECKOUT_DRAFT_KEY,
        JSON.stringify({
          step,
          deliveryId,
          customerName,
          customerEmail,
          customerPhone,
          city,
          address,
          notes,
          couponInput,
          appliedCouponCode,
          redeemPoints,
          termsAccepted,
        }),
      );
    } catch {
      // ignore storage write failures
    }
  }, [
    step,
    deliveryId,
    customerName,
    customerEmail,
    customerPhone,
    city,
    address,
    notes,
    couponInput,
    appliedCouponCode,
    redeemPoints,
    termsAccepted,
  ]);

  function couponNoticeFromQuote(nextQuote: QuoteResponse, fromAutoRecalc = false): CouponNoticeState {
    const coupon = nextQuote.coupon;
    if (coupon.status === "applied" && coupon.appliedCode) {
      return {
        tone: "success",
        title: copy.couponAppliedTitle(coupon.appliedCode),
        body:
          coupon.type === "PERCENT"
            ? copy.couponAppliedPercent(Number(coupon.value ?? 0))
            : copy.couponAppliedFixed(Number(coupon.value ?? 0)),
      };
    }
    if (coupon.status === "min_order") {
      return {
        tone: "error",
        title: fromAutoRecalc ? copy.couponDropped : copy.couponMinOrder(Number(coupon.minOrderAmount ?? 0)),
        body: fromAutoRecalc ? copy.couponMinOrder(Number(coupon.minOrderAmount ?? 0)) : null,
      };
    }
    if (coupon.status === "expired") return { tone: "error", title: copy.couponExpired };
    if (coupon.status === "inactive") return { tone: "error", title: copy.couponInactive };
    if (coupon.status === "usage_limit") return { tone: "error", title: copy.couponUsageLimit };
    if (coupon.status === "not_found") return { tone: "error", title: copy.couponInvalid };
    return null;
  }

  async function fetchQuote(nextAppliedCouponCode = appliedCouponCode) {
    if (!deliveryId || items.length === 0) {
      setQuote(null);
      return;
    }

    const seq = ++quoteSeq.current;
    setQuoteLoading(true);
    try {
      const res = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-locale": lang,
        },
        body: JSON.stringify({
          deliveryOptionId: deliveryId,
          couponCode: nextAppliedCouponCode ?? undefined,
          redeemPoints: redeemPoints || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            optionIds: i.optionIds,
            selectedOptions: i.selectedOptions ?? null,
          })),
        }),
      });
      const data = (await res.json()) as QuoteResponse | { error?: string };
      if (quoteSeq.current !== seq) return;
      if (!res.ok) {
        setQuote(null);
        if (nextAppliedCouponCode) {
          const err = data as { error?: string };
          setAppliedCouponCode(null);
          setCouponNotice({
            tone: "error",
            title: typeof err.error === "string" ? err.error : copy.validationError,
          });
        }
        return;
      }
      const nextQuote = data as QuoteResponse;
      setQuote(nextQuote);
      setPointsBalance(nextQuote.pointsBalance);
      if (nextAppliedCouponCode) {
        if (nextQuote.coupon.status === "applied") {
          setAppliedCouponCode(nextQuote.coupon.appliedCode);
          setCouponNotice(couponNoticeFromQuote(nextQuote));
        } else {
          setAppliedCouponCode(null);
          setCouponNotice(couponNoticeFromQuote(nextQuote, true));
        }
      }
    } catch {
      if (quoteSeq.current !== seq) return;
      setQuote(null);
      if (nextAppliedCouponCode) {
        setAppliedCouponCode(null);
        setCouponNotice({ tone: "error", title: copy.validationError });
      }
    } finally {
      if (quoteSeq.current === seq) setQuoteLoading(false);
    }
  }

  useEffect(() => {
    void fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, deliveryId, redeemPoints, appliedCouponCode, lang]);

  async function applyCoupon() {
    const nextCode = couponInput.trim();
    if (!nextCode) {
      setCouponNotice({ tone: "error", title: copy.couponEmpty });
      return;
    }
    setError(null);
    setAppliedCouponCode(nextCode);
    await fetchQuote(nextCode);
  }

  function removeCoupon() {
    setAppliedCouponCode(null);
    setCouponInput("");
    setCouponNotice({ tone: "success", title: copy.couponRemoved });
  }

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
        setError(typeof payData.error === "string" ? payData.error : t("checkoutPaymentError"));
        return;
      }
      if (payData.redirectUrl) {
        window.location.href = payData.redirectUrl as string;
        return;
      }
      router.push(`/checkout/payment/${orderId}`);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0 && step === "cart") {
    return (
      <div dir={dir} className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-zinc-500">{t("emptyCart")}</p>
        <Link href="/products" className="mt-4 inline-block text-hagor-gold hover:underline">
          {copy.continueShopping}
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
            <p className="text-sm text-zinc-400">
              {items.length} {copy.cartItems}
            </p>
            <button type="button" onClick={() => setStep("details")} className="hagor-btn w-full">
              {copy.continueDetails}
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
                placeholder="054-779-3580"
                className="ds-input mt-1.5"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  setCustomerErrors((prev) => ({ ...prev, customerPhone: undefined }));
                }}
              />
              <FieldError message={customerErrors.customerPhone} />
            </div>
            <PrivacyPolicyLink />
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("cart")} className="hagor-btn-outline flex-1">
                {copy.back}
              </button>
              <button
                type="button"
                disabled={!detailsValid}
                onClick={goToShipping}
                className="hagor-btn flex-1 disabled:opacity-50"
              >
                {copy.continueShipping}
              </button>
            </div>
          </div>
        ) : null}

        {step === "shipping" ? (
          <div className="space-y-4">
            <div>
              <label className="ds-label">{copy.shippingMethod}</label>
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
                <PrivacyPolicyLink />
              </>
            ) : null}
            <div>
              <label className="ds-label">{copy.notes}</label>
              <textarea className="ds-textarea mt-1.5" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <label className="ds-label mb-0">{copy.coupon}</label>
                {activeCouponCode ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-mono text-emerald-300">
                      {activeCouponCode} ✓
                    </span>
                    <button type="button" onClick={removeCoupon} className="text-zinc-300 underline hover:text-white">
                      {copy.removeCoupon}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="ds-input flex-1"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder={copy.couponPlaceholder}
                />
                <button type="button" onClick={() => void applyCoupon()} className="hagor-btn whitespace-nowrap sm:w-auto">
                  {copy.applyCoupon}
                </button>
              </div>
              {couponNotice ? (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    couponNotice.tone === "success"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                      : "border-red-500/40 bg-red-500/10 text-red-100"
                  }`}
                >
                  <p className="font-semibold">{couponNotice.title}</p>
                  {couponNotice.body ? <p className="mt-1 text-xs opacity-90">{couponNotice.body}</p> : null}
                  {quote?.coupon.status === "applied" ? (
                    <dl className="mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between gap-3">
                        <dt>{copy.beforeDiscount}</dt>
                        <dd>{money(quote.subtotal, currentCurrency)}</dd>
                      </div>
                      <div className="flex justify-between gap-3 text-emerald-200">
                        <dt>{copy.couponSummary}</dt>
                        <dd>−{money(quote.coupon.discountAmount, currentCurrency)}</dd>
                      </div>
                      <div className="flex justify-between gap-3 border-t border-white/10 pt-2 font-semibold text-white">
                        <dt>{copy.afterDiscount}</dt>
                        <dd>{money(quote.coupon.subtotalAfterDiscount, currentCurrency)}</dd>
                      </div>
                    </dl>
                  ) : null}
                </div>
              ) : null}
            </div>
            {pointsBalance !== null && pointsBalance > 0 ? (
              <div>
                <label className="ds-label">מימוש נקודות (יתרה: {pointsBalance})</label>
                <input type="number" min={0} max={pointsBalance} className="ds-input mt-1.5" value={redeemPoints} onChange={(e) => setRedeemPoints(Number(e.target.value))} />
              </div>
            ) : null}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("details")} className="hagor-btn-outline flex-1">
                {copy.back}
              </button>
              <button
                type="button"
                disabled={!shippingValid}
                onClick={goToPayment}
                className="hagor-btn flex-1 disabled:opacity-50"
              >
                {copy.continuePayment}
              </button>
            </div>
          </div>
        ) : null}

        {step === "payment" ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">{copy.secureCardNote}</p>
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
              {copy.back}
            </button>
            <button
              type="button"
              disabled={!canPay}
              onClick={() => void payWithCard()}
              className="hagor-btn w-full disabled:opacity-50"
            >
              {loading ? t("checkoutPayLoading") : t("checkoutPayButton")}
            </button>
            <p className="text-center text-xs text-zinc-500">{t("checkoutPaySecureHint")}</p>
          </div>
        ) : null}
      </div>

      {quote || quoteLoading ? (
        <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold tracking-wide text-hagor-gold">{copy.orderSummary}</h2>
            {quoteLoading ? <span className="text-xs text-zinc-500">מחשב...</span> : null}
          </div>

          {quote ? (
            <div className="mt-4 space-y-3">
              {quote.coupon.appliedCode ? (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-100">
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      {copy.activeCoupon}: <span className="font-mono">{quote.coupon.appliedCode}</span> ✓
                    </span>
                    <span>−{money(quote.coupon.discountAmount, quote.currency)}</span>
                  </div>
                </div>
              ) : null}

              {step === "details" && quote.coupon.appliedCode ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-3 text-sm text-zinc-200">
                  <div className="flex justify-between gap-3">
                    <span>{copy.couponSummary}</span>
                    <span className="font-mono">{quote.coupon.appliedCode} ✓</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-3">
                    <span>{copy.coupon}</span>
                    <span>−{money(quote.coupon.discountAmount, quote.currency)}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-3 font-semibold text-white">
                    <span>{copy.afterDiscount}</span>
                    <span>{money(quote.total, quote.currency)}</span>
                  </div>
                </div>
              ) : null}

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3 text-zinc-300">
                  <dt>{step === "shipping" || step === "payment" ? copy.products : copy.subtotal}</dt>
                  <dd>{money(quote.subtotal, quote.currency)}</dd>
                </div>
                {quote.coupon.discountAmount > 0 ? (
                  <div className="flex justify-between gap-3 text-emerald-300">
                    <dt>{quote.coupon.appliedCode ? `${copy.couponSummary} ${quote.coupon.appliedCode}` : copy.couponSummary}</dt>
                    <dd>−{money(quote.coupon.discountAmount, quote.currency)}</dd>
                  </div>
                ) : null}
                {quote.pointsDiscount > 0 ? (
                  <div className="flex justify-between gap-3 text-sky-300">
                    <dt>{copy.points}</dt>
                    <dd>−{money(quote.pointsDiscount, quote.currency)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3 text-zinc-300">
                  <dt>{copy.shipping}</dt>
                  <dd>{quote.deliveryPrice === 0 ? copy.freeShipping : money(quote.deliveryPrice, quote.currency)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-zinc-800 pt-3 text-base font-bold text-white">
                  <dt>{copy.total}</dt>
                  <dd className="text-hagor-gold">{money(quote.total, quote.currency)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
