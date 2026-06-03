import type { Locale } from "@/lib/localized";
import { SUPPORT_EMAIL_TOKEN, STORE_PHONE_TOKEN } from "@/lib/hagour-legal-contact";

export const HAGOUR_PRIVACY_SLUG = "privacy";
export const HAGOUR_PRIVACY_TITLE = "מדיניות פרטיות";

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

export function buildHagourPrivacyHtml(locale: Locale, updatedAt = new Date()): string {
  const updated = formatUpdatedDate(locale, updatedAt);

  if (locale === "ar") {
    return `<p><strong>آخر تحديث:</strong> ${updated}</p>
<h2>سياسة الخصوصية — HAGOUR BY WAEL</h2>
<p>تحترم HAGOUR BY WAEL خصوصية زوار الموقع والعملاء. توضح هذه السياسة كيفية جمع المعلومات واستخدامها وحمايتها.</p>
<h3>1. البيانات التي نجمعها</h3>
<p>عند الطلب أو التسجيل: الاسم، الهاتف، البريد الإلكتروني، عنوان التسليم، تفاصيل الطلب والدفع (عبر شركة التسوية — لا نخزن بيانات بطاقة كاملة على خوادمنا).</p>
<h3>2. أغراض الاستخدام</h3>
<ul><li>تنفيذ الطلبات والتوصيل</li><li>خدمة العملاء</li><li>الامتثال للقانون</li><li>تحسين الموقع والأمان</li></ul>
<h3>3. مشاركة المعلومات</h3>
<p>لا نبيع البيانات. نشاركها فقط مع شركاء التسوية والشحن وخدمة العملاء حسب الحاجة.</p>
<h3>4. أمن المعلومات</h3>
<p>يستخدم الموقع إجراءات أمنية معتادة ونظام تسوية آمن لحماية بيانات العملاء.</p>
<h3>5. حقوقك</h3>
<p>يمكنك طلب الوصول أو التصحيح أو الحذف وفق القانون المعمول به.</p>
<h3>6. اتصل بنا</h3>
<p><strong>HAGOUR BY WAEL</strong><br/>هاتف: ${STORE_PHONE_TOKEN}<br/>بريد: ${SUPPORT_EMAIL_TOKEN}</p>`;
  }

  if (locale === "en") {
    return `<p><strong>Last updated:</strong> ${updated}</p>
<h2>Privacy Policy — HAGOUR BY WAEL</h2>
<p>HAGOUR BY WAEL respects the privacy of website visitors and customers. This policy explains how we collect, use and protect information.</p>
<h3>1. Data we collect</h3>
<p>When you order or register: name, phone, email, delivery address, order details. Card data is processed by the payment provider — we do not store full card numbers on our servers.</p>
<h3>2. How we use data</h3>
<ul><li>Fulfilling orders and delivery</li><li>Customer service</li><li>Legal compliance</li><li>Site security and improvement</li></ul>
<h3>3. Sharing</h3>
<p>We do not sell personal data. We share it only with payment, shipping and support partners as needed.</p>
<h3>4. Security</h3>
<p>The site uses standard security measures and a secure payment gateway to protect customer information.</p>
<h3>5. Your rights</h3>
<p>You may request access, correction or deletion as required by applicable law.</p>
<h3>6. Contact</h3>
<p><strong>HAGOUR BY WAEL</strong><br/>Phone: ${STORE_PHONE_TOKEN}<br/>Email: ${SUPPORT_EMAIL_TOKEN}</p>`;
  }

  return `<p><strong>עודכן לאחרונה:</strong> ${updated}</p>
<h2>מדיניות פרטיות — HAGOUR BY WAEL</h2>
<p>HAGOUR BY WAEL מכבדת את פרטיות הגולשים והלקוחות. מסמך זה מסביר כיצד נאספים, נעשים שימוש ומוגנים המידע האישי.</p>
<h3>1. מידע שנאסף</h3>
<p>בעת הזמנה או הרשמה: שם, טלפון, דוא&quot;ל, כתובת למשלוח, פרטי הזמנה. פרטי אשראי מעובדים דרך חברת הסליקה — איננו שומרים מספר כרטיס מלא בשרתים שלנו.</p>
<h3>2. שימוש במידע</h3>
<ul><li>ביצוע הזמנות ומשלוחים</li><li>שירות לקוחות</li><li>עמידה בדרישות החוק</li><li>אבטחת האתר ושיפור השירות</li></ul>
<h3>3. העברת מידע לצדדים שלישיים</h3>
<p>איננו מוכרים מידע אישי. המידע מועבר רק לצורכי סליקה, משלוח ושירות לקוחות.</p>
<h3>4. אבטחת מידע</h3>
<p>האתר משתמש באמצעי אבטחה מקובלים ובמערכת סליקה מאובטחת לצורך הגנה על פרטי הלקוחות.</p>
<h3>5. זכויותיך</h3>
<p>ניתן לפנות בבקשה לעיון, תיקון או מחיקת מידע בהתאם לחוק החל.</p>
<h3>6. יצירת קשר</h3>
<p><strong>HAGOUR BY WAEL</strong><br/>טלפון: ${STORE_PHONE_TOKEN}<br/>דוא&quot;ל: ${SUPPORT_EMAIL_TOKEN}</p>`;
}

export function defaultHagourPrivacyContent(updatedAt = new Date()) {
  return {
    title: HAGOUR_PRIVACY_TITLE,
    contentHe: buildHagourPrivacyHtml("he", updatedAt),
    contentEn: buildHagourPrivacyHtml("en", updatedAt),
    contentAr: buildHagourPrivacyHtml("ar", updatedAt),
  };
}
