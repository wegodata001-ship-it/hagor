import type { Locale } from "@/lib/localized";
import { HAGOUR_DEFAULT_PHONE } from "@/lib/hagour-contact";

export { HAGOUR_DEFAULT_PHONE } from "@/lib/hagour-contact";

export const SUPPORT_EMAIL_TOKEN = "{{SUPPORT_EMAIL}}";
export const STORE_PHONE_TOKEN = "{{STORE_PHONE}}";

export type HagourLegalContact = {
  storePhone: string;
  supportEmail: string | null;
};

const emailFallback: Record<Locale, string> = {
  he: "כתובת הדוא\"ל הרשמית מופיעה באתר ובהגדרות החנות (Settings).",
  ar: "يظهر البريد الرسمي على الموقع وفي إعدادات المتجر.",
  en: "The official email is shown on the site and in store Settings.",
};

export function resolveHagourLegalContact(settings?: {
  storePhone?: string | null;
  supportEmail?: string | null;
}): HagourLegalContact {
  return {
    storePhone: settings?.storePhone?.trim() || HAGOUR_DEFAULT_PHONE,
    supportEmail: settings?.supportEmail?.trim() || null,
  };
}

export function applyHagourLegalContactTokens(
  html: string,
  contact: HagourLegalContact,
  locale: Locale,
): string {
  const emailDisplay = contact.supportEmail
    ? `<a href="mailto:${contact.supportEmail}">${contact.supportEmail}</a>`
    : emailFallback[locale];

  return html
    .split(SUPPORT_EMAIL_TOKEN)
    .join(emailDisplay)
    .split(STORE_PHONE_TOKEN)
    .join(contact.storePhone);
}
