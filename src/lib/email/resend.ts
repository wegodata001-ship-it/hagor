/**
 * @deprecated Use `@/lib/email/send` (Brevo SMTP). Kept for backward-compatible imports.
 */
import { sendMail } from "@/lib/email/send";
import type { EmailLogType } from "@/lib/email/logger";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendResendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const ok = await sendMail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    type: "generic" as EmailLogType,
  });
  return ok ? { ok: true } : { ok: false, error: "SMTP send failed" };
}
