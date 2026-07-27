// PROTOTYPE ROUTE — dev-only /writing index (issue #13). Never rendered in
// production: the map is planning-only, so this must not become a live route
// by accident. Delete with src/components/prototype/ only when the Phase 2
// §2.6 homepage swap merges.

import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  WritingIndex,
  type WritingParams,
} from "@/components/prototype/writing-index";

export const metadata: Metadata = {
  title: "Writing | Lorenzo Germini",
  description:
    "Essays on frontier AI, the companies being built on it, and what it does to the economics of software.",
};

/* The render every knob defaults to, and so the shape the Suspense fallback
   below holds until the query string resolves. */
const DEFAULT_PARAMS: WritingParams = {
  n: 1,
  reveal: "mount",
  stream: true,
  lang: "en",
};

type WritingProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function WritingPrototypePage({ searchParams }: WritingProps) {
  if (process.env.NODE_ENV === "production") notFound();

  // Cache Components (issue #23): the query string is runtime data, so the
  // read moves behind Suspense. The fallback is the all-defaults render, so
  // bare `/writing` settles into identical geometry; a knobbed URL swaps the
  // fallback out. Dev-only either way — production 404s above.
  return (
    <Suspense fallback={<WritingIndex params={DEFAULT_PARAMS} />}>
      <ParameterizedWritingIndex searchParams={searchParams} />
    </Suspense>
  );
}

async function ParameterizedWritingIndex({ searchParams }: WritingProps) {
  const sp = await searchParams;
  const one = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const n = Number(one("n"));
  const params: WritingParams = {
    n: [1, 2, 3, 4, 5, 6].includes(n) ? n : DEFAULT_PARAMS.n,
    reveal: one("reveal") === "stagger" ? "stagger" : DEFAULT_PARAMS.reveal,
    stream: one("stream") === "off" ? false : DEFAULT_PARAMS.stream,
    lang: one("it") === "on" ? "it" : DEFAULT_PARAMS.lang,
  };

  return <WritingIndex params={params} />;
}
