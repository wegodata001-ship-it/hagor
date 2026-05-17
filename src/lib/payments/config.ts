import "server-only";

import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import type { PaymentProviderConfig, PaymentProviderId } from "./types";

const ALLOWED: PaymentProviderId[] = ["stripe", "cardcom", "tranzila", "meshulam", "demo"];

function normalizeProvider(raw: string | null | undefined): PaymentProviderId {
  const v = (raw ?? "").trim().toLowerCase();
  if (ALLOWED.includes(v as PaymentProviderId)) return v as PaymentProviderId;
  return "demo";
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
  const provider = normalizeProvider(settings?.paymentProvider ?? envProvider);

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

export function getSiteBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
