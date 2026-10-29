/* Every route that renders through the shared shell — `RouteFrame`'s skip
   target, one `main` and the footer — including a deliberate 404, which has to
   satisfy the same landmark and focus contracts. `/` is the flat site since
   #144. Specs asserting shell behaviour should cover all of them. Narrower sets
   elsewhere are deliberate, not stale copies of this one. `/path` stays out
   (#141, implementation decision 6).

   The `?variant=` knobs are gone with the homepage direction prototypes (#26),
   and `/writing` is the real feed-backed index as of #24 — its dev-only
   fixture states live under `/writing/fixture/<state>`. */
export const routesUsingTheSharedShell = [
  "/",
  "/cv",
  "/writing",
  "/route-that-does-not-exist",
] as const;
