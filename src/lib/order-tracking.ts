import type { OrderFulfillmentStatus, OrderStatus } from "@prisma/client";

export const FULFILLMENT_LABELS_HE: Record<OrderFulfillmentStatus, string> = {
  RECEIVED: "התקבלה",
  PROCESSING: "בטיפול",
  PACKED: "נארזה",
  SHIPPED: "נשלחה",
  COMPLETED: "הושלמה",
};

const ORDER: OrderFulfillmentStatus[] = [
  "RECEIVED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "COMPLETED",
];

export function fulfillmentIndex(status: OrderFulfillmentStatus): number {
  return ORDER.indexOf(status);
}

export function orderTimelineMeta(order: {
  status: OrderStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
}): {
  cancelled: boolean;
  activeStep: number;
  steps: { key: OrderFulfillmentStatus; label: string; done: boolean; current: boolean }[];
} {
  const cancelled = order.status === "CANCELLED";
  const idx = cancelled ? -1 : fulfillmentIndex(order.fulfillmentStatus);

  const steps = ORDER.map((key, i) => ({
    key,
    label: FULFILLMENT_LABELS_HE[key],
    done: !cancelled && i < idx,
    current: !cancelled && i === idx,
  }));

  return { cancelled, activeStep: idx, steps };
}
