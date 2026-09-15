import type { OrderFulfillmentStatus, OrderPaymentStatus, OrderStatus } from "@prisma/client";

export type DeliveryMode = "PICKUP" | "SHIPPING" | string;

const PAID_PAYMENT: OrderPaymentStatus[] = ["PAID", "TEST_PAID", "DEMO_PAID"];

export function isOrderPaymentSettled(
  paymentStatus: OrderPaymentStatus,
  status?: OrderStatus,
): boolean {
  if (status === "CANCELLED" || status === "FAILED") return false;
  return PAID_PAYMENT.includes(paymentStatus);
}

export function formatOrderDate(date: Date | string, locale = "he-IL"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export type TimelineLang = "he" | "ar" | "en";

const SHIPPING_STEPS: Record<TimelineLang, { key: string; label: string }[]> = {
  he: [
    { key: "received", label: "הזמנה התקבלה" },
    { key: "paid", label: "התשלום התקבל" },
    { key: "processing", label: "בטיפול" },
    { key: "ready", label: "מוכנה למשלוח" },
    { key: "shipped", label: "נשלחה" },
    { key: "delivered", label: "נמסרה" },
  ],
  ar: [
    { key: "received", label: "تم استلام الطلب" },
    { key: "paid", label: "تم استلام الدفع" },
    { key: "processing", label: "قيد المعالجة" },
    { key: "ready", label: "جاهز للشحن" },
    { key: "shipped", label: "تم الشحن" },
    { key: "delivered", label: "تم التسليم" },
  ],
  en: [
    { key: "received", label: "Order received" },
    { key: "paid", label: "Payment received" },
    { key: "processing", label: "Processing" },
    { key: "ready", label: "Ready to ship" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ],
};

const PICKUP_STEPS: Record<TimelineLang, { key: string; label: string }[]> = {
  he: [
    { key: "received", label: "הזמנה התקבלה" },
    { key: "paid", label: "התשלום התקבל" },
    { key: "processing", label: "בטיפול" },
    { key: "ready", label: "מוכנה לאיסוף" },
    { key: "collected", label: "נאספה" },
  ],
  ar: [
    { key: "received", label: "تم استلام الطلب" },
    { key: "paid", label: "تم استلام الدفع" },
    { key: "processing", label: "قيد المعالجة" },
    { key: "ready", label: "جاهز للاستلام" },
    { key: "collected", label: "تم الاستلام" },
  ],
  en: [
    { key: "received", label: "Order received" },
    { key: "paid", label: "Payment received" },
    { key: "processing", label: "Processing" },
    { key: "ready", label: "Ready for pickup" },
    { key: "collected", label: "Picked up" },
  ],
};

/** @deprecated Prefer localized shipping steps via orderTimelineMeta */
export const TIMELINE_STEPS_HE = SHIPPING_STEPS.he;

export const FULFILLMENT_LABELS_HE: Record<OrderFulfillmentStatus, string> = {
  RECEIVED: "הזמנה התקבלה",
  PROCESSING: "בטיפול",
  PACKED: "מוכנה למשלוח",
  SHIPPED: "נשלחה",
  COMPLETED: "נמסרה",
};

function fulfillmentTimelineIndex(
  status: OrderFulfillmentStatus,
  pickup: boolean,
): number {
  if (pickup) {
    switch (status) {
      case "RECEIVED":
        return 1;
      case "PROCESSING":
        return 2;
      case "PACKED":
        return 3;
      case "SHIPPED":
      case "COMPLETED":
        return 4;
      default:
        return 1;
    }
  }
  switch (status) {
    case "RECEIVED":
      return 1;
    case "PROCESSING":
      return 2;
    case "PACKED":
      return 3;
    case "SHIPPED":
      return 4;
    case "COMPLETED":
      return 5;
    default:
      return 1;
  }
}

/** Customer-facing status label. */
export function getCustomerOrderStatusLabel(
  order: {
    status: OrderStatus;
    paymentStatus: OrderPaymentStatus;
    fulfillmentStatus: OrderFulfillmentStatus;
    deliveryOptionType?: DeliveryMode | null;
  },
  lang: TimelineLang = "he",
): string {
  const pickup = order.deliveryOptionType === "PICKUP";
  const labels =
    lang === "en"
      ? {
          cancelled: "Cancelled",
          awaiting: "Awaiting payment",
          paid: "Payment received",
          processing: "Processing",
          ready: pickup ? "Ready for pickup" : "Ready to ship",
          shipped: pickup ? "Picked up" : "Shipped",
          delivered: pickup ? "Picked up" : "Delivered",
          settled: "Paid",
        }
      : lang === "ar"
        ? {
            cancelled: "ملغى",
            awaiting: "بانتظار الدفع",
            paid: "تم استلام الدفع",
            processing: "قيد المعالجة",
            ready: pickup ? "جاهز للاستلام" : "جاهز للشحن",
            shipped: pickup ? "تم الاستلام" : "تم الشحن",
            delivered: pickup ? "تم الاستلام" : "تم التسليم",
            settled: "مدفوع",
          }
        : {
            cancelled: "בוטל",
            awaiting: "ממתין לתשלום",
            paid: "התשלום התקבל",
            processing: "בטיפול",
            ready: pickup ? "מוכנה לאיסוף" : "מוכנה למשלוח",
            shipped: pickup ? "נאספה" : "נשלחה",
            delivered: pickup ? "נאספה" : "נמסרה",
            settled: "שולם",
          };

  if (order.status === "CANCELLED") return labels.cancelled;
  if (!isOrderPaymentSettled(order.paymentStatus, order.status)) return labels.awaiting;

  switch (order.fulfillmentStatus) {
    case "RECEIVED":
      return labels.paid;
    case "PROCESSING":
      return labels.processing;
    case "PACKED":
      return labels.ready;
    case "SHIPPED":
      return labels.shipped;
    case "COMPLETED":
      return labels.delivered;
    default:
      return labels.settled;
  }
}

export function orderTimelineMeta(
  order: {
    status: OrderStatus;
    paymentStatus: OrderPaymentStatus;
    fulfillmentStatus: OrderFulfillmentStatus;
    deliveryOptionType?: DeliveryMode | null;
  },
  lang: TimelineLang = "he",
): {
  cancelled: boolean;
  awaitingPayment: boolean;
  activeStep: number;
  steps: { key: string; label: string; done: boolean; current: boolean }[];
} {
  const pickup = order.deliveryOptionType === "PICKUP";
  const baseSteps = pickup ? PICKUP_STEPS[lang] : SHIPPING_STEPS[lang];
  const cancelled = order.status === "CANCELLED";
  const paid = isOrderPaymentSettled(order.paymentStatus, order.status);
  const awaitingPayment = !cancelled && !paid;

  if (cancelled || awaitingPayment) {
    return {
      cancelled,
      awaitingPayment,
      activeStep: -1,
      steps: baseSteps.map((s) => ({
        key: s.key,
        label: s.label,
        done: false,
        current: false,
      })),
    };
  }

  const activeStep = Math.max(1, fulfillmentTimelineIndex(order.fulfillmentStatus, pickup));
  const steps = baseSteps.map((s, i) => ({
    key: s.key,
    label: s.label,
    done: i < activeStep,
    current: i === activeStep,
  }));

  return { cancelled, awaitingPayment, activeStep, steps };
}

/** Significant fulfillment statuses that trigger customer status email. */
export const FULFILLMENT_EMAIL_STATUSES: OrderFulfillmentStatus[] = ["SHIPPED", "COMPLETED"];
