import type { Locale } from "@/lib/localized";
import { STORE_PHONE } from "@/lib/store";

/** Official HAGOUR phone (also set via Settings / NEXT_PUBLIC_STORE_PHONE). */
export const HAGOUR_DEFAULT_PHONE = "054-229-8822";

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
    storePhone: settings?.storePhone?.trim() || STORE_PHONE.trim() || HAGOUR_DEFAULT_PHONE,
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
