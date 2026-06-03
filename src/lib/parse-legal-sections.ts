export type TermsSectionIcon =
  | "shield"
  | "shopping-bag"
  | "truck"
  | "rotate-ccw"
  | "lock"
  | "headset"
  | "scale";

export type ParsedLegalSection = {
  id: string;
  title: string;
  html: string;
  icon: TermsSectionIcon;
  navLabel: string;
};

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

function slugify(title: string, index: number): string {
  const base = stripTags(title)
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return base ? `section-${base}` : `section-${index}`;
}

function navLabelFromTitle(title: string): string {
  return stripTags(title).replace(/^\d+[\.\)]\s*/, "").trim();
}

function iconForTitle(title: string): TermsSectionIcon {
  const t = stripTags(title).toLowerCase();
  if (/כללי|general|عام/.test(t)) return "shield";
  if (/רכיש|הזמנ|מחיר|price|order|purchas|شراء|طلب|أسعار/.test(t)) return "shopping-bag";
  if (/משלוח|ship|شحن/.test(t)) return "truck";
  if (/החזר|return|refund|إرجاع|استرداد/.test(t)) return "rotate-ccw";
  if (/ביטול|cancel|إلغاء/.test(t)) return "scale";
  if (/פרטיות|privacy|خصوصية|אבטח|security|أمن/.test(t)) return "lock";
  if (/שירות|לקוח|contact|עסק|business|اتصل|عمل/.test(t)) return "headset";
  if (/אחריות|warranty|ضمان|קניין|property/.test(t)) return "shield";
  return "shield";
}

/** Split rich HTML (h3 sections) into cards for the terms layout. */
export function parseLegalSections(html: string): { introHtml: string; sections: ParsedLegalSection[] } {
  const normalized = html.trim();
  if (!normalized) return { introHtml: "", sections: [] };

  const chunks = normalized.split(/<h3\b[^>]*>/i);
  const introHtml = (chunks[0] ?? "").trim();
  const sections: ParsedLegalSection[] = [];

  chunks.slice(1).forEach((chunk, index) => {
    const end = chunk.search(/<\/h3>/i);
    if (end < 0) return;
    const titleRaw = chunk.slice(0, end);
    const body = chunk.slice(end + 5).trim();
    const title = stripTags(titleRaw);
    if (!title) return;
    sections.push({
      id: slugify(title, index + 1),
      title,
      html: body,
      icon: iconForTitle(title),
      navLabel: navLabelFromTitle(title),
    });
  });

  if (sections.length === 0) {
    return { introHtml: normalized, sections: [] };
  }

  return { introHtml, sections };
}

/** Curated sidebar anchors (first matching section per item). */
export const TERMS_SIDEBAR_KEYS: TermsSectionIcon[] = [
  "shield",
  "shopping-bag",
  "truck",
  "rotate-ccw",
  "scale",
  "lock",
  "headset",
];

export function buildSidebarNav(
  sections: ParsedLegalSection[],
  locale: "he" | "en" | "ar",
): { id: string; label: string }[] {
  const labels: Record<typeof locale, Record<TermsSectionIcon, string>> = {
    he: {
      shield: "כללי",
      "shopping-bag": "רכישה",
      truck: "משלוחים",
      "rotate-ccw": "החזרות",
      scale: "ביטול עסקה",
      lock: "פרטיות",
      headset: "שירות לקוחות",
    },
    en: {
      shield: "General",
      "shopping-bag": "Orders",
      truck: "Shipping",
      "rotate-ccw": "Returns",
      scale: "Cancellation",
      lock: "Privacy",
      headset: "Support",
    },
    ar: {
      shield: "عام",
      "shopping-bag": "الشراء",
      truck: "الشحن",
      "rotate-ccw": "الإرجاع",
      scale: "الإلغاء",
      lock: "الخصوصية",
      headset: "خدمة العملاء",
    },
  };

  const used = new Set<string>();
  const items: { id: string; label: string }[] = [];

  for (const key of TERMS_SIDEBAR_KEYS) {
    const match = sections.find((s) => s.icon === key && !used.has(s.id));
    if (match) {
      used.add(match.id);
      items.push({ id: match.id, label: labels[locale][key] });
    }
  }

  for (const s of sections) {
    if (!used.has(s.id)) {
      items.push({ id: s.id, label: s.navLabel });
    }
  }

  return items;
}
