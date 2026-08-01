/* Guards the Cache Components baseline (issue #23), now that #24 has made
   `/writing` the first real consumer of `"use cache"`. Two things can silently
   break under the flag:
   a boundary can stick on its fallback, so the URL stops selecting anything;
   and a fallback whose geometry differs from the resolved content can shift
   the page. Both are invisible to the existing suites, which only assert the
   shared shell and the settled content of the default URL. */

import { expect, test, type Page } from "@playwright/test";

import { removeDevOverlay } from "./support/dev-overlay";

declare global {
  interface Window {
    __cumulativeLayoutShift: number;
  }
}

/* Issue #23: "Streamed or fallback content preserves geometry with cumulative
   layout shift at or below 0.01." */
const MAX_CUMULATIVE_LAYOUT_SHIFT = 0.01;

/* Every route at the URL a visitor arrives on. None of the three has a
   Suspense boundary any more — the `?variant=` knob went with #26 and the
   `?n=` knob with #24 — so what this measures is that none of them grows one
   that shifts the page, and that the cached feed read on `/writing` does not
   land late enough to move the subscribe module under it.

   The dev-only `/writing/fixture/<state>` route is excluded: a fixture state
   is a deliberate request for differently shaped content, which is the one
   place a shift is intended. */
const routesMeasuredForLayoutShift = ["/", "/cv", "/writing"];

async function measureCumulativeLayoutShift(page: Page, route: string) {
  await page.addInitScript(() => {
    window.__cumulativeLayoutShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        hadRecentInput?: boolean;
        value?: number;
      })[]) {
        if (!entry.hadRecentInput) {
          window.__cumulativeLayoutShift += entry.value ?? 0;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto(route, { waitUntil: "networkidle" });

  await removeDevOverlay(page);

  // Webfonts and the avatar settle after networkidle; both shift layout when
  // they land, so a reading taken any earlier would under-report.
  await page.evaluate(() => document.fonts.ready);

  // Wait for the score to stop moving rather than sleeping a fixed budget, so
  // a slow machine still reports a settled figure instead of a truncated one.
  let previous = -1;
  for (let poll = 0; poll < 20; poll++) {
    const current = await page.evaluate(() => window.__cumulativeLayoutShift);
    if (current === previous) return current;
    previous = current;
    await page.waitForTimeout(100);
  }

  return page.evaluate(() => window.__cumulativeLayoutShift);
}

test.describe("Cache Components prerender baseline", () => {
  for (const route of routesMeasuredForLayoutShift) {
    test(`${route} settles without visible layout shift`, async ({ page }) => {
      const shift = await measureCumulativeLayoutShift(page, route);
      expect(shift).toBeLessThanOrEqual(MAX_CUMULATIVE_LAYOUT_SHIFT);
    });
  }

  /* #26 removed the homepage's only runtime read — the `?variant=` knob — so
     the route has no Suspense boundary left to stick on and prerenders whole.
     Asserting the section count is what would catch a reintroduced boundary
     resolving to a partial page, and a query string must now change nothing. */
  test("the homepage prerenders whole, with no boundary left to stick on", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-reading-measure]")).toHaveCount(6);

    await page.goto("/?variant=a");
    await expect(page.locator("[data-reading-measure]")).toHaveCount(6);
  });

  /* #24 took the last runtime read off `/writing` too: the feed arrives from a
     `"use cache"` function, so the route prerenders whole and a query string
     must change nothing on it. */
  test("the writing index prerenders whole, with no boundary left to stick on", async ({
    page,
  }) => {
    for (const route of ["/writing", "/writing?n=6"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Writing",
      );
      await expect(
        page.getByRole("heading", { name: "Get the essays by email" }),
      ).toBeVisible();
    }
  });

  /* The one boundary left in the app is the dev-only fixture route, which
     reads its state from the URL. It is excluded from the shift budget above —
     a fixture state is a request for differently shaped content — but it must
     still resolve past its fallback rather than sticking on the skeleton. */
  test("the fixture boundary resolves past its fallback to the requested state", async ({
    page,
  }) => {
    for (const [state, expectedEntries] of [
      ["1", 1],
      ["3", 3],
      ["6", 6],
    ] as const) {
      await page.goto(`/writing/fixture/${state}`);
      await expect(page.locator("main article")).toHaveCount(expectedEntries);
    }
  });
});
