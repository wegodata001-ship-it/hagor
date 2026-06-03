import { ImageResponse } from "next/og";
import { brandMark } from "@/lib/brand-social";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const mark = brandMark(32);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0b",
        }}
      >
        <div style={mark}>H</div>
      </div>
    ),
    { ...size },
  );
}
