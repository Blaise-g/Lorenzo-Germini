/* Every route that renders through the shared hub shell, including a deliberate
   404 — the not-found page uses the same shell, so it has to satisfy the same
   landmark and focus contracts. Specs asserting shell behaviour should cover all
   of them. Narrower sets elsewhere are deliberate, not stale copies of this one.

   The `?variant=` knobs are gone with the homepage direction prototypes (#26),
   and `/writing` is the real feed-backed index as of #24 — its dev-only
   fixture states live under `/writing/fixture/<state>`. */
export const routesUsingTheSharedShell = [
  "/",
  "/cv",
  "/writing",
  "/route-that-does-not-exist",
] as const;
