import { BRAND_LEGAL_NAME } from "@/lib/brand";
import {
  getHagourSupportEmail,
  HAGOUR_DEFAULT_PHONE,
  HAGOUR_DEFAULT_SUPPORT_EMAIL,
} from "@/lib/hagour-contact";

/** Legal merchant details — visible in site footer for payment-provider compliance. */
export const MERCHANT_LEGAL_NAME = BRAND_LEGAL_NAME;

export const MERCHANT_ADDRESS = "עין מאהל, ישראל";

export const MERCHANT_PHONE = HAGOUR_DEFAULT_PHONE;

/** Official inbox; prefers CONTACT_RECEIVER_EMAIL from env. */
export function merchantEmail(): string {
  return getHagourSupportEmail();
}

export const MERCHANT_EMAIL = HAGOUR_DEFAULT_SUPPORT_EMAIL;

export function merchantTelHref(): string {
  const digits = MERCHANT_PHONE.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
  return `tel:+${intl}`;
}

export function merchantMailtoHref(): string {
  return `mailto:${merchantEmail()}`;
}
