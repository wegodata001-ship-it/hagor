import { BRAND_LEGAL_NAME } from "@/lib/brand";

/** Colors for favicon / OG images (WhatsApp, Facebook, iMessage, etc.). */
export const BRAND_SOCIAL = {
  bg: "#0b0b0b",
  card: "#141414",
  border: "#27272a",
  gold: "#c89211",
  goldLight: "#e8b84a",
  text: "#f8fafc",
  muted: "#94a3b8",
  siteHost: "hagourbywael.com",
} as const;

export const BRAND_SOCIAL_TAGLINE = "ציוד טקטי מקצועי · חגורות ונרתיקים";

export function brandMark(size: number) {
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.52);
  return {
    width: size,
    height: size,
    borderRadius: radius,
    background: `linear-gradient(135deg, ${BRAND_SOCIAL.goldLight} 0%, ${BRAND_SOCIAL.gold} 55%, #8a5e08 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize,
    fontWeight: 900,
    color: "#0b0b0b",
    letterSpacing: "-0.04em",
    boxShadow: `0 8px 32px rgba(200, 146, 17, 0.35)`,
  } as const;
}

export { BRAND_LEGAL_NAME };
