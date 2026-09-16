import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Send-history for the invoice archive.
 *
 * We deliberately store history in the existing `AdminActionLog` model so we
 * do not need a new table — per spec §15: "אם ניתן לעשות זאת ללא שינוי DB
 * גדול, להשתמש ב-email/audit infrastructure הקיים."
 *
 * The metadata payload is a stable shape so the archive UI can render it back
 * as a history table.
 */

const SEND_ACTION = "invoices.email.send" as const;

/**
 * Status semantics:
 *  - "accepted" — the provider accepted the message for delivery. This is NOT
 *                 a delivery confirmation; it means the SMTP/API handshake
 *                 succeeded. Displayed as "נשלח לספק" in the UI.
 *  - "delivered" — reserved for a future webhook-driven update. We never set
 *                  this synchronously; a bounce/delivery webhook would.
 *  - "failed"   — provider rejected or the transport failed.
 */
export type InvoiceSendStatus = "accepted" | "delivered" | "failed";

export type InvoiceSendMetadata = {
  recipient: string;
  invoiceCount: number;
  periodFrom: string | null;
  periodTo: string | null;
  periodLabel: string;
  archiveFilename: string;
  bytes: number;
  mode: "attachment" | "link";
  status: InvoiceSendStatus;
  /** Provider used to send: "smtp" | "resend" | "none". */
  provider?: string;
  /** Provider-side message ID (SMTP messageId, Resend id, …). */
  providerMessageId?: string;
  /** Machine-readable error code from the provider layer. */
  errorCode?: string;
  error?: string;
  /** Never store the ZIP binary here — only the filename. */
};

export type InvoiceSendHistoryEntry = {
  id: string;
  createdAt: string;
  userId: string;
  metadata: InvoiceSendMetadata;
};

export async function recordInvoiceSend(params: {
  storeId: string;
  userId: string;
  metadata: InvoiceSendMetadata;
}): Promise<void> {
  await prisma.adminActionLog.create({
    data: {
      storeId: params.storeId,
      userId: params.userId,
      action: SEND_ACTION,
      entity: "Invoice",
      metadata: params.metadata as unknown as import("@prisma/client").Prisma.InputJsonValue,
    },
  });
}

function coerceMetadata(raw: unknown): InvoiceSendMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  // Back-compat: older rows used status="sent" — treat as "accepted".
  const rawStatus = m.status;
  const status: InvoiceSendStatus | null =
    rawStatus === "accepted" || rawStatus === "sent"
      ? "accepted"
      : rawStatus === "delivered"
        ? "delivered"
        : rawStatus === "failed"
          ? "failed"
          : null;
  const mode = m.mode === "attachment" ? "attachment" : m.mode === "link" ? "link" : null;
  if (!status || !mode) return null;
  return {
    recipient: String(m.recipient ?? ""),
    invoiceCount: Number(m.invoiceCount ?? 0) || 0,
    periodFrom: typeof m.periodFrom === "string" ? m.periodFrom : null,
    periodTo: typeof m.periodTo === "string" ? m.periodTo : null,
    periodLabel: String(m.periodLabel ?? ""),
    archiveFilename: String(m.archiveFilename ?? ""),
    bytes: Number(m.bytes ?? 0) || 0,
    mode,
    status,
    provider: typeof m.provider === "string" ? m.provider : undefined,
    providerMessageId: typeof m.providerMessageId === "string" ? m.providerMessageId : undefined,
    errorCode: typeof m.errorCode === "string" ? m.errorCode : undefined,
    error: typeof m.error === "string" ? m.error : undefined,
  };
}

/** Load the most recent send-history entries for the archive UI. */
export async function listInvoiceSendHistory(
  storeId: string,
  take = 20,
): Promise<InvoiceSendHistoryEntry[]> {
  const rows = await prisma.adminActionLog.findMany({
    where: { storeId, action: SEND_ACTION },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(1, take), 100),
    select: {
      id: true,
      createdAt: true,
      userId: true,
      metadata: true,
    },
  });

  const entries: InvoiceSendHistoryEntry[] = [];
  for (const r of rows) {
    const meta = coerceMetadata(r.metadata);
    if (!meta) continue;
    entries.push({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      userId: r.userId,
      metadata: meta,
    });
  }
  return entries;
}
