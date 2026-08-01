import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { BACK_TO_TOP_LABEL, revealBackToTop } from "./support/back-to-top";
import {
  commandPaletteInput,
  openCommandPalette,
  openCommandPaletteWithShortcut,
} from "./support/command-palette";
import { removeDevOverlay } from "./support/dev-overlay";
import { routesUsingTheSharedShell } from "./support/routes";
import { setTheme, themes } from "./support/theme";

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
  /* Polled, not measured once: a control that transitions in is briefly its own
     resting size times a scale factor, and back-to-top passes through scale-95
     — 41.8px of its 44px box — on the way to visible. A short budget, because
     a genuinely undersized target should report fast rather than re-sweep the
     page for the default five seconds first. */
  const undersizedTargets = () =>
    page.locator(selector).evaluateAll(
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

  await expect
    .poll(undersizedTargets, {
      message: `all visible ${selector} targets should be at least ${minimum}×${minimum}px`,
      timeout: 2_000,
    })
    .toEqual([]);
}

test.describe("touch and fixed-chrome geometry", () => {
  for (const route of ["/", "/cv"] as const) {
    test(`${route} phone-width targets meet their minimum dimensions`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(route);

      await expectMinimumTarget(page, "a[href], button", 24);

      await revealBackToTop(page);
      await expectMinimumTarget(
        page,
        "main a[aria-label]:has(svg), main button[aria-label]:has(svg)",
        44,
      );

      const dialog = await openCommandPalette(page);
      const close = dialog.getByRole("button", { name: "Close" });
      const closeBox = await close.boundingBox();
      expect(closeBox, "dialog close control should be visible").not.toBeNull();
      expect(closeBox!.width).toBeGreaterThanOrEqual(44);
      expect(closeBox!.height).toBeGreaterThanOrEqual(44);
    });
  }

  /* `/writing` is here because decision 2's exclusion zone was written from a
     collision measured on it — the masthead CV link hit-testing as "Toggle
     theme" — and the fixture state because the FAB's other measured collision
     was over an essay excerpt, which the live empty feed does not render. */
  for (const route of ["/", "/cv", "/writing", "/writing/fixture/6"] as const) {
    for (const width of viewports) {
      test(`${route} fixed chrome does not cover content at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(route);

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
              let container: HTMLElement | null = element;
              while (
                container &&
                getComputedStyle(container).position !== "fixed"
              ) {
                container = container.parentElement;
              }
              return (
                container !== null &&
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
                  chrome:
                    chrome.getAttribute("aria-label") || chrome.textContent,
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
            `${route} fixed chrome should not cover content at scroll position ${scrollTop}`,
          ).toEqual([]);
        }
      });
    }
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

  for (const route of ["/", "/cv"] as const) {
    for (const theme of themes) {
      test(`${route} in ${theme} mode has no serious or critical accessibility violations`, async ({
        page,
      }) => {
        await setTheme(page, theme);
        await page.goto(route);
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
  }
});

test.describe("command palette", () => {
  const triggers = [
    ["the shortcut", openCommandPaletteWithShortcut],
    ["the button", openCommandPalette],
  ] as const;

  for (const [name, open] of triggers) {
    test(`${name} survives a hydration delay`, async ({ page }) => {
      /* `commit` returns as soon as the document starts arriving, so the trigger
         below is guaranteed to fire before hydration once the scripts it needs
         are stalled — which is what makes a dropped trigger certain here instead
         of the 1-in-6 it was when only a busy dev server produced the delay.

         Only the build's own chunks are held: stalling every `.js` would also
         catch the HMR client and analytics, which hydration does not wait on and
         which added two seconds of dead time. */
      await page.route("**/_next/static/**/*.js", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });
      await page.goto("/", { waitUntil: "commit" });

      const dialog = await open(page);
      await expect(commandPaletteInput(dialog)).toBeFocused();
    });
  }
});

test.describe("scroll subscriptions", () => {
  /* Recorded from an init script rather than asserted against the source: what
     matters is the flag the browser actually received at registration time, and
     a non-passive scroll listener blocks the compositor until the handler
     returns — the registration detail that causes touch jank. */
  async function recordWindowScrollRegistrations(page: Page) {
    await page.addInitScript(() => {
      const registrations: { passive: boolean }[] = [];
      (window as unknown as Record<string, unknown>).__scrollRegistrations =
        registrations;

      const addEventListener = window.addEventListener.bind(window);
      window.addEventListener = function patched(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (type === "scroll") {
          registrations.push({
            passive: typeof options === "object" && options.passive === true,
          });
        }
        return addEventListener(
          type as keyof WindowEventMap,
          listener as EventListener,
          options,
        );
      } as typeof window.addEventListener;
    });
  }

  function scrollRegistrations(page: Page) {
    return page.evaluate(
      () =>
        (window as unknown as { __scrollRegistrations: { passive: boolean }[] })
          .__scrollRegistrations,
    );
  }

  /* 1440 so the rail's gated subscription is live too, 375 so the phone width
     — where a blocking handler is felt — is covered with only the FAB's. */
  for (const width of [375, 1440] as const) {
    test(`every window scroll listener is passive at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await recordWindowScrollRegistrations(page);
      await page.goto("/");

      /* Both subscriptions register on hydration, and the reveal is the
         observable proof that the FAB's has: polling on it avoids asserting
         against an empty list. */
      await revealBackToTop(page);

      const registrations = await scrollRegistrations(page);
      expect(
        registrations.length,
        "the homepage should register at least one window scroll listener",
      ).toBeGreaterThan(0);
      expect(
        registrations.filter(({ passive }) => !passive),
        "no window scroll listener should be registered non-passive",
      ).toEqual([]);
    });
  }

  test("back to top hides again below its threshold", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/");

    await revealBackToTop(page);

    await page.evaluate(() => window.scrollTo(0, 0));
    /* Located by attribute, not by role: once hidden the button leaves the
       accessibility tree, which is the state under assertion. */
    await expect(
      page.locator(`button[aria-label="${BACK_TO_TOP_LABEL}"]`),
    ).toHaveAttribute("aria-hidden", "true");
  });
});

test.describe("keyboard order", () => {
  for (const width of [375, 1440] as const) {
    test(`every route's first main focus target stays in the first viewport at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });

      for (const route of routesUsingTheSharedShell) {
        await page.goto(route);
        await removeDevOverlay(page);

        await page.keyboard.press("Tab");
        await expect(page.locator(":focus")).toHaveAttribute(
          "href",
          "#main-content",
        );

        await page.keyboard.press("Tab");
        const firstMainTarget = page.locator("main :focus");
        const box = await firstMainTarget.boundingBox();
        expect(
          box,
          `${route} should render its first main focus target`,
        ).not.toBeNull();
        expect(
          box!.y,
          `${route} target should start in the viewport`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          box!.y + box!.height,
          `${route} target should end in the viewport`,
        ).toBeLessThanOrEqual(800);
      }
    });
  }
});
