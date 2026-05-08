import type { PolicyTab } from "@/lib/legal-defaults";
import type { Locale } from "@/lib/localized";

export type PolicyLang = Locale;

export type PolicyDrafts = Partial<Record<PolicyTab, Partial<Record<PolicyLang, string>>>>;

const TAB_TO_PREFIX: Record<PolicyTab, string> = {
  terms: "terms",
  privacy: "privacy",
  refund: "refund",
  shipping: "shipping",
};

export type PublishedAtKey =
  | "termsPublishedAt"
  | "privacyPublishedAt"
  | "refundPublishedAt"
  | "shippingPublishedAt";

export function columnFor(tab: PolicyTab, lang: PolicyLang): string {
  return `${TAB_TO_PREFIX[tab]}_${lang}`;
}

export function publishedAtField(tab: PolicyTab): PublishedAtKey {
  switch (tab) {
    case "terms":
      return "termsPublishedAt";
    case "privacy":
      return "privacyPublishedAt";
    case "refund":
      return "refundPublishedAt";
    case "shipping":
      return "shippingPublishedAt";
  }
}

export function parsePolicyDrafts(raw: unknown): PolicyDrafts {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: PolicyDrafts = {};
  for (const tab of ["terms", "privacy", "refund", "shipping"] as PolicyTab[]) {
    const v = o[tab];
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const langObj = v as Record<string, unknown>;
    const partial: Partial<Record<PolicyLang, string>> = {};
    for (const lang of ["he", "en", "ar"] as PolicyLang[]) {
      const s = langObj[lang];
      if (typeof s === "string") partial[lang] = s;
    }
    if (Object.keys(partial).length) out[tab] = partial;
  }
  return out;
}

export function mergeDraft(
  existing: unknown,
  tab: PolicyTab,
  lang: PolicyLang,
  html: string,
): PolicyDrafts {
  const base = parsePolicyDrafts(existing);
  const next: PolicyDrafts = { ...base, [tab]: { ...base[tab], [lang]: html } };
  return next;
}

export function removeTabDrafts(existing: unknown, tab: PolicyTab): PolicyDrafts {
  const base = parsePolicyDrafts(existing);
  delete base[tab];
  return base;
}
