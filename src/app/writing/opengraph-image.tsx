/* `/writing` needs its own card file, not just its own copy: the page declares
   an `openGraph` object, which replaces the root's wholesale, and the root
   `opengraph-image` does not carry into a segment that does so (GH-102). */

import { ImageResponse } from "next/og";

import { OgRuleCard } from "@/components/og-rule-card";
import { OG_WRITING_TEXT } from "@/lib/og-card-text";
import { ogFonts } from "@/lib/og-fonts";

export const alt = `${OG_WRITING_TEXT.name} — ${OG_WRITING_TEXT.eyebrow}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function WritingOpenGraphImage() {
  return new ImageResponse(
    <OgRuleCard
      eyebrow={OG_WRITING_TEXT.eyebrow}
      headline={OG_WRITING_TEXT.name}
      meta={OG_WRITING_TEXT.meta}
      standfirst={OG_WRITING_TEXT.standfirst}
    />,
    { ...size, fonts: ogFonts("upright") },
  );
}
