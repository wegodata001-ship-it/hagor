import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { getAppUrl } from "@/lib/app-url";

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

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

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
  deliveryPrice: number;
  subtotal: number;
  total: number;
  trackingNumber: string | null;
  courierName: string | null;
  items: { productName: string; quantity: number; unitPrice: number; totalPrice: number }[];
};

function toView(order: {
  id: string;
  orderNumber: string;
  createdAt: Date;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  customerName: string;
  address: string | null;
  deliveryOptionName: string;
  deliveryPrice: { toString(): string } | number;
  subtotal: { toString(): string } | number;
  total: { toString(): string } | number;
  trackingNumber: string | null;
  courierName: string | null;
  items: { productName: string; quantity: number; unitPrice: { toString(): string } | number; totalPrice: { toString(): string } | number }[];
}): PublicTrackOrderView {
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
    deliveryPrice: Number(order.deliveryPrice),
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    trackingNumber: order.trackingNumber,
    courierName: order.courierName,
    items: order.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
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
  deliveryPrice: true,
  subtotal: true,
  total: true,
  trackingNumber: true,
  courierName: true,
  items: {
    select: {
      productName: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
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
  return order ? toView(order) : null;
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
  const phoneOk = contactDigits.length >= 7 && normalizePhone(order.customerPhone).endsWith(contactDigits.slice(-7));
  const emailOk = contact.includes("@") && normalizeEmail(order.customerEmail) === contactEmail;
  if (!phoneOk && !emailOk) return null;

  const { customerEmail: _e, customerPhone: _p, ...rest } = order;
  return toView(rest);
}
