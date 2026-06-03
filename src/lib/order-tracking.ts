import type { OrderFulfillmentStatus, OrderPaymentStatus, OrderStatus } from "@prisma/client";

export const FULFILLMENT_LABELS_HE: Record<OrderFulfillmentStatus, string> = {
  RECEIVED: "התקבלה",
  PROCESSING: "בהכנה",
  PACKED: "נארזה",
  SHIPPED: "נשלחה",
  COMPLETED: "נמסרה",
};

const PAID_PAYMENT: OrderPaymentStatus[] = ["PAID", "TEST_PAID", "DEMO_PAID"];

export function isOrderPaymentSettled(
  paymentStatus: OrderPaymentStatus,
  status?: OrderStatus,
): boolean {
  if (status === "CANCELLED" || status === "FAILED") return false;
  return PAID_PAYMENT.includes(paymentStatus);
}

/** Customer-facing status label (Hebrew). */
export function getCustomerOrderStatusLabel(order: {
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
}): string {
  if (order.status === "CANCELLED") return "בוטל";
  if (!isOrderPaymentSettled(order.paymentStatus, order.status)) return "ממתין לתשלום";

  switch (order.fulfillmentStatus) {
    case "RECEIVED":
    case "PROCESSING":
      return "בהכנה";
    case "PACKED":
      return "נארז";
    case "SHIPPED":
      return "נשלח";
    case "COMPLETED":
      return "נמסר";
    default:
      return "שולם";
  }
}

export function formatOrderDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export const TIMELINE_STEPS_HE = [
  { key: "paid", label: "שולם" },
  { key: "processing", label: "בהכנה" },
  { key: "packed", label: "נארז" },
  { key: "shipped", label: "נשלח" },
  { key: "delivered", label: "נמסר" },
] as const;

function fulfillmentTimelineIndex(status: OrderFulfillmentStatus): number {
  switch (status) {
    case "RECEIVED":
    case "PROCESSING":
      return 1;
    case "PACKED":
      return 2;
    case "SHIPPED":
      return 3;
    case "COMPLETED":
      return 4;
    default:
      return 0;
  }
}

export function orderTimelineMeta(order: {
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
}): {
  cancelled: boolean;
  awaitingPayment: boolean;
  activeStep: number;
  steps: { key: string; label: string; done: boolean; current: boolean }[];
} {
  const cancelled = order.status === "CANCELLED";
  const paid = isOrderPaymentSettled(order.paymentStatus, order.status);
  const awaitingPayment = !cancelled && !paid;

  if (cancelled || awaitingPayment) {
    return {
      cancelled,
      awaitingPayment,
      activeStep: -1,
      steps: TIMELINE_STEPS_HE.map((s) => ({
        key: s.key,
        label: s.label,
        done: false,
        current: false,
      })),
    };
  }

  const activeStep = Math.max(0, fulfillmentTimelineIndex(order.fulfillmentStatus));
  const steps = TIMELINE_STEPS_HE.map((s, i) => ({
    key: s.key,
    label: s.label,
    done: i < activeStep,
    current: i === activeStep,
  }));

  return { cancelled, awaitingPayment, activeStep, steps };
}

/** Fulfillment statuses that trigger customer status email. */
export const FULFILLMENT_EMAIL_STATUSES: OrderFulfillmentStatus[] = ["PACKED", "SHIPPED", "COMPLETED"];
