import { SITE_NAME, STORE_PHONE, WHATSAPP_PHONE } from "@/lib/store";

export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function formatTelHref(phone: string): string {
  const d = digitsOnly(phone);
  if (!d) return "";
  return `tel:+${d.startsWith("0") ? `972${d.slice(1)}` : d}`;
}

export function formatWhatsAppHref(phone: string, text?: string): string {
  const d = digitsOnly(phone);
  if (!d) return "";
  const normalized = d.startsWith("0") ? `972${d.slice(1)}` : d;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${normalized}${q}`;
}

export type StoreContact = {
  siteName: string;
  storePhone: string;
  whatsappPhone: string;
  telHref: string;
  whatsappHref: string;
};

export function getStoreContact(overrides?: Partial<StoreContact>): StoreContact {
  const storePhone = overrides?.storePhone ?? STORE_PHONE;
  const whatsappPhone = overrides?.whatsappPhone ?? WHATSAPP_PHONE;
  return {
    siteName: overrides?.siteName ?? SITE_NAME,
    storePhone,
    whatsappPhone,
    telHref: formatTelHref(storePhone),
    whatsappHref: formatWhatsAppHref(whatsappPhone, `שלום ${SITE_NAME}`),
  };
}
