import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";

/* Why this exists rather than a `<main>` and a `<SiteFooter>` in the root
   layout: the footer has to take the inset of whichever shell it sits under, and
   the root layout cannot know which one that is. Reading the pathname to find
   out is not available either — it is runtime data on a route with dynamic
   segments, which is why the footer's two route-aware leaves are already behind
   a `<Suspense>` boundary, and hoisting the inset up there would block the
   route under Cache Components.
   So the shell that owns the geometry passes it down, and this holds the two
   landmarks together so a route cannot ship one without the other. Both stay
   direct children of `<body>`: `contentinfo` nested inside `main` is not
   exposed as a landmark. */

/* No inset constant lives here. `CV_DOCUMENT_INSET` used to, which made this
   module — the one every shell mounts — change whenever `/cv`'s geometry did.
   Each measure now sits with the surface that owns it: `src/app/cv/inset.ts`,
   `HUB_SHELL_INSET` in `hub-shell.tsx`, and `/writing`'s in `writing-index.tsx`.
   They are deliberately not gathered into one module: ADR 0002's argument is
   that a measure says something only its own shell cares about, and a shared
   home invites the union type that ADR rejects. The cost is the
   `print:max-w-none print:px-0` tail written out three times. */

export function RouteFrame({
  children,
  measure,
}: {
  children: ReactNode;
  /** The host route's horizontal inset, verbatim, so the footer's rule ends
   *  where the content above it ends. */
  measure: string;
}) {
  return (
    <>
      <main
        id="main-content"
        tabIndex={-1}
        className="scroll-mt-12 focus-visible:shadow-none"
      >
        {children}
      </main>
      <SiteFooter measure={measure} />
    </>
  );
}
