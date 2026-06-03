import { ImageResponse } from "next/og";
import {
  BRAND_LEGAL_NAME,
  BRAND_SOCIAL,
  BRAND_SOCIAL_TAGLINE,
  brandMark,
} from "@/lib/brand-social";

export const alt = BRAND_LEGAL_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const mark = brandMark(120);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: `linear-gradient(145deg, #1a1a1a 0%, ${BRAND_SOCIAL.bg} 45%, #050505 100%)`,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: `linear-gradient(90deg, transparent, ${BRAND_SOCIAL.gold} 25%, ${BRAND_SOCIAL.goldLight} 50%, ${BRAND_SOCIAL.gold} 75%, transparent)`,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <div style={mark}>H</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                fontSize: 52,
                fontWeight: 900,
                color: BRAND_SOCIAL.text,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
              }}
            >
              {BRAND_LEGAL_NAME}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: BRAND_SOCIAL.muted,
                lineHeight: 1.35,
              }}
            >
              {BRAND_SOCIAL_TAGLINE}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${BRAND_SOCIAL.border}`,
            paddingTop: 28,
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: BRAND_SOCIAL.gold,
              letterSpacing: "0.06em",
            }}
          >
            {BRAND_SOCIAL.siteHost}
          </div>
          <div
            style={{
              fontSize: 20,
              color: BRAND_SOCIAL.muted,
              fontWeight: 500,
            }}
          >
            TACTICAL · FIELD · PRO
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
