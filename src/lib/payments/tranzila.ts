import { getSiteUrl } from "@/lib/site-url";
import type { PaymentProviderConfig, PaymentSessionRequest, PaymentSessionResult } from "./types";

/**
 * Tranzila hosted payment — redirect with signed query params.
 * Set TRANZILA_TERMINAL_NAME + payment secret in admin.
 */
export async function createTranzilaSession(
  config: PaymentProviderConfig,
  req: PaymentSessionRequest,
): Promise<PaymentSessionResult> {
  const terminal = process.env.TRANZILA_TERMINAL_NAME?.trim() || config.publicKey?.trim();
  if (!terminal) throw new Error("Tranzila terminal name is not configured");

  const base = "https://direct.tranzila.com";
  const params = new URLSearchParams({
    sum: req.amount.toFixed(2),
    currency: req.currency === "ILS" ? "1" : "2",
    cred_type: "1",
    tranmode: "AK",
    contact: req.customerName,
    email: req.customerEmail,
    phone: req.customerPhone,
    pdesc: `HAGOR ${req.orderNumber}`,
    orderId: req.orderId,
    success_url_address: req.successUrl,
    fail_url_address: req.cancelUrl,
    notify_url_address: `${getSiteUrl()}/api/webhooks/payment/tranzila`,
  });

  return {
    provider: "tranzila",
    redirectUrl: `${base}/${terminal}/iframenew.php?${params.toString()}`,
    externalSessionId: req.orderId,
  };
}

export function parseTranzilaWebhook(payload: unknown): {
  orderId: string;
  amount: number;
  currency: string;
  success: boolean;
  transactionId?: string;
} | null {
  const p = payload as Record<string, string | undefined>;
  const orderId = p.orderId ?? p.OrderId ?? p.userdata1;
  if (!orderId) return null;
  const response = (p.Response ?? p.response ?? "").toLowerCase();
  const success = response === "000" || response === "ok" || p.success === "1";
  return {
    orderId,
    amount: Number(p.sum ?? p.Sum ?? 0),
    currency: (p.currency ?? "1") === "2" ? "USD" : "ILS",
    success,
    transactionId: p.index ?? p.ConfirmationCode,
  };
}
