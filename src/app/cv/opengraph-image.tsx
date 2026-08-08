import { ImageResponse } from "next/og";

import { OgRuleCard } from "@/components/og-rule-card";
import { OG_CV_TEXT } from "@/lib/og-card-text";
import { ogFonts } from "@/lib/og-fonts";

export const alt = `${OG_CV_TEXT.name} — ${OG_CV_TEXT.eyebrow}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function CvOpenGraphImage() {
  return new ImageResponse(
    <OgRuleCard
      eyebrow={OG_CV_TEXT.eyebrow}
      headline={OG_CV_TEXT.name}
      meta={OG_CV_TEXT.meta}
      standfirst={OG_CV_TEXT.about}
    />,
    { ...size, fonts: ogFonts("upright") },
  );
}
