export const INVALID_CUSTOMER_DETAILS = "INVALID_CUSTOMER_DETAILS" as const;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function isValidEmail(email: string): boolean {
  const v = email.trim();
  return v.length > 0 && emailRegex.test(v);
}

export function isValidIsraeliPhone(phone: string): boolean {
  const p = normalizePhone(phone);
  return /^05\d{8}$/.test(p) || /^\+9725\d{8}$/.test(p) || /^9725\d{8}$/.test(p);
}

export type CustomerField = "customerName" | "customerEmail" | "customerPhone";

export type CustomerValidationMessages = {
  emailInvalid: string;
  phoneInvalid: string;
  nameRequired: string;
};

const MESSAGES: Record<"he" | "ar" | "en", CustomerValidationMessages> = {
  he: {
    emailInvalid: "נא להזין כתובת אימייל תקינה",
    phoneInvalid: "נא להזין מספר טלפון ישראלי תקין",
    nameRequired: "יש למלא שם מלא",
  },
  ar: {
    emailInvalid: "يرجى إدخال بريد إلكتروني صحيح",
    phoneInvalid: "يرجى إدخال رقم هاتف إسرائيلي صحيح",
    nameRequired: "يرجى إدخال الاسم الكامل",
  },
  en: {
    emailInvalid: "Please enter a valid email address",
    phoneInvalid: "Please enter a valid Israeli phone number",
    nameRequired: "Full name is required",
  },
};

export function getCustomerValidationMessages(locale: "he" | "ar" | "en" = "he"): CustomerValidationMessages {
  return MESSAGES[locale];
}

export type CustomerFieldErrors = Partial<Record<CustomerField, string>>;

export function validateCustomerFields(
  input: { customerName: string; customerEmail: string; customerPhone: string },
  locale: "he" | "ar" | "en" = "he",
): { valid: boolean; errors: CustomerFieldErrors } {
  const msg = getCustomerValidationMessages(locale);
  const errors: CustomerFieldErrors = {};

  if (!input.customerName.trim()) {
    errors.customerName = msg.nameRequired;
  }
  if (!isValidEmail(input.customerEmail)) {
    errors.customerEmail = msg.emailInvalid;
  }
  if (!isValidIsraeliPhone(input.customerPhone)) {
    errors.customerPhone = msg.phoneInvalid;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function isCustomerDetailsValid(
  input: { customerName: string; customerEmail: string; customerPhone: string },
): boolean {
  return validateCustomerFields(input).valid;
}
