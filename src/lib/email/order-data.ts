import "server-only";

import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

export type OrderEmailLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderEmailPayload = {
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    address: string | null;
    notes: string | null;
    deliveryOptionName: string;
    subtotal: number;
    deliveryPrice: number;
    discountAmount: number;
    pointsDiscountAmount: number;
    total: number;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    trackingNumber: string | null;
    courierName: string | null;
  };
  items: OrderEmailLine[];
  currency: string;
};

export async function loadOrderEmailPayload(orderId: string): Promise<OrderEmailPayload | null> {
  const storeId = STORE_ID;
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    include: { items: true },
  });
  if (!order) return null;

  const settings = await prisma.storeSettings.findUnique({
    where: { storeId },
    select: { currency: true },
  });

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      address: order.address,
      notes: order.notes,
      deliveryOptionName: order.deliveryOptionName,
      subtotal: Number(order.subtotal),
      deliveryPrice: Number(order.deliveryPrice),
      discountAmount: Number(order.discountAmount),
      pointsDiscountAmount: Number(order.pointsDiscountAmount),
      total: Number(order.total),
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      trackingNumber: order.trackingNumber,
      courierName: order.courierName,
    },
    items: order.items.map((i) => ({
      name: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.totalPrice),
    })),
    currency: settings?.currency ?? "ILS",
  };
}

export function formatMoney(amount: number, currency = "ILS"): string {
  if (currency === "ILS") return `₪${amount.toFixed(2)}`;
  return `${amount.toFixed(2)} ${currency}`;
}

export function renderOrderItemsHtml(items: OrderEmailLine[], currency: string): string {
  const rows = items
    .map(
      (i) =>
        `<tr>
      <td style="padding:10px 8px;border-bottom:1px solid #27272a;color:#f8fafc;">${escapeHtmlInline(i.name)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #27272a;text-align:center;">×${i.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #27272a;text-align:left;color:#c89211;font-weight:700;">${formatMoney(i.lineTotal, currency)}</td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #27272a;border-radius:12px;margin:16px 0;">
    <thead><tr style="background:#0f0f0f;">
      <th style="padding:8px;font-size:11px;color:#94a3b8;text-align:right;">מוצר</th>
      <th style="padding:8px;font-size:11px;color:#94a3b8;">כמות</th>
      <th style="padding:8px;font-size:11px;color:#94a3b8;text-align:left;">סה״כ</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

function escapeHtmlInline(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
