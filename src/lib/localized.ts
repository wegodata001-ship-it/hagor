export type Locale = "he" | "ar" | "en";

export function pickLocalized<T extends Record<string, unknown>>(
  row: T,
  fieldPrefix: string,
  locale: Locale,
): string {
  const order: Locale[] =
    locale === "he" ? ["he", "en", "ar"] : locale === "ar" ? ["ar", "he", "en"] : ["en", "he", "ar"];
  for (const l of order) {
    const key = `${fieldPrefix}_${l}` as keyof T;
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}
