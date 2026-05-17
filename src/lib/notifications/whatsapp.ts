import { digitsOnly } from "@/lib/contact";

export function buildWhatsAppUrl(phone: string, message: string): string {
  const d = digitsOnly(phone);
  if (!d) return "";
  const normalized = d.startsWith("0") ? `972${d.slice(1)}` : d;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
