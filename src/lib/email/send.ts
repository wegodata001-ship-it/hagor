import "server-only";

import type { Attachment } from "nodemailer/lib/mailer";
import { getEmailConfig, isEmailConfigured } from "@/lib/email/config";
import { logEmailFailure, logEmailSkipped, logEmailSuccess, type EmailLogType } from "@/lib/email/logger";
import { getMailTransporter } from "@/lib/email/transporter";

/**
 * Provider-agnostic email send.
 *
 * Provider selection is *not* automatic in the sense of silently switching —
 * the store owner controls it explicitly via env vars:
 *   1. If `RESEND_API_KEY` is set   → use Resend (HTTPS, simplest to enable).
 *   2. Else if SMTP is configured  → use nodemailer/SMTP (default legacy path).
 *   3. Else                        → return `EMAIL_NOT_CONFIGURED`.
 *
 * We never fake success: this function only returns `{ ok: true }` when the
 * upstream provider responded with an accepted queue/message-id. `accepted`
 * is not the same as `delivered` — see §4/§15 in the spec.
 */

export type EmailSendResult = {
  ok: boolean;
  /** Which provider handled (or refused to handle) the request. */
  provider: EmailProvider;
  /** Provider-side identifier (SMTP messageId, Resend id). */
  messageId?: string;
  /** Machine-readable failure code. Present only when `ok === false`. */
  errorCode?: EmailErrorCode;
  /** Human-readable, redacted message safe for admin UI display. */
  errorMessage?: string;
};

export type EmailProvider = "smtp" | "resend" | "none";

export type EmailErrorCode =
  | "EMAIL_NOT_CONFIGURED"
  | "MISSING_RECIPIENT"
  | "PROVIDER_REJECTED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_ERROR"
  | "ATTACHMENT_TOO_LARGE";

export type EmailAttachment = {
  filename: string;
  /** Buffer / Uint8Array — will be base64-encoded for HTTPS providers. */
  content: Uint8Array;
  contentType: string;
};

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

/** Reports the exact provider + missing envs — used by the diagnostics endpoint. */
export function describeEmailProvider(): {
  provider: EmailProvider;
  configured: boolean;
  missing: string[];
  fromAddress?: string;
  fromName?: string;
} {
  const cfg = getEmailConfig();
  if (process.env.RESEND_API_KEY?.trim()) {
    const missing: string[] = [];
    if (!cfg.fromAddress) missing.push("EMAIL_FROM_ADDRESS");
    return {
      provider: "resend",
      configured: missing.length === 0,
      missing,
      fromAddress: cfg.fromAddress || undefined,
      fromName: cfg.fromName,
    };
  }
  if (isEmailConfigured()) {
    return {
      provider: "smtp",
      configured: true,
      missing: [],
      fromAddress: cfg.fromAddress,
      fromName: cfg.fromName,
    };
  }
  // No provider configured — enumerate what's missing so operators can fix it.
  const missing: string[] = [];
  if (!process.env.SMTP_USER?.trim()) missing.push("SMTP_USER");
  if (!process.env.SMTP_PASS?.trim()) missing.push("SMTP_PASS");
  if (!process.env.EMAIL_FROM_ADDRESS?.trim()) missing.push("EMAIL_FROM_ADDRESS");
  // Resend alternative that would also make everything work.
  return {
    provider: "none",
    configured: false,
    missing,
    fromAddress: cfg.fromAddress || undefined,
    fromName: cfg.fromName,
  };
}

export async function sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
  const to = params.to.trim();
  if (!to) {
    return {
      ok: false,
      provider: "none",
      errorCode: "MISSING_RECIPIENT",
      errorMessage: "לא צוין נמען.",
    };
  }

  if (process.env.RESEND_API_KEY?.trim()) {
    return sendWithResend(params);
  }
  if (isEmailConfigured()) {
    return sendWithSmtp(params);
  }
  const desc = describeEmailProvider();
  return {
    ok: false,
    provider: "none",
    errorCode: "EMAIL_NOT_CONFIGURED",
    errorMessage: desc.missing.length
      ? `שירות המייל אינו מוגדר בשרת (חסרים: ${desc.missing.join(", ")}).`
      : "שירות המייל אינו מוגדר בשרת.",
  };
}

// ─── SMTP (nodemailer) ────────────────────────────────────────────────────
async function sendWithSmtp(params: SendEmailParams): Promise<EmailSendResult> {
  const transporter = getMailTransporter();
  if (!transporter) {
    return {
      ok: false,
      provider: "smtp",
      errorCode: "EMAIL_NOT_CONFIGURED",
      errorMessage: "לא הצלחנו להקים חיבור SMTP. יש לבדוק את פרטי החיבור.",
    };
  }
  const cfg = getEmailConfig();
  const nodemailerAttachments: Attachment[] | undefined = params.attachments?.map((a) => ({
    filename: a.filename,
    content: Buffer.from(a.content),
    contentType: a.contentType,
  }));
  try {
    const info = await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      attachments: nodemailerAttachments,
    });
    // nodemailer's SMTPTransport returns `rejected`/`accepted` arrays; both being empty
    // is unusual but treat any content in `rejected` as failure.
    const rejected = Array.isArray(info.rejected) ? info.rejected : [];
    if (rejected.length > 0) {
      return {
        ok: false,
        provider: "smtp",
        messageId: info.messageId,
        errorCode: "PROVIDER_REJECTED",
        errorMessage: `הספק דחה את הכתובת: ${rejected.join(", ").slice(0, 200)}`,
      };
    }
    return { ok: true, provider: "smtp", messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const timeout = /ETIMEDOUT|timeout|ESOCKET/i.test(message);
    return {
      ok: false,
      provider: "smtp",
      errorCode: timeout ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
      errorMessage: `SMTP: ${message.slice(0, 200)}`,
    };
  }
}

// ─── Resend (HTTPS) ───────────────────────────────────────────────────────
async function sendWithResend(params: SendEmailParams): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const cfg = getEmailConfig();
  if (!apiKey || !cfg.fromAddress) {
    return {
      ok: false,
      provider: "resend",
      errorCode: "EMAIL_NOT_CONFIGURED",
      errorMessage: "Resend מוגדר חלקית — יש להגדיר גם EMAIL_FROM_ADDRESS.",
    };
  }
  const attachments = params.attachments?.map((a) => ({
    filename: a.filename,
    content: Buffer.from(a.content).toString("base64"),
    content_type: a.contentType,
  }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: cfg.fromName ? `${cfg.fromName} <${cfg.fromAddress}>` : cfg.fromAddress,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo,
        attachments,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") {
      return {
        ok: false,
        provider: "resend",
        errorCode: "PROVIDER_TIMEOUT",
        errorMessage: "Resend timed out.",
      };
    }
    return {
      ok: false,
      provider: "resend",
      errorCode: "PROVIDER_ERROR",
      errorMessage: `Resend: ${(err as Error).message.slice(0, 200)}`,
    };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    // 413 = payload too large; 422 = validation error (bad recipient/from); 429 = rate limit.
    const code: EmailErrorCode =
      response.status === 413
        ? "ATTACHMENT_TOO_LARGE"
        : response.status === 422
          ? "PROVIDER_REJECTED"
          : "PROVIDER_ERROR";
    return {
      ok: false,
      provider: "resend",
      errorCode: code,
      errorMessage: `Resend HTTP ${response.status}: ${body.slice(0, 200)}`,
    };
  }

  const data = (await response.json()) as { id?: string };
  return { ok: true, provider: "resend", messageId: data.id };
}

// ─── Back-compat wrapper (legacy `sendMail`) ─────────────────────────────
//
// Older callers (order confirmations, admin resend, etc.) still import
// `sendMail(...) → Promise<boolean>` from this module. We keep the API stable
// but funnel everything through the new provider-aware `sendEmail` so:
//  - Errors are surfaced consistently.
//  - Resend is available to legacy paths, too.
//  - Structured logging remains intact.
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  type: EmailLogType;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}): Promise<boolean> {
  const result = await sendEmail({
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    replyTo: opts.replyTo,
    attachments: opts.attachments,
  });
  if (!result.ok) {
    if (result.errorCode === "EMAIL_NOT_CONFIGURED") {
      logEmailSkipped(opts.type, "smtp_not_configured");
    } else if (result.errorCode === "MISSING_RECIPIENT") {
      logEmailSkipped(opts.type, "empty_recipient");
    } else {
      logEmailFailure(opts.type, opts.to, result.errorMessage ?? result.errorCode ?? "send_failed");
    }
    return false;
  }
  logEmailSuccess(opts.type, opts.to);
  return true;
}
