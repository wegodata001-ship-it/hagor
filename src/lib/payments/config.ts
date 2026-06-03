import "server-only";

import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { isDemoPaymentAllowed } from "@/lib/payments/demo-guard";
import type { PaymentProviderConfig, PaymentProviderId } from "./types";

const ALLOWED: PaymentProviderId[] = ["stripe", "cardcom", "tranzila", "meshulam", "demo"];

const PAYMENT_NOT_CONFIGURED_HE =
  "מערכת התשלום עדיין לא הופעלה. נא להגדיר ספק סליקה באדמין.";

function normalizeProvider(raw: string | null | undefined): PaymentProviderId | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (v === "demo" && !isDemoPaymentAllowed()) return null;
  if (ALLOWED.includes(v as PaymentProviderId)) return v as PaymentProviderId;
  return null;
}

export function isPaymentEnabledFlag(): boolean {
  return process.env.PAYMENT_ENABLED !== "false";
}

export function isPaymentConfigured(config: PaymentProviderConfig): boolean {
  if (config.provider === "demo") return isDemoPaymentAllowed();
  if (!isPaymentEnabledFlag()) return false;
  if (config.provider === "stripe") {
    return Boolean(config.secretKey?.trim() && config.publicKey?.trim());
  }
  if (config.provider === "cardcom") {
    return Boolean(
      config.secretKey?.trim() ||
        process.env.CARDCOM_API_PASSWORD?.trim() ||
        process.env.PAYMENT_SECRET_KEY?.trim(),
    );
  }
  if (config.provider === "tranzila" || config.provider === "meshulam") {
    return Boolean(config.secretKey?.trim() || process.env.PAYMENT_SECRET_KEY?.trim());
  }
  return false;
}

export function paymentNotConfiguredMessage(): string {
  return PAYMENT_NOT_CONFIGURED_HE;
}

function buildPaymentConfig(
  provider: PaymentProviderId,
  settings: {
    paymentPublicKey: string | null;
    paymentSecretKey: string | null;
    paymentWebhookSecretOverride: string | null;
  } | null,
): PaymentProviderConfig {
  return {
    provider,
    publicKey: settings?.paymentPublicKey ?? process.env.PAYMENT_PUBLIC_KEY ?? null,
    secretKey: settings?.paymentSecretKey ?? process.env.PAYMENT_SECRET_KEY ?? null,
    webhookSecret:
      settings?.paymentWebhookSecretOverride ??
      process.env.PAYMENT_WEBHOOK_SECRET ??
      process.env.STRIPE_WEBHOOK_SECRET ??
      null,
  };
}

export async function getPaymentProviderConfig(): Promise<PaymentProviderConfig> {
  const settings = await prisma.storeSettings.findUnique({
    where: { storeId: STORE_ID },
    select: {
      paymentProvider: true,
      paymentPublicKey: true,
      paymentSecretKey: true,
      paymentWebhookSecretOverride: true,
      currency: true,
    },
  });

  const envProvider = process.env.PAYMENT_PROVIDER?.trim();
  const resolved = normalizeProvider(settings?.paymentProvider ?? envProvider);
  const provider: PaymentProviderId =
    resolved ?? (isDemoPaymentAllowed() ? "demo" : "cardcom");

  const config = buildPaymentConfig(provider, settings);
  if (isPaymentConfigured(config)) return config;

  if (isDemoPaymentAllowed()) {
    return buildPaymentConfig("demo", settings);
  }

  return config;
}

export { getSiteUrl as getSiteBaseUrl } from "@/lib/site-url";
