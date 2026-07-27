import type { Page } from "@playwright/test";

/* The dev overlay mounts after load and is not part of the page under test.

   It is a single `nextjs-portal` element parented to a `<script>`, outside
   `<main>`, holding its controls in an open shadow root — so plain DOM counts do
   not see it (measured: removing it leaves `main a[href], main button` at 35),
   but Playwright's locators and axe both pierce open shadow roots, and it is
   free to emit `layout-shift` entries against the 0.01 budget in
   `cache-components.spec.ts`. That last one makes the removal load-bearing
   rather than cosmetic.

   Call it after `goto`, before asserting or measuring. */
export function removeDevOverlay(page: Page) {
  return page
    .locator("nextjs-portal")
    .evaluateAll((portals) => portals.forEach((portal) => portal.remove()));
}
