/* Guards the Cache Components baseline (issue #23).
   Enabling `cacheComponents` forced the two prototype routes to read their
   query string behind Suspense. Two things can silently break as a result:
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

/* Every route at the URL a visitor arrives on, which is also every route whose
   fallback is supposed to match what replaces it. The suite runs against `bun
   run dev`, so `/` and `/writing` genuinely stream here — their boundaries are
   live, and this is what holds them to the budget. `/cv` has no boundary; it
   is measured so that adding one that shifts the page is caught.

   Only the `?variant=`/`?n=` URLs are excluded, and only because a knob is a
   deliberate request for differently shaped content: those swaps are the one
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

  // Here the removal also keeps the overlay out of the 0.01 budget below; see
  // the helper for why it is load-bearing rather than cosmetic.
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

  /* The homepage fallback is the no-variant render, so a stuck boundary looks
     exactly like a correct bare `/`. Only a variant URL can tell them apart:
     CurrentHome is the sole homepage rendering that emits reading-measure
     sections, so seeing them under ?variant= means the fallback never
     resolved. */
  test("the homepage boundary resolves past its fallback to the requested variant", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-reading-measure]")).toHaveCount(5);

    await page.goto("/?variant=a");
    await expect(page.locator("[data-reading-measure]")).toHaveCount(0);
    await expect(page.locator("main section#writing")).toHaveCount(1);
  });

  /* Same shape of failure on /writing, where the fallback is the all-defaults
     render: ?n= is the only knob whose effect is countable, so it is the one
     that proves the fallback was replaced rather than kept. */
  test("the writing boundary resolves past its fallback to the requested count", async ({
    page,
  }) => {
    for (const [route, expectedEntries] of [
      ["/writing", 1],
      ["/writing?n=3", 3],
      ["/writing?n=6", 6],
    ] as const) {
      await page.goto(route);
      await expect(page.locator("main article")).toHaveCount(expectedEntries);
    }
  });
});
