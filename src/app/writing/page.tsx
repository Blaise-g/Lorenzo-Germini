/* The essay index (spec §2.5, GH-24).
 *
 * No Suspense boundary and no runtime data read: the feed comes from a
 * `"use cache"` function, so the whole route prerenders and the cache
 * revalidates behind it. A cold or missed feed therefore costs a reader
 * nothing — they get the last good render, or an index with no essay surface
 * on it, never a spinner and never a failed build.
 *
 * Every state this route cannot reach with an empty publication lives on the
 * dev-only `/writing/fixture/[state]` route beside it.
 */

import type { Metadata } from "next";

import { WritingIndex } from "@/components/writing-index";
import { RESUME_DATA } from "@/data/resume-data";
import { getEssays, SUBSTACK_BASE } from "@/lib/substack";

const writingUrl = new URL("/writing", RESUME_DATA.personalWebsiteUrl).href;

export const metadata: Metadata = {
  title: "Writing",
  description: RESUME_DATA.writingPage.standfirst,
  alternates: { canonical: writingUrl },
  openGraph: {
    type: "website",
    url: writingUrl,
    title: `Writing — ${RESUME_DATA.name}`,
    description: RESUME_DATA.writingPage.standfirst,
  },
};

export default async function WritingPage() {
  const essays = await getEssays();

  return (
    <>
      <WritingStructuredData />
      <WritingIndex essays={essays} />
    </>
  );
}

/* Minimal `Blog` (§2.7). Per-essay `Article` is deliberately Phase 3: the
   bodies live on Substack, so marking excerpts up as articles invites
   duplicate-content ambiguity this page cannot resolve. */
function WritingStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: RESUME_DATA.newsletter.name,
    url: SUBSTACK_BASE,
    mainEntityOfPage: writingUrl,
    description: RESUME_DATA.writingPage.standfirst,
    inLanguage: "en",
    author: {
      "@type": "Person",
      name: RESUME_DATA.name,
      url: RESUME_DATA.personalWebsiteUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
