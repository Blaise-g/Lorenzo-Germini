/* Dev-only fixture states for the essay index (#24).
 *
 * The publication is live and empty, so every count-aware transition, the
 * malformed and unreachable feeds, and the recovery from a cached miss are
 * unreachable on `/writing` itself. This route feeds canned XML through the
 * same parser, the same cache and the same component, so what a fixture proves
 * is a property of the shipped index rather than of a test double.
 *
 * Production 404s before reading anything. That is also why `/writing` keeps
 * no query-string knob: the real route stays free of runtime data, so it
 * prerenders whole and has no fallback geometry to hold.
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WritingIndex, WritingIndexFallback } from "@/components/writing-index";
import { getEssays } from "@/lib/substack";
import { isFixtureState } from "@/lib/substack-fixtures";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type FixtureProps = {
  params: Promise<{ state: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function WritingFixturePage(props: FixtureProps) {
  if (process.env.NODE_ENV === "production") notFound();

  /* `params` and `searchParams` are runtime data, so the read sits behind a
     boundary. The fallback holds the lead's geometry — a fixture URL is a
     request for different content, so this is the one place the swap is
     allowed to change the page's shape. */
  return (
    <Suspense fallback={<WritingIndexFallback />}>
      <FixtureIndex {...props} />
    </Suspense>
  );
}

async function FixtureIndex({ params, searchParams }: FixtureProps) {
  const { state } = await params;
  if (!isFixtureState(state)) notFound();

  const query = await searchParams;
  const essays = await getEssays(state);

  return (
    <WritingIndex essays={essays} lang={query.lang === "it" ? "it" : "en"} />
  );
}
