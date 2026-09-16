import "server-only";

import { loadInvoicePdf, type InvoicePdfLang } from "@/lib/invoices/pdf";
import { buildStoredZip } from "@/lib/invoices/zip";

/**
 * Archive assembler for the invoice archive.
 *
 * `buildInvoiceArchive` renders each requested invoice PDF sequentially so
 * memory pressure stays proportional to a single PDF at a time, then
 * assembles them into a STORED ZIP once all are ready.
 *
 * We do NOT silently omit failed PDFs — a failure list is returned so the
 * caller can surface it (per spec §17: "אסור ליצור ZIP שנראה שלם בלי להודיע").
 */

export type InvoiceArchiveFailure = {
  orderId: string;
  reason: string;
};

export type InvoiceArchiveResult = {
  zip: Buffer;
  filename: string;
  succeeded: number;
  failed: InvoiceArchiveFailure[];
  fileCount: number;
  bytes: number;
};

export type BuildInvoiceArchiveInput = {
  storeId: string;
  orderIds: string[];
  lang?: InvoicePdfLang;
  /** Filename hint, e.g. "2026-09" or "period-2026-09-01_2026-09-30". */
  archiveLabel?: string;
};

const HARD_MAX_INVOICES = 1000;

/** Sanitize a label component for filenames (ASCII-only, no path separators). */
function sanitizeLabel(label: string): string {
  return label
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Build an in-memory ZIP archive for the given invoice ids. */
export async function buildInvoiceArchive(
  input: BuildInvoiceArchiveInput,
): Promise<InvoiceArchiveResult> {
  const orderIds = Array.from(new Set(input.orderIds.map((s) => String(s).trim()).filter(Boolean)));
  if (orderIds.length === 0) {
    throw new Error("EMPTY_SELECTION");
  }
  if (orderIds.length > HARD_MAX_INVOICES) {
    throw new Error(`TOO_MANY_INVOICES:${orderIds.length}`);
  }

  const entries: { name: string; data: Uint8Array }[] = [];
  const failed: InvoiceArchiveFailure[] = [];
  const usedNames = new Set<string>();

  for (const id of orderIds) {
    try {
      const pdf = await loadInvoicePdf({
        storeId: input.storeId,
        orderId: id,
        lang: input.lang,
      });
      if (!pdf) {
        failed.push({ orderId: id, reason: "not_found" });
        continue;
      }
      // Guard against filename collisions (paranoia — order numbers are unique per store).
      let name = pdf.filename;
      let suffix = 2;
      while (usedNames.has(name)) {
        name = pdf.filename.replace(/\.pdf$/i, `-${suffix}.pdf`);
        suffix++;
      }
      usedNames.add(name);
      entries.push({ name, data: pdf.bytes });
    } catch (err) {
      failed.push({
        orderId: id,
        reason: err instanceof Error ? err.message.slice(0, 200) : "render_failed",
      });
    }
  }

  if (entries.length === 0) {
    throw new Error("ALL_INVOICES_FAILED");
  }

  const label = sanitizeLabel(input.archiveLabel || defaultArchiveLabel());
  const filename = `HAGOUR-Invoices-${label}.zip`;

  const zip = buildStoredZip(entries);
  return {
    zip,
    filename,
    succeeded: entries.length,
    failed,
    fileCount: entries.length,
    bytes: zip.byteLength,
  };
}

function defaultArchiveLabel(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Convert a byte size to a friendly "12.3 MB" style string. */
export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
