import type { Locale } from "@/lib/localized";
import { SUPPORT_EMAIL_TOKEN, STORE_PHONE_TOKEN } from "@/lib/hagour-legal-contact";

export const HAGOUR_REFUNDS_SLUG = "refunds";
export const HAGOUR_REFUNDS_TITLE = "ביטולים והחזרים";

function formatUpdatedDate(locale: Locale, date = new Date()): string {
  try {
    return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : locale === "ar" ? "ar" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function buildHagourRefundsHtml(locale: Locale, updatedAt = new Date()): string {
  const updated = formatUpdatedDate(locale, updatedAt);

  if (locale === "ar") {
    return `<p><strong>آخر تحديث:</strong> ${updated}</p>
<h2>الإلغاء والاسترداد — HAGOUR</h2>
<h3>1. إلغاء الصفقة</h3>
<p>يحق للعميل إلغاء الصفقة وفق قانون حماية المستهلك. تُرسل الطلبات كتابياً إلى HAGOUR.</p>
<p>رسوم الإلغاء: <strong>5%</strong> من قيمة المعاملة أو <strong>100 ₪</strong> — أيهما أقل.</p>
<h3>2. الإرجاع</h3>
<p>يمكن إرجاع منتج جديد وغير مستخدم في عبوته الأصلية خلال <strong>14 يوماً</strong> من الاستلام، وفق قانون حماية المستهلك.</p>
<h3>3. استثناءات</h3>
<p>لا يُقبل الإرجاع: منتجات مخصصة، مستخدمة، أو تالفة بعد التسليم للعميل.</p>
<h3>4. استرداد مالي</h3>
<p>بعد فحص المنتج والموافقة، يُسترد المبلغ بنفس وسيلة الدفع.</p>
<h3>5. اتصل بنا</h3>
<p><strong>HAGOUR</strong><br/>هاتف: ${STORE_PHONE_TOKEN}<br/>بريد: ${SUPPORT_EMAIL_TOKEN}</p>`;
  }

  if (locale === "en") {
    return `<p><strong>Last updated:</strong> ${updated}</p>
<h2>Cancellations &amp; refunds — HAGOUR</h2>
<h3>1. Cancellation</h3>
<p>Customers may cancel a transaction under applicable consumer protection law. Requests must be sent in writing to HAGOUR.</p>
<p>Cancellation fee: <strong>5%</strong> of the transaction value or <strong>₪100</strong> — whichever is lower.</p>
<h3>2. Returns</h3>
<p>Products may be returned if new, unused and in original packaging within <strong>14 days</strong> of receipt, under consumer protection law.</p>
<h3>3. Exclusions</h3>
<p>Not returnable: custom-made products, used products, or products damaged after delivery.</p>
<h3>4. Refund</h3>
<p>After inspection and approval, refunds are made via the original payment method.</p>
<h3>5. Contact</h3>
<p><strong>HAGOUR</strong><br/>Phone: ${STORE_PHONE_TOKEN}<br/>Email: ${SUPPORT_EMAIL_TOKEN}</p>`;
  }

  return `<p><strong>עודכן לאחרונה:</strong> ${updated}</p>
<h2>ביטולים והחזרים — HAGOUR</h2>
<h3>1. ביטול עסקה</h3>
<p>לקוח רשאי לבטל עסקה בהתאם לחוק הגנת הצרכן. בקשת ביטול תישלח בכתב ל־HAGOUR.</p>
<p>דמי ביטול: <strong>5%</strong> מערך העסקה או <strong>100 ₪</strong> — לפי הנמוך מביניהם.</p>
<h3>2. החזרת מוצרים</h3>
<p>ניתן להחזיר מוצר חדש, שלא נעשה בו שימוש, באריזתו המקורית, בתוך <strong>14 יום</strong> מקבלת המוצר, בהתאם לחוק הגנת הצרכן.</p>
<h3>3. מוצרים שאינם ניתנים להחזרה</h3>
<p>לא ניתן להחזיר: מוצר שיוצר בהתאמה אישית, מוצר שנעשה בו שימוש, או מוצר שנפגם לאחר מסירתו ללקוח.</p>
<h3>4. החזר כספי</h3>
<p>לאחר בדיקת המוצר ואישור ההחזרה, ההחזר יבוצע באמצעי התשלום המקורי.</p>
<h3>5. יצירת קשר</h3>
<p><strong>HAGOUR</strong><br/>טלפון: ${STORE_PHONE_TOKEN}<br/>דוא&quot;ל: ${SUPPORT_EMAIL_TOKEN}</p>`;
}

export function defaultHagourRefundsContent(updatedAt = new Date()) {
  return {
    title: HAGOUR_REFUNDS_TITLE,
    contentHe: buildHagourRefundsHtml("he", updatedAt),
    contentEn: buildHagourRefundsHtml("en", updatedAt),
    contentAr: buildHagourRefundsHtml("ar", updatedAt),
  };
}
