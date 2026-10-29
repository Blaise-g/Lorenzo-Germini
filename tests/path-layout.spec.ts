/* The `/path` overlay's geometry: nothing widens the page, the stills fill
   a phone's stage and leave the line saying why on bare paper, and a
   phone's first screen holds the voice's label without moving. */

import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [
  { width: 375, height: 812 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1440 },
] as const;

const PHONE = { width: 375, height: 812 } as const;

function noWebGL(page: Page) {
  return page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
}

/** The box of `selector`, relative to the viewport. */
async function boxOf(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, selector).not.toBeNull();
  return box!;
}

test.describe("the page keeps to the screen's width", () => {
  for (const { width, height } of WIDTHS) {
    for (const reducedMotion of ["no-preference", "reduce"] as const) {
      test(`at ${width}, reduced motion ${reducedMotion}`, async ({
        browser,
      }) => {
        const context = await browser.newContext({
          viewport: { width, height },
          reducedMotion,
        });
        const page = await context.newPage();
        /* Lille is near the strip's far end, where the pawn's rail reaches
           furthest past the row. */
        await page.goto("/path#lille");
        await expect(page.locator(".path-pawn")).toBeAttached();
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
        await context.close();
      });
    }
  }
});

test.describe("the stills", () => {
  test("at 1440, the line saying why is under the art, not over it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await noWebGL(page);
    await page.goto("/path#lille");
    const reason = page.locator("[data-path-fallback-reason]");
    await expect(reason).toBeVisible();
    const still = page.locator(
      '[data-path-backdrop="lille"] [data-path-still="light"]',
    );
    await expect(still).toBeVisible();
    await expect
      .poll(() =>
        still.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
    const line = await boxOf(page, "[data-path-fallback-reason]");
    /* The art is the image's contained box: the still's own aspect inside
       its element. */
    const art = await still.evaluate((image: HTMLImageElement) => {
      const box = image.getBoundingClientRect();
      const scale = Math.min(
        box.width / image.naturalWidth,
        box.height / image.naturalHeight,
      );
      const height = image.naturalHeight * scale;
      return { bottom: box.top + (box.height + height) / 2 };
    });
    expect(line.y).toBeGreaterThanOrEqual(art.bottom);
  });

  test("on a phone, a still fills the stage rather than a letterbox", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await noWebGL(page);
    await page.goto("/path#lille");
    const still = page.locator(
      '[data-path-backdrop="lille"] [data-path-still="light"]',
    );
    await expect(still).toBeVisible();
    const fit = await still.evaluate(
      (image) => getComputedStyle(image).objectFit,
    );
    expect(fit).toBe("cover");
    const stage = await boxOf(page, "[data-path-stage]");
    const image = await boxOf(
      page,
      '[data-path-backdrop="lille"] [data-path-still="light"]',
    );
    expect(image.width).toBeCloseTo(stage.width, 0);
    /* All of the stage but the band the line saying why sits in. */
    const line = await boxOf(page, "[data-path-fallback-reason]");
    expect(line.y).toBeGreaterThanOrEqual(image.y + image.height);
  });
});

test("a phone's first screen holds the voice's label, and nothing shifts", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: PHONE,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const record = window as unknown as { __shift: number };
    record.__shift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[]) {
        if (!entry.hadRecentInput) record.__shift += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/path#lille");
  const label = page.locator("[data-path-voice-label]");
  await expect(label).toBeVisible();
  /* The board settled on its step: the stage has done its moving. */
  await expect(page.locator("[data-path-stage]")).toHaveAttribute(
    "data-stage-settled",
    "",
    { timeout: 15_000 },
  );
  const box = (await label.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(PHONE.height);
  const shift = await page.evaluate(
    () => (window as unknown as { __shift: number }).__shift,
  );
  expect(shift).toBeLessThanOrEqual(0.01);
  await context.close();
});
