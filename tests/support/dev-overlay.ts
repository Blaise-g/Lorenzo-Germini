import type { Page } from "@playwright/test";

/* The dev overlay mounts after load and is not part of the page under test.

   Worth stripping even though plain DOM counts never see it: it keeps its
   controls in an open shadow root, which Playwright's locators and axe both
   pierce, and it is free to emit `layout-shift` entries against the 0.01 budget
   in cache-components. */
export function removeDevOverlay(page: Page) {
  return page
    .locator("nextjs-portal")
    .evaluateAll((portals) => portals.forEach((portal) => portal.remove()));
}
