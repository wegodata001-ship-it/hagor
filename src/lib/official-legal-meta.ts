export type OfficialLegalSlug =
  | "terms"
  | "privacy"
  | "accessibility"
  | "cancellation-policy"
  | "returns-policy"
  | "shipping-policy";

export const LEGAL_PUBLIC_PATH: Record<OfficialLegalSlug, `/${string}`> = {
  terms: "/terms",
  privacy: "/privacy",
  accessibility: "/accessibility",
  "cancellation-policy": "/cancellation-policy",
  "returns-policy": "/returns-policy",
  "shipping-policy": "/shipping-policy",
};

export const OFFICIAL_LEGAL_SLUGS = Object.keys(LEGAL_PUBLIC_PATH) as OfficialLegalSlug[];

export function isOfficialLegalSlug(value: string): value is OfficialLegalSlug {
  return value in LEGAL_PUBLIC_PATH;
}
