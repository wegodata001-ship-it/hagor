import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { getAppUrl } from "@/lib/app-url";
import { formatSelectedOptionsLines, parseSelectedOptions } from "@/lib/hagour-product-options";

function trackingSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.PAYMENT_WEBHOOK_SECRET?.trim() ||
    ""
  );
}

/** Signed tracking token (orderId + expiry). Not guessable from order number alone. */
export function createOrderTrackingToken(orderId: string, ttlSeconds = 60 * 60 * 24 * 120): string {
  const secret = trackingSecret();
  if (!secret) throw new Error("TRACKING_SECRET_MISSING");
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${orderId}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return Buffer.from(`${payload}.${sig}`, "utf8").toString("base64url");
}

export function verifyOrderTrackingToken(token: string): { orderId: string } | null {
  const secret = trackingSecret();
  if (!secret || !token.trim()) return null;
  try {
    const raw = Buffer.from(token.trim(), "base64url").toString("utf8");
    const parts = raw.split(".");
    if (parts.length !== 3) return null;
    const [orderId, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!orderId || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
    const payload = `${orderId}.${expStr}`;
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { orderId };
  } catch {
    return null;
  }
}

export function buildOrderTrackingUrl(orderId: string): string {
  const token = createOrderTrackingToken(orderId);
  return `${getAppUrl()}/track-order?t=${encodeURIComponent(token)}`;
}

/** Signed success-page URL — never expose order details via bare orderId alone. */
export function buildPaymentSuccessUrl(orderId: string): string {
  const token = createOrderTrackingToken(orderId);
  return `${getAppUrl()}/payment/success?t=${encodeURIComponent(token)}`;
}

/** Relative success path for in-app links. */
export function buildPaymentSuccessPath(orderId: string): string {
  const token = createOrderTrackingToken(orderId);
  return `/payment/success?t=${encodeURIComponent(token)}`;
}

export function buildOrderPdfPath(token: string): string {
  return `/api/orders/confirmation-pdf?t=${encodeURIComponent(token)}`;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type PublicTrackOrderItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variationLines: string[];
};

export type PublicTrackOrderView = {
  id: string;
  orderNumber: string;
  createdAt: Date;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  customerName: string;
  address: string | null;
  deliveryOptionName: string;
  deliveryOptionType: string;
  deliveryPrice: number;
  subtotal: number;
  discountAmount: number;
  pointsDiscountAmount: number;
  total: number;
  trackingNumber: string | null;
  courierName: string | null;
  items: PublicTrackOrderItem[];
  /** Signed token for PDF / deep-link; only set when caller authenticated access. */
  accessToken?: string;
};

function toView(
  order: {
    id: string;
    orderNumber: string;
    createdAt: Date;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    customerName: string;
    address: string | null;
    deliveryOptionName: string;
    deliveryOptionType: string;
    deliveryPrice: { toString(): string } | number;
    subtotal: { toString(): string } | number;
    discountAmount: { toString(): string } | number;
    pointsDiscountAmount: { toString(): string } | number;
    total: { toString(): string } | number;
    trackingNumber: string | null;
    courierName: string | null;
    items: {
      productName: string;
      quantity: number;
      unitPrice: { toString(): string } | number;
      totalPrice: { toString(): string } | number;
      selectedOptions: unknown;
    }[];
  },
  accessToken?: string,
): PublicTrackOrderView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    customerName: order.customerName,
    address: order.address,
    deliveryOptionName: order.deliveryOptionName,
    deliveryOptionType: order.deliveryOptionType,
    deliveryPrice: Number(order.deliveryPrice),
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discountAmount),
    pointsDiscountAmount: Number(order.pointsDiscountAmount),
    total: Number(order.total),
    trackingNumber: order.trackingNumber,
    courierName: order.courierName,
    items: order.items.map((i) => {
      const opts = parseSelectedOptions(i.selectedOptions);
      return {
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
        variationLines: formatSelectedOptionsLines(opts, "he"),
      };
    }),
    accessToken,
  };
}

const publicSelect = {
  id: true,
  orderNumber: true,
  createdAt: true,
  status: true,
  paymentStatus: true,
  fulfillmentStatus: true,
  customerName: true,
  address: true,
  deliveryOptionName: true,
  deliveryOptionType: true,
  deliveryPrice: true,
  subtotal: true,
  discountAmount: true,
  pointsDiscountAmount: true,
  total: true,
  trackingNumber: true,
  courierName: true,
  items: {
    select: {
      productName: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      selectedOptions: true,
    },
  },
} as const;

export async function findOrderByTrackingToken(token: string): Promise<PublicTrackOrderView | null> {
  const verified = verifyOrderTrackingToken(token);
  if (!verified) return null;
  const order = await prisma.order.findFirst({
    where: { id: verified.orderId, storeId: STORE_ID },
    select: publicSelect,
  });
  return order ? toView(order, token) : null;
}

/** Secure guest lookup: order number + phone OR email (never order number alone). */
export async function findOrderByNumberAndContact(input: {
  orderNumber: string;
  phoneOrEmail: string;
}): Promise<PublicTrackOrderView | null> {
  const orderNumber = input.orderNumber.trim();
  const contact = input.phoneOrEmail.trim();
  if (!orderNumber || !contact) return null;

  const order = await prisma.order.findFirst({
    where: { storeId: STORE_ID, orderNumber },
    select: {
      ...publicSelect,
      customerEmail: true,
      customerPhone: true,
    },
  });
  if (!order) return null;

  const contactDigits = normalizePhone(contact);
  const contactEmail = normalizeEmail(contact);
  const phoneOk =
    contactDigits.length >= 7 && normalizePhone(order.customerPhone).endsWith(contactDigits.slice(-7));
  const emailOk = contact.includes("@") && normalizeEmail(order.customerEmail) === contactEmail;
  if (!phoneOk && !emailOk) return null;

  const { customerEmail: _e, customerPhone: _p, ...rest } = order;
  let accessToken: string | undefined;
  try {
    accessToken = createOrderTrackingToken(order.id);
  } catch {
    accessToken = undefined;
  }
  return toView(rest, accessToken);
}

/** Full order payload for PDF — only after token verification. */
export async function loadOrderForConfirmationPdf(token: string) {
  const verified = verifyOrderTrackingToken(token);
  if (!verified) return null;

  const order = await prisma.order.findFirst({
    where: { id: verified.orderId, storeId: STORE_ID },
    select: {
      ...publicSelect,
      customerEmail: true,
      customerPhone: true,
      notes: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          provider: true,
          amount: true,
          status: true,
          confirmationNumber: true,
          createdAt: true,
        },
      },
    },
  });
  if (!order) return null;

  const settings = await prisma.storeSettings.findUnique({
    where: { storeId: STORE_ID },
    select: {
      storePhone: true,
      storeAddress: true,
      supportEmail: true,
      businessLegalName: true,
      businessTaxId: true,
      businessWebsite: true,
    },
  });
  const store = await prisma.store.findUnique({
    where: { id: STORE_ID },
    select: { name: true },
  });

  return { order, settings, store };
}
