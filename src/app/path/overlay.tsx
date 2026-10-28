"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { fragmentForStep, markEntered } from "@/lib/path-state";
import { useSelectedStep } from "@/lib/use-path-state";

/* The overlay's client leaves. Before they hydrate, the first-paint script in
   `first-paint.ts` has already put the fragment's step on the overlay root and
   on "Flat site", so a load of `/path#lille` paints Lille. Hydration keeps
   those values (`suppressHydrationWarning`: the server cannot see the
   fragment), and from then on each leaf follows it through `useSelectedStep`,
   as `/`'s leaves do. */

/** The overlay root, carrying the selected step as `data-path-shown`. CSS
 *  shows that step's panel from it, so selecting a step shows its text at
 *  once, with nothing to fetch (GH-141, decision 7). */
export function OverlayRoot({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const { selected } = useSelectedStep();
  return (
    <div
      data-path-overlay
      data-path-shown={selected}
      suppressHydrationWarning
      className={className}
    >
      {children}
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
      Flat site
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
