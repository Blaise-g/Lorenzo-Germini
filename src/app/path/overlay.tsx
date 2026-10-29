"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { PathStepSlug } from "@/data/path.types";
import { fragmentForStep, markEntered } from "@/lib/path-state";
import { useSelectedStep } from "@/lib/use-path-state";

import { PATH_COPY } from "./copy";

/* The overlay's client leaves. Before they hydrate, the first-paint script in
   `first-paint.ts` has already put the fragment's step on the overlay root and
   on "Flat site", so a load of `/path#lille` paints Lille. Hydration keeps
   those values (`suppressHydrationWarning`: the server cannot see the
   fragment), and from then on each leaf follows it through `useSelectedStep`,
   as `/`'s leaves do. */

/** Caption lines lit, by index, and the step whose lines they are. */
export type LitLines = { slug: PathStepSlug; lines: readonly number[] };

const LitLinesContext = createContext<(lit: LitLines) => void>(() => {});

/** For the scene stage: lights a step's caption lines, by index, as their
 *  props land (storyboard §7.4). */
export function useSetLitLines() {
  return useContext(LitLinesContext);
}

/** The overlay root, carrying the selected step as `data-path-shown`. CSS
 *  shows that step's panel from it, so selecting a step shows its text at
 *  once, with nothing to fetch (GH-141, decision 7). It carries the lit
 *  caption lines too, as `data-path-lit`: the captions are the panel's own
 *  lines, server HTML, so they are lit from here rather than re-rendered. */
export function OverlayRoot({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const { selected } = useSelectedStep();
  const [lit, setLit] = useState<LitLines>({ slug: selected, lines: [] });
  /* Lines lit for one step never light another's: on a Back or a fragment,
     the new panel shows a render before its scene's build resets them. */
  const lines = lit.slug === selected ? lit.lines : [];
  return (
    <div
      data-path-overlay
      data-path-shown={selected}
      data-path-lit={lines.length > 0 ? lines.join(" ") : undefined}
      suppressHydrationWarning
      className={className}
    >
      <LitLinesContext value={setLit}>{children}</LitLinesContext>
    </div>
  );
}

/** The way back, carrying the selected step: from `/path#lille` it goes to
 *  `/#lille` (GH-141, decision 13). A plain anchor rather than `Link`: the
 *  flat site reads its fragment on load, and a full load is what puts it
 *  there. */
export function FlatSiteLink({ className }: { className: string }) {
  const { selected } = useSelectedStep();
  return (
    <a
      href={`/${fragmentForStep(selected)}`}
      data-path-flat-site-link
      suppressHydrationWarning
      className={className}
    >
      {PATH_COPY.flatSite}
    </a>
  );
}

/** Being here is the choice the door remembers: it reads the flag to say
 *  "Continue the path" (GH-141, decision 6). Set on mount, so only a visit to
 *  `/path` sets it. */
export function MarkEntered() {
  useEffect(() => {
    markEntered();
  }, []);
  return null;
}
