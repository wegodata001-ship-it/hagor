import "server-only";

import { STORE_ID } from "@/lib/store";
import { getSiteUrl, PRODUCTION_SITE_URL } from "@/lib/site-url";
import type { PaymentProviderConfig, PaymentSessionRequest, PaymentSessionResult } from "./types";

/**
 * Hyp Pay (formerly YaadPay) — hosted payment page via APISign.
 * Official docs: https://developers.hyp.co.il/pay/getting-started/creating-a-payment-page.md
 *
 * Server-only credentials (never NEXT_PUBLIC_*):
 * - HYP_API_KEY  → KEY
 * - HYP_PASSP    → PassP
 * - HYP_MASOF    → Masof (terminal number)
 * Optional:
 * - HYP_BASE_URL (default https://pay.hyp.co.il/p/)
 */

const DEFAULT_HYP_BASE = "https://pay.hyp.co.il/p/";

export type HypCredentials = {
  apiKey: string;
  passP: string;
  masof: string;
  baseUrl: string;
};

export type HypConfigStatus = {
  provider: "HYP";
  configured: boolean;
  apiKey: "EXISTS" | "MISSING";
  passP: "EXISTS" | "MISSING";
  masof: "EXISTS" | "MISSING";
  missing: string[];
};

function envTrim(key: string): string {
  return process.env[key]?.trim() || "";
}

/** Presence-only status — never returns secret values. */
export function getHypConfigStatus(): HypConfigStatus {
  const apiKey = envTrim("HYP_API_KEY") ? "EXISTS" : "MISSING";
  const passP = envTrim("HYP_PASSP") ? "EXISTS" : "MISSING";
  const masof = envTrim("HYP_MASOF") ? "EXISTS" : "MISSING";
  const missing: string[] = [];
  if (apiKey === "MISSING") missing.push("HYP_API_KEY");
  if (passP === "MISSING") missing.push("HYP_PASSP");
  if (masof === "MISSING") missing.push("HYP_MASOF");
  return {
    provider: "HYP",
    configured: missing.length === 0,
    apiKey,
    passP,
    masof,
    missing,
  };
}

export function getHypCredentials(_config?: PaymentProviderConfig | null): HypCredentials | null {
  const apiKey = envTrim("HYP_API_KEY");
  const passP = envTrim("HYP_PASSP");
  const masof = envTrim("HYP_MASOF");
  const baseUrl = envTrim("HYP_BASE_URL") || DEFAULT_HYP_BASE;
  if (!apiKey || !passP || !masof) return null;
  return { apiKey, passP, masof, baseUrl: baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/` };
}

export function isHypConfigured(config?: PaymentProviderConfig | null): boolean {
  return Boolean(getHypCredentials(config));
}

function productionPaymentBaseUrl(): string {
  const base = getSiteUrl();
  if (process.env.NODE_ENV === "production") {
    try {
      const host = new URL(base).hostname.toLowerCase();
      if (host === "localhost" || host.endsWith(".vercel.app") || host === "127.0.0.1") {
        return PRODUCTION_SITE_URL;
      }
    } catch {
      return PRODUCTION_SITE_URL;
    }
  }
  return base;
}

function stripSensitiveParams(query: string): string {
  const cleaned = query.replace(/^\?/, "");
  const params = new URLSearchParams(cleaned);
  params.delete("KEY");
  params.delete("PassP");
  params.delete("Passp");
  params.delete("passP");
  return params.toString();
}

function parseQueryMap(query: string): Record<string, string> {
  const out: Record<string, string> = {};
  const params = new URLSearchParams(query.replace(/^\?/, ""));
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

function firstNameFrom(full: string): string {
  const t = full.trim();
  if (!t) return "Customer";
  return t.split(/\s+/)[0] ?? "Customer";
}

function lastNameFrom(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : "-";
}

/**
 * Create Hyp Pay hosted page URL via APISign (SIGN).
 * Amount is in ILS (shekels), not agorot — per Hyp Pay docs.
 */
export async function createHypSession(
  _config: PaymentProviderConfig,
  req: PaymentSessionRequest,
): Promise<PaymentSessionResult> {
  if (req.currency.toUpperCase() !== "ILS") {
    throw new Error("Hyp supports ILS only for this store");
  }

  const creds = getHypCredentials();
  if (!creds) {
    const status = getHypConfigStatus();
    throw new Error(`MISSING_ENV:${status.missing.join(",")}`);
  }

  if (!Number.isFinite(req.amount) || req.amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const base = productionPaymentBaseUrl();
  const returnUrl = `${base}/api/payments/hyp/return`;
  const failUrl = `${base}/payment/failed?orderId=${encodeURIComponent(req.orderId)}`;

  // Build SIGN request. Do not log KEY/PassP.
  const signParams = new URLSearchParams();
  signParams.set("action", "APISign");
  signParams.set("What", "SIGN");
  signParams.set("Sign", "True");
  signParams.set("MoreData", "True");
  signParams.set("UTF8", "True");
  signParams.set("Coin", "1");
  signParams.set("PageLang", "HEB");
  signParams.set("Masof", creds.masof);
  signParams.set("KEY", creds.apiKey);
  signParams.set("PassP", creds.passP);
  signParams.set("Amount", String(Math.round(req.amount * 100) / 100));
  signParams.set("Order", req.orderId);
  signParams.set("Info", `HAGOUR ${req.orderNumber}`);
  signParams.set("ClientName", firstNameFrom(req.customerName));
  signParams.set("ClientLName", lastNameFrom(req.customerName));
  signParams.set("email", req.customerEmail || "");
  if (req.customerPhone?.trim()) signParams.set("cell", req.customerPhone.trim());
  // Israeli ID optional — zeros when not collected at checkout
  signParams.set("UserId", "000000000");
  // Help portal + API prefer SuccessUrl when supported
  signParams.set("SuccessUrl", `${returnUrl}?storeId=${encodeURIComponent(STORE_ID)}`);
  signParams.set("ErrorUrl", failUrl);
  signParams.set("CancelUrl", `${failUrl}&cancelled=1`);
  // Merchant free fields — store isolation metadata (visible in Hyp portal / redirects)
  signParams.set("Fild1", STORE_ID);
  signParams.set("Fild2", req.orderNumber);
  signParams.set("Fild3", req.orderId);

  const signUrl = `${creds.baseUrl}?${signParams.toString()}`;
  const res = await fetch(signUrl, {
    method: "GET",
    headers: { Accept: "text/plain,*/*" },
    cache: "no-store",
  });
  const raw = (await res.text()).trim();
  if (!res.ok) {
    throw new Error(`Hyp APISign HTTP ${res.status}`);
  }
  if (!raw || /CCode=\s*(?!0\b)\d+/i.test(raw) && !/signature=/i.test(raw)) {
    // Soft check — some errors return CCode without signature
    if (/CCode=/i.test(raw) && !/signature=/i.test(raw)) {
      throw new Error(`Hyp APISign failed: ${raw.slice(0, 120)}`);
    }
  }
  if (!/signature=/i.test(raw) && !/action=pay/i.test(raw)) {
    throw new Error(`Hyp APISign unexpected response`);
  }

  const safeQuery = stripSensitiveParams(raw);
  const redirectUrl = `${creds.baseUrl}?${safeQuery}`;

  return {
    provider: "hyp",
    redirectUrl,
    externalSessionId: req.orderId,
  };
}

export function normalizeHypParams(
  source: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(source)) {
    if (Array.isArray(v)) out[k] = v[0] != null ? String(v[0]) : "";
    else if (v != null) out[k] = String(v);
  }
  return out;
}

function pick(params: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (params[k] != null && String(params[k]).trim() !== "") return String(params[k]).trim();
  }
  return "";
}

/**
 * Verify Hyp Pay redirect via official APISign What=VERIFY.
 * @see https://developers.hyp.co.il/pay/getting-started/creating-a-payment-page.md
 */
export async function verifyHypPayReturn(
  params: Record<string, string>,
  orderedPairs?: Array<[string, string]>,
): Promise<boolean> {
  const creds = getHypCredentials();
  if (!creds) return false;

  const verify = new URLSearchParams();
  verify.set("action", "APISign");
  verify.set("What", "VERIFY");
  verify.set("Masof", creds.masof);
  verify.set("KEY", creds.apiKey);
  verify.set("PassP", creds.passP);

  const skip = new Set(["action", "What", "KEY", "PassP", "Passp", "storeId", "outcome"]);
  if (orderedPairs?.length) {
    for (const [k, v] of orderedPairs) {
      if (skip.has(k)) continue;
      verify.append(k, v);
    }
  } else {
    for (const [k, v] of Object.entries(params)) {
      if (skip.has(k)) continue;
      verify.append(k, v);
    }
  }

  const verifyUrl = `${creds.baseUrl}?${verify.toString()}`;
  const res = await fetch(verifyUrl, { method: "GET", cache: "no-store" });
  const text = (await res.text()).trim();
  const map = parseQueryMap(text);
  return map.CCode === "0" || /^CCode=0\b/i.test(text) || text === "CCode=0";
}

export type HypCallbackFields = {
  orderId: string;
  storeId: string;
  amount: number;
  currency: string;
  success: boolean;
  transactionId?: string;
  confirmationNumber?: string;
  rawPayload: Record<string, string>;
};

/**
 * Resolve + verify a Hyp Pay browser return / notify payload.
 * Success page alone is NEVER enough — VERIFY must pass.
 */
export async function resolveHypPaymentFromParams(
  params: Record<string, string>,
  opts?: { orderedPairs?: Array<[string, string]> },
): Promise<HypCallbackFields> {
  const status = getHypConfigStatus();
  if (!status.configured) {
    throw new Error(`MISSING_ENV:${status.missing.join(",")}`);
  }

  const queryStoreId = pick(params, "storeId", "Fild1");
  if (queryStoreId && queryStoreId !== STORE_ID) {
    throw new Error("STORE_MISMATCH");
  }

  const orderId = pick(params, "Order", "orderId", "Fild3");
  if (!orderId) throw new Error("Missing order reference");

  const cCode = pick(params, "CCode");
  const amountRaw = pick(params, "Amount");
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount)) throw new Error("PAYMENT_AMOUNT_MISSING");

  const verified = await verifyHypPayReturn(params, opts?.orderedPairs);
  if (!verified) throw new Error("HYP_VERIFY_FAILED");

  const success = cCode === "0";

  return {
    orderId,
    storeId: STORE_ID,
    amount: Math.round(amount * 100) / 100,
    currency: "ILS",
    success,
    transactionId: pick(params, "Id", "id") || undefined,
    confirmationNumber: pick(params, "ACode", "aCode") || undefined,
    rawPayload: params,
  };
}
