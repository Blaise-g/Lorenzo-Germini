/* The cascade guard for `globals.css`'s component utilities (#87).
 *
 * `.touch-target` was declared outside every layer, and an unlayered rule beats
 * every layered one regardless of specificity. Tailwind v4 emits its utilities
 * into `@layer utilities`, so `hidden`, `lg:hidden` and `print:hidden` could not
 * hide anything carrying `.touch-target` — the homepage hero CTA computed
 * `display: flex` under print emulation and printed onto the page. `@layer
 * utilities` would not have fixed it either: same layer and same specificity, so
 * source order decides and this file is appended after Tailwind's own utilities.
 *
 * These tests assert the outcome rather than the mechanism, so a future
 * refactor that reintroduces the trap by any route fails here. They sweep every
 * hide utility actually present in the DOM instead of spot-checking known
 * offenders, because the value of the fix is the trap it removes for the next
 * component, not the one element it unblocked. */
import { expect, test } from "@playwright/test";

import { setTheme, themes } from "./support/theme";

const routes = ["/", "/cv", "/writing", "/writing/fixture/1"] as const;

/** Every element carrying a `print:hidden` that still computes as displayed. */
async function leakedPrintHidden(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[class*="print:hidden"]')]
      .filter((el) => getComputedStyle(el).display !== "none")
      .map((el) => `${el.tagName.toLowerCase()}.${el.className.slice(0, 70)}`),
  );
}

test.describe("hide utilities actually hide", () => {
  for (const route of routes) {
    /* Both modes, because print emulation entered from dark is the repo's
       documented blind spot: the `@media print` block reassigns tokens for
       `.dark`, and anything it cannot reach keeps whatever was on screen. */
    for (const theme of themes) {
      test(`${route} in ${theme} mode hides every print:hidden under print emulation`, async ({
        page,
      }) => {
        await setTheme(page, theme);
        await page.emulateMedia({ media: "print", colorScheme: theme });
        await page.goto(route);
        await page.evaluate(() => document.fonts.ready);

        /* Sanity: the sweep is only meaningful if the route actually carries
           some. A selector that silently matches nothing passes vacuously. */
        const total = await page.locator('[class*="print:hidden"]').count();
        expect(total).toBeGreaterThan(0);

        expect(await leakedPrintHidden(page)).toEqual([]);
      });
    }
  }

  test("the homepage hero CTA does not print", async ({ page }) => {
    /* The one element the unlayered rule demonstrably broke, kept as a named
       regression rather than left to the sweep above. */
    await page.emulateMedia({ media: "print" });
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /start with the writing/i }),
    ).toBeHidden();
  });

  test("a breakpoint-hidden touch target is hidden at that breakpoint", async ({
    page,
  }) => {
    /* `lg:hidden` on the homepage's anchor row, whose links carry
       `.touch-target`. Below lg the row shows; from lg up it must not, and the
       rail replaces it. */
    const anchorRow = page.getByRole("navigation", { name: "On this page" });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(anchorRow).toBeVisible();

    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(anchorRow).toBeHidden();
    /* The links themselves, not just the container: `display: none` on a parent
       would mask a child that still refuses to hide. */
    for (const link of await anchorRow.getByRole("link").all()) {
      await expect(link).toBeHidden();
    }
  });

  test("the one filled control still darkens on hover", async ({ page }) => {
    /* The other half of the layer split. `.primary-control:hover` has to beat
       the `bg-accent` utility it darkens, so it lives in `utilities` where
       specificity decides — moved into `components` it lost silently and the
       system's only filled control stopped reacting at all. */
    await page.goto("/writing");
    const submit = page.getByRole("button", { name: /continue on substack/i });

    const initial = await submit.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    await submit.hover();
    await expect
      .poll(() => submit.evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe(initial);
  });
});
