import type { Locale } from "@/lib/localized";

export type CategoryOptionProfile = "BELT" | "HOLSTER";

/** Free-choice buckles + product-fixed closures (velcro / metal). */
export type BuckleType = "REGULAR" | "TACTICAL" | "QUICK_RELEASE" | "VELCRO" | "METAL";
export type HandSide = "RIGHT" | "LEFT";

export const FREE_BUCKLE_OPTIONS: BuckleType[] = ["REGULAR", "TACTICAL", "QUICK_RELEASE"];

const ALL_BUCKLE_TYPES: readonly BuckleType[] = [
  "REGULAR",
  "TACTICAL",
  "QUICK_RELEASE",
  "VELCRO",
  "METAL",
];

export function isBuckleType(v: unknown): v is BuckleType {
  return typeof v === "string" && (ALL_BUCKLE_TYPES as readonly string[]).includes(v);
}

export type BeltSizeRow = {
  beltSize: string;
  policePantsSize: number;
  beltLengthCm: number;
  beltLengthInch: number;
};

export const BELT_SIZE_TABLE: BeltSizeRow[] = [
  { beltSize: "XS", policePantsSize: 32, beltLengthCm: 85, beltLengthInch: 33 },
  { beltSize: "XS", policePantsSize: 34, beltLengthCm: 90, beltLengthInch: 35 },
  { beltSize: "S", policePantsSize: 36, beltLengthCm: 95, beltLengthInch: 37 },
  { beltSize: "S", policePantsSize: 38, beltLengthCm: 100, beltLengthInch: 39 },
  { beltSize: "M", policePantsSize: 40, beltLengthCm: 105, beltLengthInch: 41 },
  { beltSize: "M", policePantsSize: 42, beltLengthCm: 110, beltLengthInch: 43 },
  { beltSize: "L", policePantsSize: 44, beltLengthCm: 115, beltLengthInch: 45 },
  { beltSize: "L", policePantsSize: 46, beltLengthCm: 120, beltLengthInch: 47 },
  { beltSize: "XL", policePantsSize: 48, beltLengthCm: 125, beltLengthInch: 49 },
  { beltSize: "XL", policePantsSize: 50, beltLengthCm: 130, beltLengthInch: 51 },
  { beltSize: "XXL", policePantsSize: 52, beltLengthCm: 135, beltLengthInch: 53 },
  { beltSize: "XXL", policePantsSize: 54, beltLengthCm: 140, beltLengthInch: 55 },
  { beltSize: "3XL", policePantsSize: 56, beltLengthCm: 145, beltLengthInch: 57 },
  { beltSize: "3XL", policePantsSize: 58, beltLengthCm: 150, beltLengthInch: 59 },
  { beltSize: "4XL", policePantsSize: 60, beltLengthCm: 155, beltLengthInch: 61 },
  { beltSize: "4XL", policePantsSize: 62, beltLengthCm: 160, beltLengthInch: 63 },
];

export type BeltSelectedOptions = {
  type: "BELT";
  beltSize: string;
  policePantsSize: number;
  beltLengthCm: number;
  beltLengthInch: number;
  buckleType: BuckleType;
};

export type HolsterSelectedOptions = {
  type: "HOLSTER";
  handSide: HandSide;
};

export type ProductSelectedOptions = BeltSelectedOptions | HolsterSelectedOptions;

/** Product-level fixed closure — customer cannot switch (slug after `{storeId}-prod-`). */
const FIXED_BUCKLE_BY_SLUG: Record<string, BuckleType> = {
  "tactical-belt-full-rg": "TACTICAL",
  "patrol-belt-black-velcro": "VELCRO",
  "patrol-belt-metal-buckle": "METAL",
};

export function resolveFixedBuckleType(productId: string | null | undefined): BuckleType | null {
  if (!productId) return null;
  const marker = "-prod-";
  const i = productId.indexOf(marker);
  const slug = i >= 0 ? productId.slice(i + marker.length) : productId;
  return FIXED_BUCKLE_BY_SLUG[slug] ?? null;
}

export function beltRowKey(row: BeltSizeRow): string {
  return `${row.beltSize}-${row.policePantsSize}`;
}

export function beltRowFromKey(key: string): BeltSizeRow | null {
  return BELT_SIZE_TABLE.find((r) => beltRowKey(r) === key) ?? null;
}

export function resolveCategoryOptionProfile(
  optionProfile: string | null | undefined,
  categoryId?: string,
): CategoryOptionProfile | null {
  if (optionProfile === "BELT" || optionProfile === "HOLSTER") return optionProfile;
  const id = (categoryId ?? "").toLowerCase();
  if (id.includes("belt") || id.includes("חגור")) return "BELT";
  if (id.includes("holster") || id.includes("נרתיק")) return "HOLSTER";
  return null;
}

export function parseSelectedOptions(raw: unknown): ProductSelectedOptions | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.type === "BELT") {
    const buckleType = o.buckleType;
    if (!isBuckleType(buckleType)) return null;
    return {
      type: "BELT",
      beltSize: String(o.beltSize ?? ""),
      policePantsSize: Number(o.policePantsSize),
      beltLengthCm: Number(o.beltLengthCm),
      beltLengthInch: Number(o.beltLengthInch),
      buckleType,
    };
  }
  if (o.type === "HOLSTER") {
    const handSide = o.handSide;
    if (handSide !== "RIGHT" && handSide !== "LEFT") return null;
    return { type: "HOLSTER", handSide };
  }
  return null;
}

export function validateSelectedOptionsForProfile(
  profile: CategoryOptionProfile | null,
  options: ProductSelectedOptions | null | undefined,
  fixedBuckleType?: BuckleType | null,
): string | null {
  if (!profile) return null;
  if (!options) {
    return profile === "BELT"
      ? fixedBuckleType
        ? "נא לבחור מידה לפני הוספה לעגלה"
        : "נא לבחור מידה וסוג סגירה לפני הוספה לעגלה"
      : "נא לבחור צד לפני הוספה לעגלה";
  }
  if (profile === "BELT") {
    if (options.type !== "BELT") {
      return fixedBuckleType
        ? "נא לבחור מידה לפני הוספה לעגלה"
        : "נא לבחור מידה וסוג סגירה לפני הוספה לעגלה";
    }
    const ok = BELT_SIZE_TABLE.some(
      (r) =>
        r.beltSize === options.beltSize &&
        r.policePantsSize === options.policePantsSize &&
        r.beltLengthCm === options.beltLengthCm,
    );
    if (!ok) return "מידת חגורה לא תקינה";
    if (!options.buckleType) return "נא לבחור סוג סגירה";
    if (fixedBuckleType && options.buckleType !== fixedBuckleType) {
      return "סוג הסגירה אינו תואם למוצר זה";
    }
    return null;
  }
  if (options.type !== "HOLSTER" || !options.handSide) return "נא לבחור צד לפני הוספה לעגלה";
  return null;
}

export const BUCKLE_LABELS: Record<BuckleType, Record<Locale, string>> = {
  REGULAR: { he: "סגירה רגילה", ar: "إغلاق عادي", en: "Regular Buckle" },
  TACTICAL: { he: "סגירה טקטית", ar: "إغلاق تكتيكي", en: "Tactical Buckle" },
  QUICK_RELEASE: { he: "סגירה מהירה", ar: "إغلاق سريع", en: "Quick Release Buckle" },
  VELCRO: { he: "סגירת סקוץ׳", ar: "إغلاق فيلكرو", en: "Velcro closure" },
  METAL: { he: "אבזם מתכת", ar: "إبزيم معدني", en: "Metal buckle" },
};

const HAND_LABELS: Record<HandSide, Record<Locale, string>> = {
  RIGHT: { he: "ימין", ar: "يمين", en: "Right Hand" },
  LEFT: { he: "שמאל", ar: "شمال", en: "Left Hand" },
};

const FIELD_LABELS = {
  size: { he: "מידה", ar: "المقاس", en: "Size" },
  pants: { he: "מידת מכנס", ar: "مقاس البنطال", en: "Pants size" },
  length: { he: "אורך חגורה", ar: "طول الحزام", en: "Belt length" },
  buckle: { he: "סוג סגירה", ar: "نوع الإغلاق", en: "Buckle type" },
  side: { he: "צד", ar: "الجهة", en: "Side" },
  cm: { he: "ס״מ", ar: "سم", en: "cm" },
};

export function formatSelectedOptionsLines(
  options: ProductSelectedOptions | null | undefined,
  lang: Locale,
): string[] {
  if (!options) return [];
  const l = lang as "he" | "ar" | "en";
  if (options.type === "HOLSTER") {
    return [`${FIELD_LABELS.side[l]}: ${HAND_LABELS[options.handSide][lang]}`];
  }
  return [
    `${FIELD_LABELS.size[l]}: ${options.beltSize}`,
    `${FIELD_LABELS.pants[l]}: ${options.policePantsSize}`,
    `${FIELD_LABELS.length[l]}: ${options.beltLengthCm} ${FIELD_LABELS.cm[l]}`,
    `${FIELD_LABELS.buckle[l]}: ${BUCKLE_LABELS[options.buckleType][lang]}`,
  ];
}

export function formatBeltSizeCard(row: BeltSizeRow, lang: Locale): string {
  if (lang === "en") {
    return `${row.beltSize} — pants ${row.policePantsSize} — ${row.beltLengthCm} cm`;
  }
  if (lang === "ar") {
    return `${row.beltSize} — بنطال ${row.policePantsSize} — ${row.beltLengthCm} سم`;
  }
  return `${row.beltSize} — מכנס ${row.policePantsSize} — אורך ${row.beltLengthCm} ס״מ`;
}
