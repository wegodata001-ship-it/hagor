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

export type InvoiceSendMetadata = {
  recipient: string;
  invoiceCount: number;
  periodFrom: string | null;
  periodTo: string | null;
  periodLabel: string;
  archiveFilename: string;
  bytes: number;
  mode: "attachment" | "link";
  status: "sent" | "failed";
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
  const status = m.status === "sent" ? "sent" : m.status === "failed" ? "failed" : null;
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
