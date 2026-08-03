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

/** `/cv`'s document box, and the widest single-column measure on the site — so
 *  it is also what a surface with no shell of its own (the 404) uses. That
 *  caller passes it explicitly: as a default it silently gave every future
 *  shell-less route `/cv`'s geometry, which is the drift this component exists
 *  to stop. */
export const CV_DOCUMENT_INSET =
  "mx-auto max-w-4xl px-6 pr-20 sm:px-10 sm:pr-20 lg:px-12 print:max-w-none print:px-0";

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
