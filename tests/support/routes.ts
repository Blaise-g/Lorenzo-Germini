/* Every route that renders through the shared hub shell, including a deliberate
   404 — the not-found page uses the same shell, so it has to satisfy the same
   landmark and focus contracts. Specs asserting shell behaviour should cover all
   of them. Narrower sets elsewhere are deliberate, not stale copies of this one.

   The `?variant=` knobs are gone with the homepage direction prototypes (#26).
   `/writing` is still the dev-only index prototype, retired by #24. */
export const routesUsingTheSharedShell = [
  "/",
  "/cv",
  "/writing",
  "/route-that-does-not-exist",
] as const;
