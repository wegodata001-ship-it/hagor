import "server-only";

import { formatSelectedOptionsLines, parseSelectedOptions } from "@/lib/hagour-product-options";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

export type OrderEmailLine = {
  name: string;
  variation: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderEmailPayload = {
  order: {
    id: string;
    orderNumber: string;
    createdAt: Date;
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
  payment: {
    provider: string;
    transactionId: string | null;
    confirmationNumber: string | null;
    status: string;
  } | null;
};

export async function loadOrderEmailPayload(orderId: string): Promise<OrderEmailPayload | null> {
  const storeId = STORE_ID;
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    include: {
      items: true,
      payments: {
        where: { status: { in: ["PAID", "TEST_PAID", "DEMO_PAID"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!order) return null;

  const settings = await prisma.storeSettings.findUnique({
    where: { storeId },
    select: { currency: true },
  });

  const payment = order.payments[0] ?? null;

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
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
    items: order.items.map((i) => {
      const opts = parseSelectedOptions(i.selectedOptions);
      const lines = formatSelectedOptionsLines(opts, "he");
      return {
        name: i.productName,
        variation: lines.length ? lines.join(" · ") : null,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.totalPrice),
      };
    }),
    currency: settings?.currency ?? "ILS",
    payment: payment
      ? {
          provider: payment.provider,
          transactionId: payment.transactionId,
          confirmationNumber: payment.confirmationNumber,
          status: payment.status,
        }
      : null,
  };
}

export function formatMoney(amount: number, currency = "ILS"): string {
  if (currency === "ILS") return `₪${amount.toFixed(2)}`;
  return `${amount.toFixed(2)} ${currency}`;
}

export function renderOrderItemsHtml(items: OrderEmailLine[], currency: string): string {
  const rows = items
    .map((i) => {
      const variation = i.variation
        ? `<div style="margin-top:4px;font-size:12px;color:#94a3b8;font-weight:400;">${escapeHtmlInline(i.variation)}</div>`
        : "";
      return `<tr>
      <td style="padding:12px 8px;border-bottom:1px solid #27272a;color:#f8fafc;vertical-align:top;">
        <div style="font-weight:700;">${escapeHtmlInline(i.name)}</div>${variation}
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #27272a;text-align:center;vertical-align:top;">×${i.quantity}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #27272a;text-align:left;color:#c89211;font-weight:700;vertical-align:top;">${formatMoney(i.lineTotal, currency)}</td>
    </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #27272a;border-radius:12px;margin:16px 0;">
    <thead><tr style="background:#0f0f0f;">
      <th style="padding:8px;font-size:11px;color:#94a3b8;text-align:right;">מוצר</th>
      <th style="padding:8px;font-size:11px;color:#94a3b8;">כמות</th>
      <th style="padding:8px;font-size:11px;color:#94a3b8;text-align:left;">מחיר</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderOrderTotalsHtml(
  order: Pick<
    OrderEmailPayload["order"],
    "subtotal" | "deliveryPrice" | "discountAmount" | "pointsDiscountAmount" | "total"
  >,
  currency: string,
): string {
  const discount = order.discountAmount + order.pointsDiscountAmount;
  const discountRow =
    discount > 0
      ? `<tr>
      <td style="padding:6px 0;color:#94a3b8;font-size:13px;">הנחה</td>
      <td style="padding:6px 0;text-align:left;color:#86efac;font-size:13px;">−${formatMoney(discount, currency)}</td>
    </tr>`
      : "";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 0;">
    <tr>
      <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Subtotal</td>
      <td style="padding:6px 0;text-align:left;color:#e2e8f0;font-size:13px;">${formatMoney(order.subtotal, currency)}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#94a3b8;font-size:13px;">משלוח</td>
      <td style="padding:6px 0;text-align:left;color:#e2e8f0;font-size:13px;">${formatMoney(order.deliveryPrice, currency)}</td>
    </tr>
    ${discountRow}
    <tr>
      <td style="padding:12px 0 0;border-top:1px solid #27272a;color:#f8fafc;font-size:16px;font-weight:800;">סה״כ ששולם</td>
      <td style="padding:12px 0 0;border-top:1px solid #27272a;text-align:left;color:#c89211;font-size:18px;font-weight:800;">${formatMoney(order.total, currency)}</td>
    </tr>
  </table>`;
}

function escapeHtmlInline(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
