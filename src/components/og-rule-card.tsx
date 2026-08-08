/* The segment cards' shared Warm Print composition.

   Shared rather than copied because a second segment card was where the
   treatment would have started drifting (GH-102). The homepage card is
   deliberately not built from this: it is the wordmark composition, with the
   opening mark and the accent italic role line, and folding the two together
   would make both harder to move.

   Every string is a prop, so nothing here reaches the shaper that
   `og-card-text` did not hand to the subsetter. */

import { OG_FONT } from "@/lib/og-fonts";
import { WARM_PRINT } from "@/lib/warm-print";

const palette = WARM_PRINT.light;

type OgRuleCardProps = {
  /** Drawn uppercase — pass the cased form the subset was cut from. */
  eyebrow: string;
  headline: string;
  meta: string;
  standfirst: string;
};

export function OgRuleCard({
  eyebrow,
  headline,
  meta,
  standfirst,
}: OgRuleCardProps) {
  return (
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
            fontFamily: OG_FONT.mono,
            fontSize: 24,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              fontFamily: OG_FONT.display,
              fontSize: 76,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              color: palette.body,
              display: "flex",
              fontFamily: OG_FONT.text,
              fontSize: 30,
              lineHeight: 1.35,
              maxWidth: 900,
            }}
          >
            {standfirst}
          </div>
        </div>
        <div
          style={{
            color: palette.faint,
            display: "flex",
            fontFamily: OG_FONT.mono,
            fontSize: 20,
          }}
        >
          {meta}
        </div>
      </div>
    </div>
  );
}
