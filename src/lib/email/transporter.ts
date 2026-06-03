import "server-only";

import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { getEmailConfig, isEmailConfigured } from "@/lib/email/config";

let cached: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

export function getMailTransporter() {
  if (!isEmailConfigured()) return null;
  if (cached) return cached;

  const cfg = getEmailConfig();
  cached = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 15_000,
  } as SMTPTransport.Options);

  return cached;
}
