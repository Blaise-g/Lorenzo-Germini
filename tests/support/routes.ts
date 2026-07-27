/* Every route that renders through the shared hub shell, including the homepage
   variant knobs and a deliberate 404 — the not-found page uses the same shell, so
   it has to satisfy the same landmark and focus contracts. Specs asserting shell
   behaviour should cover all of them. Narrower sets elsewhere are deliberate, not
   stale copies of this one. */
export const routesUsingTheSharedShell = [
  "/",
  "/?variant=a",
  "/?variant=b",
  "/?variant=b1",
  "/?variant=b2",
  "/?variant=b3",
  "/?variant=c",
  "/?variant=d",
  "/?variant=b1a",
  "/cv",
  "/writing",
  "/route-that-does-not-exist",
] as const;
