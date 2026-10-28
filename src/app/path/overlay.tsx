"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import type { PathStepSlug } from "@/data/path.types";
import { fragmentForStep, markEntered } from "@/lib/path-state";
import { useSelectedStep } from "@/lib/use-path-state";

/* The overlay's client leaves. Everything they show is in the server HTML at
   the default step, so the overlay paints before any of this hydrates; each
   then follows the fragment through `useSelectedStep`, as `/`'s leaves do. */

/** The way back, carrying the selected step: from `/path#lille` it goes to
 *  `/#lille` (GH-141, decision 13). A plain anchor rather than `Link`: the
 *  flat site reads its fragment on load, and a full load is what puts it
 *  there. */
export function FlatSiteLink({ className }: { className: string }) {
  const { selected } = useSelectedStep();
  return (
    <a href={`/${fragmentForStep(selected)}`} className={className}>
      Flat site
    </a>
  );
}

/** Every step's panel is server HTML; this shows the selected one. The step
 *  list's links change the fragment, so selecting a step shows its text at
 *  once, with nothing to fetch (GH-141, decision 7). The server cannot see
 *  the fragment, so a load of `/path#lille` paints now's panel until this
 *  hydrates, as `/`'s piece and selection wait for hydration too. */
export function StepPanels({
  panels,
}: {
  panels: readonly { slug: PathStepSlug; panel: ReactNode }[];
}) {
  const { selected } = useSelectedStep();
  return panels.map(({ slug, panel }) => (
    <div key={slug} data-path-panel={slug} hidden={slug !== selected}>
      {panel}
    </div>
  ));
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
