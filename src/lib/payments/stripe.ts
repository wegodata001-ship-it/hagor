import type { PaymentProviderConfig, PaymentSessionRequest, PaymentSessionResult } from "./types";

type StripeSessionResponse = {
  id?: string;
  url?: string;
  error?: { message?: string };
};

export async function createStripeCheckoutSession(
  config: PaymentProviderConfig,
  req: PaymentSessionRequest,
): Promise<PaymentSessionResult> {
  const secret = config.secretKey?.trim();
  if (!secret) throw new Error("Stripe secret key is not configured");

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", req.successUrl);
  body.set("cancel_url", req.cancelUrl);
  body.set("customer_email", req.customerEmail);
  body.set("client_reference_id", req.orderId);
  body.set("metadata[orderId]", req.orderId);
  body.set("metadata[orderNumber]", req.orderNumber);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", req.currency.toLowerCase());
  body.set("line_items[0][price_data][unit_amount]", String(Math.round(req.amount * 100)));
  body.set(
    "line_items[0][price_data][product_data][name]",
    `HAGOR Order ${req.orderNumber}`,
  );

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await res.json()) as StripeSessionResponse;
  if (!res.ok || !data.url) {
    throw new Error(data.error?.message ?? "Stripe session creation failed");
  }

  return {
    provider: "stripe",
    redirectUrl: data.url,
    externalSessionId: data.id,
  };
}

export function parseStripeWebhookEvent(payload: unknown): {
  orderId: string;
  amount: number;
  currency: string;
  success: boolean;
  transactionId?: string;
} | null {
  const event = payload as {
    type?: string;
    data?: {
      object?: {
        id?: string;
        payment_status?: string;
        amount_total?: number;
        currency?: string;
        client_reference_id?: string;
        metadata?: { orderId?: string };
      };
    };
  };

  const type = event.type;
  if (type !== "checkout.session.completed" && type !== "checkout.session.async_payment_failed") {
    return null;
  }

  const session = event.data?.object;
  if (!session) return null;

  const orderId = session.metadata?.orderId ?? session.client_reference_id;
  if (!orderId) return null;

  const amount = (session.amount_total ?? 0) / 100;
  const currency = (session.currency ?? "ils").toUpperCase();
  const success = type === "checkout.session.completed" && session.payment_status === "paid";

  return {
    orderId,
    amount,
    currency: currency === "ILS" ? "ILS" : currency,
    success,
    transactionId: session.id,
  };
}
