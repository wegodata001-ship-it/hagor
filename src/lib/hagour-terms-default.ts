import type { Locale } from "@/lib/localized";
import { STORE_PHONE_TOKEN, SUPPORT_EMAIL_TOKEN } from "@/lib/hagour-legal-contact";

export const HAGOUR_TERMS_SLUG = "terms";
export const HAGOUR_TERMS_TITLE = "תקנון";

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

function sectionTitles(locale: Locale) {
  const t = {
    he: {
      updated: "עודכן לאחרונה",
      h1: "תקנון אתר HAGOUR BY WAEL",
      s1: "1. כללי",
      s2: "2. פרטי העסק",
      s3: "3. מחירים",
      s4: "4. תהליך רכישה והזמנות",
      s5: "5. משלוחים",
      s6: "6. משלוח חינם",
      s7: "7. ביטול עסקה",
      s8: "8. החזרות",
      s9: "9. מוצרים שאינם ניתנים להחזרה",
      s10: "10. החזר כספי",
      s11: "11. מוצרים עם מידות",
      s12: "12. מוצרים עם התאמות",
      s13: "13. אחריות",
      s14: "14. פרטיות",
      s15: "15. אבטחת מידע",
      s16: "16. קניין רוחני",
      s17: "17. סמכות שיפוט",
    },
    ar: {
      updated: "آخر تحديث",
      h1: "شروط موقع HAGOUR BY WAEL",
      s1: "1. عام",
      s2: "2. بيانات العمل",
      s3: "3. الأسعار",
      s4: "4. الشراء والطلبات",
      s5: "5. الشحن",
      s6: "6. شحن مجاني",
      s7: "7. إلغاء الصفقة",
      s8: "8. الإرجاع",
      s9: "9. منتجات غير قابلة للإرجاع",
      s10: "10. استرداد مالي",
      s11: "11. منتجات بمقاسات",
      s12: "12. منتجات بخيارات",
      s13: "13. الضمان",
      s14: "14. الخصوصية",
      s15: "15. أمن المعلومات",
      s16: "16. الملكية الفكرية",
      s17: "17. الاختصاص القضائي",
    },
    en: {
      updated: "Last updated",
      h1: "HAGOUR BY WAEL Website Terms",
      s1: "1. General",
      s2: "2. Business details",
      s3: "3. Prices",
      s4: "4. Purchasing & orders",
      s5: "5. Shipping",
      s6: "6. Free shipping",
      s7: "7. Cancellation",
      s8: "8. Returns",
      s9: "9. Non-returnable products",
      s10: "10. Refunds",
      s11: "11. Sized products",
      s12: "12. Configurable products",
      s13: "13. Warranty",
      s14: "14. Privacy",
      s15: "15. Information security",
      s16: "16. Intellectual property",
      s17: "17. Governing law",
    },
  };
  return t[locale];
}

/** Default HAGOUR BY WAEL terms HTML per language — seed, admin restore, fallback. */
export function buildHagourTermsHtml(locale: Locale, updatedAt = new Date()): string {
  const s = sectionTitles(locale);
  const updated = formatUpdatedDate(locale, updatedAt);

  if (locale === "ar") {
    return `<p><strong>${s.updated}:</strong> ${updated}</p>
<h2>${s.h1}</h2>
<h3>${s.s1}</h3>
<p>مرحباً بكم في موقع HAGOUR BY WAEL. يخضع استخدام الموقع والشراء لشروط هذا التنظيم. بإتمام الشراء تؤكد قراءتك والموافقة.</p>
<h3>${s.s2}</h3>
<p><strong>اسم العمل:</strong> HAGOUR BY WAEL</p>
<p><strong>هاتف:</strong> ${STORE_PHONE_TOKEN}</p>
<p><strong>بريد:</strong> ${SUPPORT_EMAIL_TOKEN}</p>
<p>الموقع مخصص لبيع: أحزمة، جرابات مسدس، جرابات سلاح، حقائب وإكسسوارات.</p>
<h3>${s.s3}</h3>
<p>جميع الأسعار بالشيكل وتشمل ضريبة القيمة المضافة حيث ينطبق القانون. يحق لـ HAGOUR BY WAEL تحديث الأسعار.</p>
<h3>${s.s4}</h3>
<p>يُعتبر الطلب مؤكداً <strong>بعد استلام موافقة شركة التسوية</strong>. يعمل الموقع بتسوية إلكترونية آمنة. يحق للمتجر إلغاء الطلب عند خطأ في السعر أو المخزون أو الاشتباه باستخدام غير مشروع.</p>
<h3>${s.s5}</h3>
<p>مدة التسليم: حتى <strong>14 يوم عمل</strong>. أيام العمل: الأحد–الخميس. لا تشمل: الجمعة، السبت، العطل وعشية العطل. قد تحدث تأخيرات استثنائية.</p>
<h3>${s.s6}</h3>
<p>إذا وُجد عرض شحن مجاني — يُطبق وفق الحد الأدنى المعروض وقت الشراء.</p>
<h3>${s.s7}</h3>
<p>يحق للعميل إلغاء الصفقة وفق قانون حماية المستهلك. رسوم الإلغاء: <strong>5%</strong> أو <strong>100 ₪</strong> — أيهما أقل. الطلب كتابياً.</p>
<h3>${s.s8}</h3>
<p>إرجاع منتج جديد وغير مستخدم في عبوته الأصلية خلال <strong>14 يوماً</strong> وفق قانون حماية المستهلك.</p>
<h3>${s.s9}</h3>
<p>لا يُقبل الإرجاع: منتجات مخصصة، مستخدمة، أو تالفة بعد التسليم للعميل.</p>
<h3>${s.s10}</h3>
<p>بعد الفحص والموافقة، يُسترد المبلغ بنفس وسيلة الدفع.</p>
<h3>${s.s11}</h3>
<p>تُباع الأحزمة حسب المقاس المختار. على العميل اختيار مقاس مناسب وفق جدول المقاسات في الموقع.</p>
<h3>${s.s12}</h3>
<p>في بعض المنتجات يمكن اختيار <strong>يمين</strong> أو <strong>يسار</strong>. على العميل اختيار الخيار المناسب.</p>
<h3>${s.s13}</h3>
<p>الضمان لعيوب التصنيع فقط — لا يشمل سوء الاستخدام أو البلى أو الضرر من المستخدم.</p>
<h3>${s.s14}</h3>
<p>راجع <a href="/privacy">سياسة الخصوصية</a>. لا نبيع البيانات؛ نشاركها للتسوية والشحن والدعم فقط.</p>
<h3>${s.s15}</h3>
<p>يستخدم الموقع إجراءات أمنية معتادة ونظام تسوية آمن لحماية بيانات العملاء.</p>
<h3>${s.s16}</h3>
<p>جميع حقوق الموقع لـ HAGOUR BY WAEL. يُحظر النسخ دون إذن.</p>
<h3>${s.s17}</h3>
<p>تخضع الشروط لقوانين دولة إسرائيل. للإلغاء والاسترداد: <a href="/refunds">سياسة الإرجاع</a>.</p>`;
  }

  if (locale === "en") {
    return `<p><strong>${s.updated}:</strong> ${updated}</p>
<h2>${s.h1}</h2>
<h3>${s.s1}</h3>
<p>Welcome to the HAGOUR BY WAEL website. Use of the site and purchases are subject to these terms. By completing a purchase you confirm that you have read and agreed to them.</p>
<h3>${s.s2}</h3>
<p><strong>Business name:</strong> HAGOUR BY WAEL</p>
<p><strong>Phone:</strong> ${STORE_PHONE_TOKEN}</p>
<p><strong>Email:</strong> ${SUPPORT_EMAIL_TOKEN}</p>
<p>The site sells: belts, pistol holsters, weapon holsters, bags and accessories.</p>
<h3>${s.s3}</h3>
<p>All prices are in Israeli Shekels (ILS) and include VAT where required by law. HAGOUR BY WAEL may update prices at any time.</p>
<h3>${s.s4}</h3>
<p>An order is considered confirmed <strong>after approval from the payment provider</strong>. The site uses secure online payment. The store may cancel orders due to pricing or stock errors or suspected misuse.</p>
<h3>${s.s5}</h3>
<p>Delivery time: up to <strong>14 business days</strong>. Business days: Sunday–Thursday. Excludes: Friday, Saturday, holidays and holiday eves. Exceptional delays may occur.</p>
<h3>${s.s6}</h3>
<p>Where free shipping is offered, it applies according to the minimum amount shown at checkout.</p>
<h3>${s.s7}</h3>
<p>Customers may cancel under consumer protection law. Cancellation fee: <strong>5%</strong> or <strong>₪100</strong> — whichever is lower. Request in writing.</p>
<h3>${s.s8}</h3>
<p>Products may be returned if new, unused and in original packaging within <strong>14 days</strong> under consumer protection law.</p>
<h3>${s.s9}</h3>
<p>Not returnable: custom-made products, used products, or products damaged after delivery.</p>
<h3>${s.s10}</h3>
<p>After inspection and approval, refunds are made via the original payment method.</p>
<h3>${s.s11}</h3>
<p>Belts are sold in the size selected by the customer. The customer is responsible for choosing a suitable size per the size chart on the site.</p>
<h3>${s.s12}</h3>
<p>Some products allow choosing <strong>right</strong> or <strong>left</strong> side. The customer is responsible for selecting the correct option.</p>
<h3>${s.s13}</h3>
<p>Warranty is limited to manufacturing defects only; not improper use, normal wear or user-caused damage.</p>
<h3>${s.s14}</h3>
<p>See our <a href="/privacy">Privacy policy</a>. We do not sell data; we share it only for payment, shipping and support.</p>
<h3>${s.s15}</h3>
<p>The site uses standard security measures and a secure payment gateway to protect customer information.</p>
<h3>${s.s16}</h3>
<p>All site rights belong to HAGOUR BY WAEL. Content may not be copied without prior permission.</p>
<h3>${s.s17}</h3>
<p>These terms are governed by the laws of the State of Israel. See <a href="/refunds">Cancellations &amp; refunds</a>.</p>`;
  }

  return `<p><strong>${s.updated}:</strong> ${updated}</p>
<h2>${s.h1}</h2>
<h3>${s.s1}</h3>
<p>ברוכים הבאים לאתר HAGOUR BY WAEL. השימוש באתר, רכישת מוצרים וביצוע הזמנות כפופים לתנאי תקנון זה. כל משתמש המבצע רכישה מצהיר כי קרא את התקנון והסכים לתנאיו.</p>
<h3>${s.s2}</h3>
<p><strong>שם העסק:</strong> HAGOUR BY WAEL</p>
<p><strong>טלפון:</strong> ${STORE_PHONE_TOKEN}</p>
<p><strong>דוא&quot;ל:</strong> ${SUPPORT_EMAIL_TOKEN}</p>
<p>האתר משמש למכירת: חגורות, נרתיקים לאקדח, נרתיקים לנשק, תיקים, אביזרים ותוספות.</p>
<h3>${s.s3}</h3>
<p>כל המחירים באתר מוצגים בשקלים חדשים וכוללים מע&quot;מ ככל שנדרש על פי חוק. HAGOUR BY WAEL רשאית לעדכן מחירים בכל עת.</p>
<h3>${s.s4}</h3>
<p><strong>הזמנה תיחשב כמאושרת לאחר קבלת אישור מחברת הסליקה.</strong> הרכישה באתר מתבצעת באמצעות סליקה מקוונת מאובטחת. העסק רשאי לבטל הזמנה במקרה של טעות במחיר, טעות במלאי או חשד לשימוש לא תקין.</p>
<h3>${s.s5}</h3>
<p>זמן אספקה: <strong>עד 14 ימי עסקים</strong> אלא אם צוין אחרת בעמוד המוצר.</p>
<p>ימי עסקים: <strong>א׳–ה׳</strong> (ראשון עד חמישי).</p>
<p>לא כולל: שישי, שבת, חגים וערבי חג. במקרים חריגים ייתכנו עיכובים שאינם בשליטת העסק.</p>
<h3>${s.s6}</h3>
<p>במידה וקיים באתר מבצע משלוח חינם — הוא יחול בהתאם לסכום המינימום המוצג באתר במועד הרכישה.</p>
<h3>${s.s7}</h3>
<p>לקוח רשאי לבטל עסקה בהתאם לחוק הגנת הצרכן. בקשת ביטול תישלח בכתב.</p>
<p>דמי ביטול: <strong>5%</strong> מערך העסקה או <strong>100 ₪</strong> — לפי הנמוך מביניהם.</p>
<h3>${s.s8}</h3>
<p>ניתן להחזיר מוצר בתנאים הבאים: המוצר חדש, לא נעשה בו שימוש, באריזתו המקורית ולא נגרם לו נזק. החזרה תתאפשר בתוך <strong>14 ימים</strong> מקבלת המוצר, בהתאם לחוק הגנת הצרכן.</p>
<h3>${s.s9}</h3>
<p>לא ניתן להחזיר: מוצר שיוצר בהתאמה אישית, מוצר שנעשה בו שימוש, מוצר שנפגם לאחר מסירתו ללקוח.</p>
<h3>${s.s10}</h3>
<p>לאחר בדיקת המוצר ואישור ההחזרה, ההחזר יבוצע באמצעי התשלום המקורי בהתאם לחוק.</p>
<h3>${s.s11}</h3>
<p>חגורות נמכרות לפי המידות הנבחרות על ידי הלקוח. באחריות הלקוח לבחור מידה מתאימה בהתאם לטבלת המידות המוצגת באתר.</p>
<h3>${s.s12}</h3>
<p>בחלק מהמוצרים ניתן לבחור: <strong>צד ימין</strong> או <strong>צד שמאל</strong>. באחריות הלקוח לבחור את האפשרות המתאימה לו.</p>
<h3>${s.s13}</h3>
<p>האחריות מוגבלת לפגמי ייצור בלבד. האחריות אינה חלה על שימוש לא תקין, בלאי טבעי או נזק שנגרם על ידי המשתמש.</p>
<h3>${s.s14}</h3>
<p>פרטים נוספים ב<a href="/privacy">מדיניות הפרטיות</a>. פרטי לקוחות אינם נמכרים ואינם מועברים לצדדים שלישיים למעט לצורכי סליקה, משלוח ושירות לקוחות.</p>
<h3>${s.s15}</h3>
<p>האתר משתמש באמצעי אבטחה מקובלים ובמערכת סליקה מאובטחת לצורך הגנה על פרטי הלקוחות.</p>
<h3>${s.s16}</h3>
<p>כל הזכויות באתר שמורות ל־HAGOUR BY WAEL. אין להעתיק תמונות, טקסטים, עיצובים או לוגו ללא אישור מראש.</p>
<h3>${s.s17}</h3>
<p>על תקנון זה יחולו דיני מדינת ישראל בלבד. לביטולים והחזרים ראו <a href="/refunds">מדיניות ביטולים והחזרים</a>.</p>`;
}

export function defaultHagourTermsContent(updatedAt = new Date()) {
  return {
    title: HAGOUR_TERMS_TITLE,
    contentHe: buildHagourTermsHtml("he", updatedAt),
    contentEn: buildHagourTermsHtml("en", updatedAt),
    contentAr: buildHagourTermsHtml("ar", updatedAt),
  };
}
