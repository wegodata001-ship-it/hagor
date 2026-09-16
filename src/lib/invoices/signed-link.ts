import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed download tokens for invoice ZIPs / single-PDF archive downloads.
 *
 * Used only when the accountant email fallback link is needed (ZIP too big for
 * an SMTP attachment). Tokens carry the exact filter payload — never a raw
 * order id — so a leaked link cannot enumerate other orders.
 *
 * Tokens are HMAC-SHA256 signed with the same secret as order-tracking tokens
 * to avoid introducing new secret material.
 */

function invoiceSecret(): string {
  return (
    process.env.INVOICE_SIGNING_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.PAYMENT_WEBHOOK_SECRET?.trim() ||
    ""
  );
}

export type SignedInvoicePayload = {
  /** Ordered invoice/order ids to include in the ZIP. */
  ids: string[];
  /** Optional archive display name, e.g. "2026-09". */
  label?: string;
};

type EnvelopeV1 = {
  v: 1;
  p: SignedInvoicePayload;
  /** Unix seconds. */
  exp: number;
};

/** Default TTL for signed archive links (7 days). */
export const DEFAULT_INVOICE_LINK_TTL_SECONDS = 60 * 60 * 24 * 7;

/** Create a signed archive-download token for a fixed set of invoice ids. */
export function createSignedInvoiceArchiveToken(
  payload: SignedInvoicePayload,
  ttlSeconds: number = DEFAULT_INVOICE_LINK_TTL_SECONDS,
): string {
  const secret = invoiceSecret();
  if (!secret) throw new Error("INVOICE_LINK_SECRET_MISSING");
  const ids = Array.from(new Set((payload.ids || []).map((s) => String(s).trim()).filter(Boolean)));
  if (ids.length === 0) throw new Error("INVOICE_LINK_EMPTY_IDS");
  const env: EnvelopeV1 = {
    v: 1,
    p: { ids, label: (payload.label || "").trim() || undefined },
    exp: Math.floor(Date.now() / 1000) + Math.max(60, Math.floor(ttlSeconds)),
  };
  const body = Buffer.from(JSON.stringify(env), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Verify + parse a signed archive-download token. Returns null on any failure. */
export function verifySignedInvoiceArchiveToken(token: string): SignedInvoicePayload | null {
  const secret = invoiceSecret();
  if (!secret || !token.trim()) return null;
  try {
    const parts = token.trim().split(".");
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const expected = createHmac("sha256", secret).update(body).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const raw = Buffer.from(body, "base64url").toString("utf8");
    const env = JSON.parse(raw) as EnvelopeV1;
    if (!env || env.v !== 1 || !Array.isArray(env.p?.ids)) return null;
    if (typeof env.exp !== "number" || env.exp < Math.floor(Date.now() / 1000)) return null;
    const ids = env.p.ids.filter((s) => typeof s === "string" && s.trim().length > 0);
    if (ids.length === 0) return null;
    return { ids, label: env.p.label };
  } catch {
    return null;
  }
}
