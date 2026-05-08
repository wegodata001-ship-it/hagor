import type { Locale } from "@/lib/localized";

export type PolicyTab = "terms" | "privacy" | "refund" | "shipping";

export const LEGAL_FALLBACK: Record<
  PolicyTab,
  Record<Locale, string>
> = {
  terms: {
    he: `<h2>תנאי שימוש</h2><p>תנאי השימוש באתר נקבעים על ידי החנות. יש להחליף טקסט זה לאחר ייעוץ משפטי. כאן יפורטו זכויות והתחייבויות בין החנות ללקוח.</p><ul><li>שימוש באתר מהווה הסכמה לתנאים.</li><li>החנות רשאית לעדכן תנאים מעת לעת.</li></ul>`,
    ar: `<h2>شروط الاستخدام</h2><p>يحدد مشغل المتجر شروط استخدام الموقع. يُستبدل هذا النص بعد مراجعة قانونية.</p>`,
    en: `<h2>Terms of use</h2><p>The store sets the terms governing use of this website. Replace this placeholder after legal review.</p><ul><li>Using the site constitutes acceptance.</li><li>Terms may be updated periodically.</li></ul>`,
  },
  privacy: {
    he: `<h2>מדיניות פרטיות</h2><p>יש לפרט כיצד נאספים נתונים (הזמנות, הרשמה, דיוור), מטרות העיבוד, זכויות הנושא ופרטי יצירת קשר של ממונה הפרטיות בהתאם לחוק התקף.</p>`,
    ar: `<h2>سياسة الخصوصية</h2><p>يُستبدل هذا النص وفقاً للقوانين المعمول بها.</p>`,
    en: `<h2>Privacy policy</h2><p>Describe how you collect and process personal data (orders, registration, marketing), lawful bases, data subject rights, and contact details for privacy inquiries.</p>`,
  },
  refund: {
    he: `<h2>מדיניות ביטולים והחזרים</h2><p>יש לפרט מועדי ביטול, זכאות להחזר, סוגי מוצרים וחריגים, ותהליך פנייה לשירות לקוחות.</p>`,
    ar: `<h2>سياسة الإلغاء والاسترداد</h2><p>حدّد مدة الإلغاء، حالات الاسترداد، والاستثناءات.</p>`,
    en: `<h2>Cancellations & refunds</h2><p>Define cancellation windows, refund eligibility, exclusions, and how customers request support.</p>`,
  },
  shipping: {
    he: `<h2>מדיניות משלוחים</h2><p>יש לפרט אזורי משלוח, זמני אספקה משוערים, עלויות, מעקב, ואיסוף עצמי אם קיים.</p>`,
    ar: `<h2>سياسة الشحن</h2><p>حدّد مناطق التوصيل والمدة والتكاليف.</p>`,
    en: `<h2>Shipping policy</h2><p>Describe delivery regions, timelines, fees, tracking, and pickup options.</p>`,
  },
};

/** Flat DB payload for seed / restore-defaults */
export function defaultLegalFlat(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const tab of ["terms", "privacy", "refund", "shipping"] as PolicyTab[]) {
    for (const lang of ["he", "ar", "en"] as Locale[]) {
      const key = `${tab}_${lang}` as const;
      out[key] = LEGAL_FALLBACK[tab][lang];
    }
  }
  return out;
}
