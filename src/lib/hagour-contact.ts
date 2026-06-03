/** Official HAGOUR contact — single source for phone / WhatsApp / email defaults. */
export const HAGOUR_DEFAULT_PHONE = "054-779-358";
export const HAGOUR_DEFAULT_WHATSAPP = "97254779358";
export const HAGOUR_DEFAULT_SUPPORT_EMAIL = "hagourbywael@gmail.com";

/** Support + system mail inbox (CONTACT_RECEIVER_EMAIL in .env). */
export function getHagourSupportEmail(): string {
  return (
    process.env.CONTACT_RECEIVER_EMAIL?.trim() ||
    process.env.STORE_OWNER_EMAIL?.trim() ||
    HAGOUR_DEFAULT_SUPPORT_EMAIL
  );
}
