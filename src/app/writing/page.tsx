// PROTOTYPE ROUTE — dev-only /writing index (issue #13). Never rendered in
// production: the map is planning-only, so this must not become a live route
// by accident. Delete with src/components/prototype/ only when the Phase 2
// §2.6 homepage swap merges.

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

export default async function WritingPrototypePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const sp = await searchParams;
  const one = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const n = Number(one("n"));
  const params: WritingParams = {
    n: [1, 2, 3, 4, 5, 6].includes(n) ? n : 1,
    reveal: one("reveal") === "stagger" ? "stagger" : "mount",
    stream: one("stream") !== "off",
    lang: one("it") === "on" ? "it" : "en",
  };

  return <WritingIndex params={params} />;
}
