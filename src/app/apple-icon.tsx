import { ImageResponse } from "next/og";
import { BRAND_LEGAL_NAME, BRAND_SOCIAL, brandMark } from "@/lib/brand-social";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const mark = brandMark(96);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          background: `linear-gradient(160deg, ${BRAND_SOCIAL.card} 0%, ${BRAND_SOCIAL.bg} 100%)`,
          border: `2px solid ${BRAND_SOCIAL.border}`,
        }}
      >
        <div style={mark}>H</div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: BRAND_SOCIAL.gold,
            textAlign: "center",
            maxWidth: 160,
            lineHeight: 1.2,
          }}
        >
          {BRAND_LEGAL_NAME}
        </div>
      </div>
    ),
    { ...size },
  );
}
