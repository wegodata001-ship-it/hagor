import { Prisma } from "@prisma/client";

/** Card / secret field names that must never be persisted or logged. */
const SENSITIVE_KEY =
  /card|ccn|ccno|cvv|cvc|pan|expir|tokef|holder|nomer|credit|cardnum|cardno|cardname|password|passp|secret|l4digit|^bin$|^key$|^pass$|^pin$|^cc$|^token$/i;

function isSensitiveKey(key: string): boolean {
  const compact = key.replace(/[\s_-]+/g, "");
  return SENSITIVE_KEY.test(key) || SENSITIVE_KEY.test(compact);
}

function sanitizeUnknown(raw: unknown, depth = 0): unknown {
  if (depth > 6 || raw == null) return null;
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return typeof raw === "string" ? raw.slice(0, 500) : raw;
  }
  if (Array.isArray(raw)) {
    return raw.slice(0, 50).map((item) => sanitizeUnknown(item, depth + 1));
  }
  if (typeof raw !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isSensitiveKey(key)) continue;
    out[key] = sanitizeUnknown(value, depth + 1);
  }
  return out;
}

export function sanitizePaymentPayload(raw: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (raw === undefined || raw === null) return Prisma.JsonNull;
  const cleaned = sanitizeUnknown(raw);
  if (cleaned == null) return Prisma.JsonNull;
  return cleaned as Prisma.InputJsonValue;
}
