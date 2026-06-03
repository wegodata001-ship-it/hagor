import "server-only";

import { BRAND_LEGAL_NAME } from "@/lib/brand";

export function getEmailConfig() {
  return {
    host: process.env.SMTP_HOST?.trim() || "smtp-relay.brevo.com",
    port: Number(process.env.SMTP_PORT?.trim() || "587"),
    user: process.env.SMTP_USER?.trim() || "",
    pass: process.env.SMTP_PASS?.trim() || "",
    fromName: process.env.EMAIL_FROM_NAME?.trim() || BRAND_LEGAL_NAME,
    fromAddress: process.env.EMAIL_FROM_ADDRESS?.trim() || "",
    contactReceiver:
      process.env.CONTACT_RECEIVER_EMAIL?.trim() ||
      process.env.STORE_OWNER_EMAIL?.trim() ||
      "",
  };
}

export function isEmailConfigured(): boolean {
  const c = getEmailConfig();
  return Boolean(c.user && c.pass && c.fromAddress);
}
