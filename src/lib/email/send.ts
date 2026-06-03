import "server-only";

import { getEmailConfig, isEmailConfigured } from "@/lib/email/config";
import { logEmailFailure, logEmailSkipped, logEmailSuccess, type EmailLogType } from "@/lib/email/logger";
import { getMailTransporter } from "@/lib/email/transporter";

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  type: EmailLogType;
}): Promise<boolean> {
  const to = opts.to.trim();
  if (!to) {
    logEmailSkipped(opts.type, "empty_recipient");
    return false;
  }
  if (!isEmailConfigured()) {
    logEmailSkipped(opts.type, "smtp_not_configured");
    return false;
  }
  const transporter = getMailTransporter();
  if (!transporter) {
    logEmailSkipped(opts.type, "transporter_unavailable");
    return false;
  }

  const cfg = getEmailConfig();
  try {
    await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
      to,
      subject: opts.subject,
      html: opts.html,
    });
    logEmailSuccess(opts.type, to);
    return true;
  } catch (err) {
    logEmailFailure(opts.type, to, err);
    return false;
  }
}
