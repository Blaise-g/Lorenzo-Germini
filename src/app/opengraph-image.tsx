import { ImageResponse } from "next/og";

import { RESUME_DATA } from "@/data/resume-data";
import { OG_FONT, ogFonts } from "@/lib/og-fonts";
import { displayUrl } from "@/lib/utils";
import { WARM_PRINT } from "@/lib/warm-print";

export const alt = `${RESUME_DATA.name} — ${RESUME_DATA.roleLabel}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const palette = WARM_PRINT.light;
const heroClaim = [
  RESUME_DATA.homepage.hero.headline.lead,
  RESUME_DATA.homepage.hero.headline.emphasis,
  RESUME_DATA.homepage.hero.headline.trail,
].join("");

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: palette.ground,
        color: palette.ink,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: "76px 80px",
        width: "100%",
      }}
    >
      {/* The opening mark. With the italic below it, this is the card's whole
          terracotta budget — anything larger reads as a fill. */}
      <div
        style={{
          background: palette.accent,
          display: "flex",
          height: 5,
          width: 76,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontFamily: OG_FONT.display,
            fontSize: 98,
            fontWeight: 600,
            letterSpacing: "-0.035em",
            lineHeight: 1,
          }}
        >
          {RESUME_DATA.name}
        </div>
        <div
          style={{
            color: palette.accent,
            display: "flex",
            fontFamily: OG_FONT.display,
            fontSize: 60,
            fontStyle: "italic",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            marginTop: 22,
          }}
        >
          {RESUME_DATA.roleLabel}
        </div>
        <div
          style={{
            color: palette.body,
            display: "flex",
            fontFamily: OG_FONT.text,
            fontSize: 30,
            lineHeight: 1.45,
            marginTop: 34,
            maxWidth: 820,
          }}
        >
          {heroClaim}
        </div>
      </div>

      <div
        style={{
          borderTop: `1px solid ${palette.border}`,
          color: palette.faint,
          display: "flex",
          fontFamily: OG_FONT.mono,
          fontSize: 21,
          justifyContent: "space-between",
          letterSpacing: "0.04em",
          paddingTop: 26,
        }}
      >
        <div style={{ display: "flex" }}>{RESUME_DATA.location}</div>
        <div style={{ display: "flex" }}>
          {displayUrl(RESUME_DATA.personalWebsiteUrl)}
        </div>
      </div>
    </div>,
    { ...size, fonts: ogFonts() },
  );
}
