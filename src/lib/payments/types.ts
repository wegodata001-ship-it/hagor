export type PaymentProviderId = "stripe" | "cardcom" | "tranzila" | "meshulam" | "demo";

export type PaymentSessionRequest = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  successUrl: string;
  cancelUrl: string;
};

export type PaymentSessionResult = {
  provider: PaymentProviderId;
  redirectUrl: string;
  externalSessionId?: string;
};

export type ParsedProviderWebhook = {
  orderId: string;
  amount: number;
  currency: string;
  success: boolean;
  transactionId?: string;
  confirmationNumber?: string;
  rawPayload: unknown;
};

export type PaymentProviderConfig = {
  provider: PaymentProviderId;
  publicKey?: string | null;
  secretKey?: string | null;
  webhookSecret?: string | null;
};
