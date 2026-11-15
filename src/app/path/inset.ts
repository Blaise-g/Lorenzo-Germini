/** `/path`'s horizontal inset: padding only, no measure. The route is full
 *  screen — the scene's stage takes the width beside the step list (GH-148) —
 *  so the overlay holds the edges rather than a centred column, and the
 *  footer's rule runs edge to edge with it (ADR-0002).
 *
 *  Its own module beside the route, as `src/app/cv/inset.ts` is: the shell
 *  owns its geometry, and the scene stage can take it without importing
 *  the page. */
export const PATH_OVERLAY_INSET = "px-6 md:px-10 print:px-0";
