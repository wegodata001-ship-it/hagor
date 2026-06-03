import "server-only";

import { getAppUrl } from "@/lib/app-url";
import { SITE_NAME } from "@/lib/store";

const ACCENT = "#c89211";
const BG = "#0b0b0b";
const CARD = "#111111";
const MUTED = "#94a3b8";
const FOOTER_LINE = "HAGOUR Tactical Equipment";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:${MUTED};font-size:13px;width:120px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#f1f5f9;font-size:14px;font-weight:600;">${value}</td>
  </tr>`;
}

export function wrapEmailHtml(title: string, bodyHtml: string, preheader?: string): string {
  const storeName = SITE_NAME || "HAGOUR";
  const pre = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#e2e8f0;">
${pre}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${CARD};border-radius:16px;border:1px solid #27272a;overflow:hidden;">
<tr><td style="padding:24px 28px;background:linear-gradient(135deg,#1a1a1a 0%,#0b0b0b 100%);border-bottom:2px solid ${ACCENT};">
<div style="font-size:11px;letter-spacing:0.2em;color:${ACCENT};font-weight:800;">HAGOUR</div>
<div style="margin-top:8px;font-size:22px;font-weight:800;color:#fff;">${escapeHtml(title)}</div>
</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.65;color:#d4d4d8;">${bodyHtml}</td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid #27272a;font-size:12px;color:${MUTED};text-align:center;">
© ${new Date().getFullYear()} ${escapeHtml(storeName)}<br/>
<span style="margin-top:6px;display:inline-block;">${FOOTER_LINE}</span><br/>
<a href="${escapeHtml(getAppUrl())}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(getAppUrl())}</a>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin:12px 0;padding:12px 22px;background:${ACCENT};color:#0b0b0b;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">${escapeHtml(label)}</a>`;
}
