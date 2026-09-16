import "server-only";

import { BRAND_LEGAL_NAME } from "@/lib/brand";
import { getAppUrl } from "@/lib/app-url";
import { emailButton, escapeHtml, infoRow, wrapEmailHtml } from "@/lib/email/layout";
import {
  sendEmail,
  type EmailErrorCode,
  type EmailProvider,
} from "@/lib/email/send";
import {
  createSignedInvoiceArchiveToken,
  DEFAULT_INVOICE_LINK_TTL_SECONDS,
} from "@/lib/invoices/signed-link";
import type { InvoiceArchiveResult } from "@/lib/invoices/archive";
import { formatByteSize } from "@/lib/invoices/archive";

/**
 * SMTP attachment size cap. Kept conservative:
 * - Brevo/most providers reject > 25 MB.
 * - Base64 encoding inflates by ~1.37×; we bake that into the cap so the
 *   post-encoded MIME payload stays under ~25 MB.
 */
const DEFAULT_MAX_ATTACHMENT_BYTES = 18 * 1024 * 1024; // 18 MB pre-encoding.

function attachmentBudget(): number {
  const raw = Number(process.env.INVOICE_EMAIL_MAX_ATTACHMENT_BYTES);
  if (Number.isFinite(raw) && raw > 512 * 1024) return raw;
  return DEFAULT_MAX_ATTACHMENT_BYTES;
}

export type AccountantEmailContext = {
  /** Recipient. */
  to: string;
  /** Optional recipient name for salutation / envelope. */
  toName?: string;
  /** Period label, e.g. "01/09/2026 – 30/09/2026". */
  periodLabel: string;
  /** Human month label for subject (e.g. "09/2026"). */
  subjectPeriod: string;
};

export type AccountantEmailOutcome = {
  ok: boolean;
  mode: "attachment" | "link" | null;
  /** Signed download URL if we fell back to a link. */
  downloadUrl?: string;
  /** Expiry timestamp (unix seconds) of the download link, if any. */
  linkExpiresAt?: number;
  /** Machine-readable error code returned by the provider layer. */
  errorCode?: EmailErrorCode | "MISSING_RECIPIENT" | "SIGNED_LINK_SECRET_MISSING";
  /** Human-readable message safe for admin UI display. */
  errorMessage?: string;
  /** Provider that (attempted to) send the message. */
  provider: EmailProvider;
  /** Provider-side message identifier — only present on success. */
  messageId?: string;
  fileCount: number;
  bytes: number;
};

export type SingleInvoiceEmailOutcome = {
  ok: boolean;
  provider: EmailProvider;
  messageId?: string;
  errorCode?: EmailErrorCode | "MISSING_RECIPIENT";
  errorMessage?: string;
};

function buildBodyHtml(
  ctx: AccountantEmailContext,
  archive: InvoiceArchiveResult,
  downloadUrl?: string,
  linkExpiresAt?: number,
): string {
  const greeting = ctx.toName?.trim() ? `שלום ${escapeHtml(ctx.toName.trim())},` : "שלום,";
  const linkBlock = downloadUrl
    ? `<p style="margin:16px 0 8px;">הקובץ גדול מדי לשליחה כקובץ מצורף. הוכן קישור הורדה מאובטח:</p>
       <p style="text-align:center;">${emailButton(downloadUrl, "הורדת ארכיון החשבוניות")}</p>
       ${
         linkExpiresAt
           ? `<p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">הקישור תקף עד ${escapeHtml(
               new Date(linkExpiresAt * 1000).toLocaleString("he-IL"),
             )}. אין לשתף בכתובות שאינן של רואה החשבון.</p>`
           : ""
       }`
    : `<p style="margin:16px 0 8px;">קובץ הארכיון מצורף להודעה זו.</p>`;

  const failureBlock = archive.failed.length
    ? `<p style="margin:20px 0 4px;color:#f59e0b;font-weight:700;">שים לב:</p>
       <p style="margin:0;font-size:13px;color:#e2e8f0;">${archive.failed.length} מסמכים לא נכללו בשל תקלת רינדור. ניתן לנסות שוב מפאנל הניהול.</p>`
    : "";

  return `
    <p style="margin:0 0 16px;">${greeting}</p>
    <p style="margin:0 0 16px;">מצורף ארכיון החשבוניות של <strong>${escapeHtml(BRAND_LEGAL_NAME)}</strong> לתקופה ${escapeHtml(
      ctx.periodLabel,
    )}.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;">
      ${infoRow("תקופה", escapeHtml(ctx.periodLabel))}
      ${infoRow("מספר מסמכים", String(archive.fileCount))}
      ${infoRow("שם הקובץ", escapeHtml(archive.filename))}
      ${infoRow("גודל", escapeHtml(formatByteSize(archive.bytes)))}
    </table>
    ${linkBlock}
    ${failureBlock}
    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">
      נשלח אוטומטית ממערכת הניהול של ${escapeHtml(BRAND_LEGAL_NAME)}. אם לא ציפית לקבל הודעה זו — יש לפנות לחנות.
    </p>
  `;
}

/** Send an invoice archive to the accountant, falling back to a signed link if the ZIP is too big. */
export async function sendInvoiceArchiveToAccountant(params: {
  ctx: AccountantEmailContext;
  archive: InvoiceArchiveResult;
  orderIds: string[];
  archiveLabel?: string;
}): Promise<AccountantEmailOutcome> {
  const { ctx, archive } = params;
  const to = (ctx.to || "").trim();

  if (!to) {
    return {
      ok: false,
      mode: null,
      provider: "none",
      errorCode: "MISSING_RECIPIENT",
      errorMessage: "לא הוגדר נמען.",
      fileCount: archive.fileCount,
      bytes: archive.bytes,
    };
  }

  const subject = `${BRAND_LEGAL_NAME} — חשבוניות ${ctx.subjectPeriod}`;
  const budget = attachmentBudget();
  const asAttachment = archive.bytes <= budget;

  let downloadUrl: string | undefined;
  let linkExpiresAt: number | undefined;

  if (!asAttachment) {
    try {
      const token = createSignedInvoiceArchiveToken({
        ids: params.orderIds,
        label: params.archiveLabel,
      });
      downloadUrl = `${getAppUrl()}/api/admin/invoices/zip-download?t=${encodeURIComponent(token)}`;
      linkExpiresAt = Math.floor(Date.now() / 1000) + DEFAULT_INVOICE_LINK_TTL_SECONDS;
    } catch (err) {
      return {
        ok: false,
        mode: null,
        provider: "none",
        errorCode: "SIGNED_LINK_SECRET_MISSING",
        errorMessage:
          err instanceof Error ? err.message.slice(0, 200) : "signed_link_secret_missing",
        fileCount: archive.fileCount,
        bytes: archive.bytes,
      };
    }
  }

  const html = wrapEmailHtml(
    `חשבוניות ${ctx.subjectPeriod}`,
    buildBodyHtml(ctx, archive, downloadUrl, linkExpiresAt),
    `ארכיון חשבוניות ${ctx.subjectPeriod}`,
  );

  const result = await sendEmail({
    to,
    subject,
    html,
    attachments: asAttachment
      ? [
          {
            filename: archive.filename,
            content: archive.zip,
            contentType: "application/zip",
          },
        ]
      : undefined,
  });

  return {
    ok: result.ok,
    provider: result.provider,
    mode: asAttachment ? "attachment" : "link",
    downloadUrl,
    linkExpiresAt,
    messageId: result.messageId,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
    fileCount: archive.fileCount,
    bytes: archive.bytes,
  };
}

/** Send a single invoice PDF to a chosen recipient. Never falls back to a link — one PDF is always small enough. */
export async function sendSingleInvoicePdfEmail(params: {
  to: string;
  toName?: string;
  documentNumber: string;
  orderNumber: string;
  pdf: Uint8Array;
  filename: string;
}): Promise<SingleInvoiceEmailOutcome> {
  const to = params.to.trim();
  if (!to) {
    return {
      ok: false,
      provider: "none",
      errorCode: "MISSING_RECIPIENT",
      errorMessage: "לא הוגדר נמען.",
    };
  }

  const greeting = params.toName?.trim() ? `שלום ${escapeHtml(params.toName.trim())},` : "שלום,";
  const html = wrapEmailHtml(
    `חשבונית ${params.documentNumber}`,
    `
      <p>${greeting}</p>
      <p>מצורפת חשבונית מספר <strong>${escapeHtml(params.documentNumber)}</strong> עבור הזמנה <strong>${escapeHtml(params.orderNumber)}</strong>.</p>
      <p style="margin:12px 0 0;">בברכה,<br />${escapeHtml(BRAND_LEGAL_NAME)}</p>
    `,
    `חשבונית ${params.documentNumber}`,
  );

  const result = await sendEmail({
    to,
    subject: `${BRAND_LEGAL_NAME} — חשבונית ${params.documentNumber}`,
    html,
    attachments: [
      {
        filename: params.filename,
        content: params.pdf,
        contentType: "application/pdf",
      },
    ],
  });
  return {
    ok: result.ok,
    provider: result.provider,
    messageId: result.messageId,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
  };
}
