import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const viewports = [375, 768, 1024, 1440] as const;

async function waitForTwoAnimationFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function expectMinimumTarget(
  page: Page,
  selector: string,
  minimum: number,
) {
  const undersized = await page.locator(selector).evaluateAll(
    (elements, targetMinimum) =>
      elements.flatMap((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const isVisible =
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          !(
            style.position === "absolute" &&
            style.overflow === "hidden" &&
            rect.width <= 1 &&
            rect.height <= 1
          ) &&
          rect.width > 0 &&
          rect.height > 0;

        if (
          !isVisible ||
          (rect.width >= targetMinimum && rect.height >= targetMinimum)
        ) {
          return [];
        }

        return [
          {
            height: rect.height,
            label:
              element.getAttribute("aria-label") ||
              element.textContent?.trim().slice(0, 80) ||
              element.tagName,
            width: rect.width,
          },
        ];
      }),
    minimum,
  );

  expect(
    undersized,
    `all visible ${selector} targets should be at least ${minimum}×${minimum}px`,
  ).toEqual([]);
}

test.describe("touch and fixed-chrome geometry", () => {
  test("all phone-width targets meet their minimum dimensions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");

    await expectMinimumTarget(page, "a[href], button", 24);

    await page.evaluate(() => window.scrollTo(0, 600));
    await expect(
      page.getByRole("button", { name: "Back to top" }),
    ).toBeVisible();
    await waitForTwoAnimationFrames(page);
    await expectMinimumTarget(
      page,
      "main a[aria-label]:has(svg), main button[aria-label]:has(svg)",
      44,
    );

    await page.getByRole("button", { name: "Open command menu" }).click();
    const close = page.getByRole("button", { name: "Close" });
    const closeBox = await close.boundingBox();
    expect(closeBox, "dialog close control should be visible").not.toBeNull();
    expect(closeBox!.width).toBeGreaterThanOrEqual(44);
    expect(closeBox!.height).toBeGreaterThanOrEqual(44);
  });

  for (const width of viewports) {
    test(`fixed chrome does not cover content at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      const maximumScroll = await page.evaluate(
        () => document.documentElement.scrollHeight - innerHeight,
      );
      const scrollStops = [0, maximumScroll / 2, maximumScroll];

      for (const scrollTop of scrollStops) {
        await page.evaluate((top) => window.scrollTo(0, top), scrollTop);
        await waitForTwoAnimationFrames(page);

        const collisions = await page.evaluate(() => {
          const fixedChrome = Array.from(
            document.querySelectorAll<HTMLElement>(
              'button[aria-label="Toggle theme"], button[aria-label="Back to top"], button[aria-label="Open command menu"], main > p.fixed',
            ),
          ).filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
              style.position === "fixed" &&
              style.visibility !== "hidden" &&
              style.display !== "none" &&
              rect.width > 0 &&
              rect.height > 0 &&
              style.pointerEvents !== "none"
            );
          });

          const intersects = (first: DOMRect, second: DOMRect) =>
            first.left < second.right &&
            first.right > second.left &&
            first.top < second.bottom &&
            first.bottom > second.top;

          const contentRects: { label: string; rect: DOMRect }[] = [];
          const walker = document.createTreeWalker(
            document.querySelector("main")!,
            NodeFilter.SHOW_TEXT,
          );

          while (walker.nextNode()) {
            const textNode = walker.currentNode as Text;
            const parent = textNode.parentElement;
            if (
              !parent ||
              !textNode.textContent?.trim() ||
              fixedChrome.some((chrome) => chrome.contains(parent))
            ) {
              continue;
            }

            const range = document.createRange();
            range.selectNodeContents(textNode);
            for (const rect of range.getClientRects()) {
              if (rect.width > 0 && rect.height > 0) {
                contentRects.push({
                  label: textNode.textContent.trim().slice(0, 80),
                  rect,
                });
              }
            }
          }

          document
            .querySelectorAll<HTMLImageElement>("main img")
            .forEach((image) => {
              contentRects.push({
                label: image.alt || "image",
                rect: image.getBoundingClientRect(),
              });
            });

          return fixedChrome.flatMap((chrome) => {
            const chromeRect = chrome.getBoundingClientRect();
            const rectangleCollisions = contentRects
              .filter(({ rect }) => intersects(chromeRect, rect))
              .map(({ label }) => ({
                chrome: chrome.getAttribute("aria-label") || chrome.textContent,
                content: label,
                method: "rectangle",
              }));

            const originalPointerEvents = chrome.style.pointerEvents;
            chrome.style.pointerEvents = "none";
            const sampledPoints = [
              [chromeRect.left + 1, chromeRect.top + 1],
              [chromeRect.right - 1, chromeRect.top + 1],
              [chromeRect.left + 1, chromeRect.bottom - 1],
              [chromeRect.right - 1, chromeRect.bottom - 1],
              [
                chromeRect.left + chromeRect.width / 2,
                chromeRect.top + chromeRect.height / 2,
              ],
            ];
            const hitTestCollisions = sampledPoints.flatMap(([x, y]) => {
              const target = document.elementFromPoint(x, y);
              const content = target?.closest(
                "a, button, img, h1, h2, h3, h4, p",
              );
              if (
                !content ||
                fixedChrome.some((item) => item.contains(content))
              ) {
                return [];
              }
              return [
                {
                  chrome:
                    chrome.getAttribute("aria-label") || chrome.textContent,
                  content:
                    content.getAttribute("aria-label") ||
                    content.getAttribute("alt") ||
                    content.textContent?.trim().slice(0, 80),
                  method: "elementFromPoint",
                },
              ];
            });
            chrome.style.pointerEvents = originalPointerEvents;

            return [...rectangleCollisions, ...hitTestCollisions];
          });
        });

        expect(
          collisions,
          `fixed chrome should not cover content at scroll position ${scrollTop}`,
        ).toEqual([]);
      }
    });
  }
});

test.describe("motion, theme initialization, and accessibility", () => {
  test("page-level reveals do not stagger in normal motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    const delays = await page
      .locator("main section.animate-fade-in-up")
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).animationDelay),
      );

    expect(delays.length).toBeGreaterThan(0);
    expect(delays.every((delay) => delay === "0s")).toBe(true);
  });

  test("reduced motion leaves delayed animations fully visible", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await waitForTwoAnimationFrames(page);

    const animationState = await page
      .locator('[class*="animate-"]')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return {
            delay: style.animationDelay,
            opacity: Number(style.opacity),
          };
        }),
      );

    expect(animationState.length).toBeGreaterThan(0);
    expect(animationState.every(({ delay }) => delay === "0s")).toBe(true);
    expect(animationState.every(({ opacity }) => opacity === 1)).toBe(true);
  });

  test("dark-mode initialization hydrates without mismatch", async ({
    page,
  }) => {
    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /hydration|server rendered html/i.test(message.text())
      ) {
        hydrationErrors.push(message.text());
      }
    });
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));

    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await page.waitForLoadState("networkidle");

    expect(hydrationErrors).toEqual([]);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`${theme} mode has no serious or critical accessibility violations`, async ({
      page,
    }) => {
      await page.addInitScript((nextTheme) => {
        localStorage.setItem("theme", nextTheme);
      }, theme);
      await page.goto("/");
      if (theme === "dark") {
        await expect(page.locator("html")).toHaveClass(/\bdark\b/);
      } else {
        await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
      }

      const results = await new AxeBuilder({ page }).analyze();
      const severeViolations = results.violations.filter(
        ({ impact }) => impact === "serious" || impact === "critical",
      );

      expect(severeViolations).toEqual([]);
    });
  }
});

test.describe("keyboard order", () => {
  for (const width of [375, 1440] as const) {
    test(`the first main-page focus targets stay in the first viewport at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page
        .locator("nextjs-portal")
        .evaluateAll((portals) => portals.forEach((portal) => portal.remove()));

      await page.keyboard.press("Tab");
      await expect(page.locator(":focus")).toHaveAttribute(
        "href",
        "#main-content",
      );

      await page.keyboard.press("Tab");
      const firstMainTarget = page.locator("main :focus");
      await expect(firstMainTarget).toHaveAttribute(
        "aria-label",
        "Toggle theme",
      );
      const box = await firstMainTarget.boundingBox();
      expect(
        box,
        "the first focusable in main should be rendered",
      ).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(800);
    });
  }
});
