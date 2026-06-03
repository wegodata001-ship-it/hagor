import "server-only";

import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import {
  getPaymentProviderConfig,
  getSiteBaseUrl,
  isPaymentConfigured,
  paymentNotConfiguredMessage,
} from "./config";
import { createCardcomSession } from "./cardcom";
import { createMeshulamSession } from "./meshulam";
import { createStripeCheckoutSession } from "./stripe";
import { createTranzilaSession } from "./tranzila";
import type { PaymentSessionRequest, PaymentSessionResult } from "./types";
import { isDemoPaymentAllowed } from "./demo-guard";
import { parseCardcomWebhook } from "./cardcom";
import { parseTranzilaWebhook } from "./tranzila";
import { parseStripeWebhookEvent } from "./stripe";

export type { PaymentProviderId, PaymentSessionResult } from "./types";
export { getPaymentProviderConfig, getSiteBaseUrl } from "./config";

export async function loadOrderForPayment(orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, storeId: STORE_ID },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      paymentStatus: true,
      status: true,
      customerEmail: true,
      customerName: true,
      customerPhone: true,
    },
  });
}

export async function createPaymentSession(orderId: string): Promise<PaymentSessionResult> {
  const order = await loadOrderForPayment(orderId);
  if (!order) throw new Error("Order not found");
  if (
    order.paymentStatus === "PAID" ||
    order.paymentStatus === "TEST_PAID" ||
    order.paymentStatus === "DEMO_PAID"
  ) {
    throw new Error("Order already paid");
  }

  const settings = await prisma.storeSettings.findUnique({
    where: { storeId: STORE_ID },
    select: { currency: true },
  });
  const currency = settings?.currency ?? "ILS";
  const base = getSiteBaseUrl();

  const req: PaymentSessionRequest = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: Math.round(Number(order.total) * 100) / 100,
    currency,
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    successUrl: `${base}/payment/success?orderId=${encodeURIComponent(order.id)}`,
    cancelUrl: `${base}/payment/failed?orderId=${encodeURIComponent(order.id)}`,
  };

  const config = await getPaymentProviderConfig();

  if (!isPaymentConfigured(config)) {
    throw new Error(paymentNotConfiguredMessage());
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[payment] create session", {
      orderId: order.id,
      provider: config.provider,
      amount: req.amount,
    });
  }

  switch (config.provider) {
    case "stripe":
      return createStripeCheckoutSession(config, req);
    case "cardcom":
      return createCardcomSession(config, req);
    case "tranzila":
      return createTranzilaSession(config, req);
    case "meshulam":
      return createMeshulamSession(config, req);
    case "demo":
      if (!isDemoPaymentAllowed()) {
        throw new Error(paymentNotConfiguredMessage());
      }
      return {
        provider: "demo",
        redirectUrl: `${base}/checkout/payment/${order.id}`,
      };
    default:
      throw new Error(paymentNotConfiguredMessage());
  }
}

export function parseProviderWebhook(provider: string, payload: unknown) {
  const p = provider.toLowerCase();
  if (p === "stripe") return parseStripeWebhookEvent(payload);
  if (p === "cardcom") return parseCardcomWebhook(payload);
  if (p === "tranzila") return parseTranzilaWebhook(payload);
  return null;
}
