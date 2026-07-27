import { ImageResponse } from "next/og";

import { RESUME_DATA } from "@/data/resume-data";
import { WARM_PRINT } from "@/lib/warm-print";

export const alt = `${RESUME_DATA.name} — Curriculum vitae`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function CvOpenGraphImage() {
  const palette = WARM_PRINT.light;
  const cvDisplayUrl = new URL("/cv", RESUME_DATA.personalWebsiteUrl).href
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  return new ImageResponse(
    <div
      style={{
        background: palette.ground,
        color: palette.ink,
        display: "flex",
        height: "100%",
        padding: "72px 80px",
        width: "100%",
      }}
    >
      <div
        style={{
          background: palette.accent,
          display: "flex",
          flex: "0 0 12px",
          height: "100%",
          marginRight: "56px",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            color: palette.accent,
            display: "flex",
            fontFamily: "monospace",
            fontSize: 24,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Curriculum vitae
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Georgia, serif",
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {RESUME_DATA.name}
          </div>
          <div
            style={{
              color: palette.body,
              display: "flex",
              fontFamily: "system-ui, sans-serif",
              fontSize: 30,
              lineHeight: 1.35,
              maxWidth: 900,
            }}
          >
            {RESUME_DATA.about}
          </div>
        </div>
        <div
          style={{
            color: palette.faint,
            display: "flex",
            fontFamily: "monospace",
            fontSize: 20,
          }}
        >
          {RESUME_DATA.location} · {cvDisplayUrl}
        </div>
      </div>
    </div>,
    size,
  );
}
