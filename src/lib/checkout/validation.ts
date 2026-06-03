import { z } from "zod";
import {
  INVALID_CUSTOMER_DETAILS,
  isCustomerDetailsValid,
  isValidEmail,
  isValidIsraeliPhone,
  validateCustomerFields,
  type CustomerFieldErrors,
} from "./customer-validation";

export { INVALID_CUSTOMER_DETAILS, isValidEmail, isValidIsraeliPhone, validateCustomerFields };
export type { CustomerFieldErrors };

const selectedOptionsSchema = z.unknown().optional().nullable();

export const checkoutBodySchema = z.object({
  customerName: z.string().trim().min(1, "שם מלא חובה"),
  customerEmail: z.string().trim().min(1, "אימייל חובה"),
  customerPhone: z.string().trim().min(1, "טלפון חובה"),
  deliveryOptionId: z.string().trim().min(1, "יש לבחור אופן משלוח"),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  couponCode: z.string().trim().optional(),
  redeemPoints: z.coerce.number().int().min(0).optional(),
  acceptedTerms: z.literal(true, { message: "יש לאשר את תקנון האתר" }),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.coerce.number().int().positive(),
        optionIds: z.array(z.string()).optional(),
        selectedOptions: selectedOptionsSchema,
      }),
    )
    .min(1, "העגלה ריקה"),
});

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;

const FIELD_MESSAGES_HE: Record<string, string> = {
  customerName: "יש למלא שם מלא.",
  customerPhone: "יש למלא מספר טלפון.",
  customerEmail: "נא להזין כתובת אימייל תקינה",
  deliveryOptionId: "יש לבחור אופן משלוח.",
  city: "יש למלא עיר.",
  address: "יש למלא כתובת למשלוח.",
  items: "העגלה ריקה — הוסיפו מוצרים לפני התשלום.",
  acceptedTerms: "יש לאשר את תקנון האתר.",
};

const FIELD_MESSAGES_AR: Record<string, string> = {
  customerName: "يرجى إدخال الاسم الكامل.",
  customerPhone: "يرجى إدخال رقم الهاتف.",
  customerEmail: "يرجى إدخال بريد إلكتروني صحيح",
  deliveryOptionId: "يرجى اختيار طريقة الشحن.",
  city: "يرجى إدخال المدينة.",
  address: "يرجى إدخال عنوان الشحن.",
  items: "السلة فارغة — أضيفوا منتجات قبل الدفع.",
  acceptedTerms: "يجب الموافقة على شروط الموقع.",
};

const GENERIC_HE =
  "חסרים פרטים להשלמת ההזמנה. אנא חזרו לעגלה ובדקו שכל הפרטים מולאו.";
const GENERIC_AR =
  "تنقص بعض التفاصيل لإتمام الطلب. يرجى العودة للسلة والتأكد من تعبئة جميع البيانات.";

export function formatCheckoutValidationError(
  error: z.ZodError,
  locale: "he" | "ar" | "en" = "he",
): string {
  const map = locale === "ar" ? FIELD_MESSAGES_AR : FIELD_MESSAGES_HE;
  const generic = locale === "ar" ? GENERIC_AR : GENERIC_HE;

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (map[key]) return map[key];
    if (issue.message && locale === "he" && /[\u0590-\u05FF]/.test(issue.message)) {
      return issue.message;
    }
  }
  return generic;
}

/** Server-side email + phone validation (required after Zod shape check). */
export function validateCheckoutCustomerDetails(
  body: Pick<CheckoutBody, "customerName" | "customerEmail" | "customerPhone">,
  locale: "he" | "ar" | "en" = "he",
): { ok: true } | { ok: false; fieldErrors: CustomerFieldErrors } {
  if (!isCustomerDetailsValid(body)) {
    return { ok: false, fieldErrors: validateCustomerFields(body, locale).errors };
  }
  return { ok: true };
}

export function formatShippingAddress(city: string | undefined, address: string | undefined): string {
  const c = city?.trim() ?? "";
  const a = address?.trim() ?? "";
  if (c && a) return `${c}, ${a}`;
  return a || c || "";
}
