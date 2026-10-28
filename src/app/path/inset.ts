/** `/path`'s horizontal inset: padding only, no measure. The route is full
 *  screen — the scene will fill the viewport behind the overlay (GH-148) — so
 *  the overlay holds the edges rather than a centred column, and the footer's
 *  rule runs edge to edge with it (ADR-0002).
 *
 *  Its own module beside the route, as `src/app/cv/inset.ts` is, so the
 *  overlay's pieces can share it without importing the page. */
export const PATH_OVERLAY_INSET = "px-6 md:px-10 print:px-0";
