/** `/cv`'s document box, and the widest single-column measure on the site — so
 *  it is also what a surface with no shell of its own (the 404) uses. That
 *  caller imports it from here rather than being handed it by default: as a
 *  `RouteFrame` default it silently gave every future shell-less route `/cv`'s
 *  geometry, which is the drift `RouteFrame`'s required `measure` exists to stop.
 *
 *  Its own module beside the route, not inside `page.tsx`, because the 404 needs
 *  it and importing a route's page module for a constant drags that route's
 *  metadata and data reads along with it. It left `route-frame.tsx` because a
 *  component shared by every shell should not change whenever one route's
 *  geometry does — see `docs/adr/0002-each-shell-owns-its-footer-inset.md`,
 *  which argues the inset should stay an unconstrained class string per shell
 *  and is the reason there is no registry of these. */
export const CV_DOCUMENT_INSET =
  "mx-auto max-w-4xl px-6 pr-20 sm:px-10 sm:pr-20 lg:px-12 print:max-w-none print:px-0";
