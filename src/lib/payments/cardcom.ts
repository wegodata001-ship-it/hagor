import type { PaymentProviderConfig, PaymentSessionRequest, PaymentSessionResult } from "./types";

type CardcomCreateResponse = {
  ResponseCode?: number;
  Description?: string;
  Url?: string;
  LowProfileId?: string;
};

/**
 * Cardcom LowProfile — https://secure.cardcom.solutions/
 * Configure: CARDCOM_TERMINAL_NUMBER + payment keys in admin or env.
 */
export async function createCardcomSession(
  config: PaymentProviderConfig,
  req: PaymentSessionRequest,
): Promise<PaymentSessionResult> {
  const terminal = process.env.CARDCOM_TERMINAL_NUMBER?.trim() || config.publicKey?.trim();
  const apiName = process.env.CARDCOM_API_NAME?.trim() || "HagorApi";
  const apiPassword = config.secretKey?.trim() || process.env.CARDCOM_API_PASSWORD?.trim();
  if (!terminal || !apiPassword) {
    throw new Error("Cardcom is not configured (terminal + API password required)");
  }

  const res = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/Create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      TerminalNumber: terminal,
      ApiName: apiName,
      ApiPassword: apiPassword,
      Operation: "ChargeOnly",
      ReturnValue: req.orderId,
      Amount: req.amount,
      ProductName: `HAGOR ${req.orderNumber}`,
      SuccessRedirectUrl: req.successUrl,
      FailedRedirectUrl: req.cancelUrl,
      IndicatorUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/webhooks/payment/cardcom`,
      Language: "he",
      CoinId: req.currency === "ILS" ? 1 : 2,
      Email: req.customerEmail,
      CardOwnerName: req.customerName,
      CardOwnerPhone: req.customerPhone,
    }),
  });

  const data = (await res.json()) as CardcomCreateResponse;
  if (data.ResponseCode !== 0 || !data.Url) {
    throw new Error(data.Description ?? "Cardcom session creation failed");
  }

  return {
    provider: "cardcom",
    redirectUrl: data.Url,
    externalSessionId: data.LowProfileId,
  };
}

export function parseCardcomWebhook(payload: unknown): {
  orderId: string;
  amount: number;
  currency: string;
  success: boolean;
  transactionId?: string;
} | null {
  const p = payload as {
    ReturnValue?: string;
    DealResponse?: number;
    InternalDealNumber?: string;
    Sum?: number;
    CoinId?: number;
  };
  if (!p.ReturnValue) return null;
  const success = p.DealResponse === 0 || p.DealResponse === 1;
  return {
    orderId: p.ReturnValue,
    amount: Number(p.Sum ?? 0),
    currency: p.CoinId === 2 ? "USD" : "ILS",
    success,
    transactionId: p.InternalDealNumber,
  };
}
