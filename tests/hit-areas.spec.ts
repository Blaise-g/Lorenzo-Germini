/* Effective hit areas (#87).
 *
 * `.touch-target` guaranteed `min-height: 1.5rem` — 24px, despite the name. That
 * passes WCAG 2.2 SC 2.5.8, which asks for 24×24, so this was never a
 * conformance failure; it was a thumb problem and a misleadingly named class.
 * The fix is a centred transparent `::after` overlay rather than a taller box,
 * because raising `min-height` to 2.75rem would reflow the footer row, the CV
 * address block and the section nav — a visible composition change to fix an
 * invisible one.
 *
 * The overlay creates a second obligation the ticket called out: an expanded
 * target must not reach into its neighbour's, or a thumb aimed between two links
 * fires whichever painted last. Dense wrapped rows therefore carry deliberate
 * vertical gaps, measured rather than guessed. */
import { expect, test } from "@playwright/test";

import { fixtureRoute } from "./support/writing-fixtures";

const routes = ["/", "/cv", fixtureRoute("3")] as const;

/** 375 is where the 44px expansion is for, so that is where it is required.
 *  1024 is where the overlap rule has to be re-checked rather than assumed: the
 *  sticky rail is `hidden lg:block`, so a 375-only sweep cannot see it at all —
 *  and it was overlapping six links deep until this width was added here. */
const widths = [375, 1024] as const;

/** The site's two documented sub-44px targets, and why each one is allowed.
 *  Anything else appearing here should be fixed, not added to this list. */
const ALLOWED_UNDER_44 = [
  /* Both sit inline inside one running 12px colophon sentence that wraps. A 44px
     hit area there needs roughly 3.7× the leading of the smallest type on the
     site, and short of that the overlays overlap each other and the nav row
     above. They hold the 24px SC 2.5.8 floor explicitly instead. */
  "RSS feed →",
  "/llms.txt",
];

type Measured = {
  label: string;
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

async function measureHitAreas(page: import("@playwright/test").Page) {
  return page.evaluate((): Measured[] => {
    const interactive = [
      ...document.querySelectorAll<HTMLElement>(
        "a[href], button, input, [role=button]",
      ),
    ].filter((el) => {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden")
        return false;
      /* The hidden Back to top is `pointer-events-none` and `scale-95`, so its
         41.8px is a state no thumb can reach. The skip link is 1×1 until
         focused. Neither is a target. */
      if (style.pointerEvents === "none") return false;
      if (el.className.includes("sr-only")) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    return interactive.map((el) => {
      const rect = el.getBoundingClientRect();
      const after = getComputedStyle(el, "::after");
      /* The pointer lands on the union of the element's own box and its overlay,
         so the overlay's minimums are what this has to measure — reading the
         element's box alone would report the 24px the fix deliberately left
         alone. */
      const expands =
        after.content !== "none" &&
        after.position === "absolute" &&
        after.minWidth === "44px";
      const width = expands ? Math.max(rect.width, 44) : rect.width;
      const height = expands ? Math.max(rect.height, 44) : rect.height;
      const centreX = rect.x + rect.width / 2;
      const centreY = rect.y + rect.height / 2;

      return {
        label: (
          el.getAttribute("aria-label") ||
          el.textContent ||
          el.tagName
        ).trim(),
        width,
        height,
        left: centreX - width / 2,
        right: centreX + width / 2,
        top: centreY - height / 2,
        bottom: centreY + height / 2,
      };
    });
  });
}

test.describe("effective hit areas", () => {
  for (const route of routes) {
    test(`${route} expands every target to 44px`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(route);

      const measured = await measureHitAreas(page);
      expect(measured.length).toBeGreaterThan(0);

      const undersized = measured
        /* 43.5 not 44: subpixel layout puts a nominally 44px overlay at 43.98. */
        .filter((box) => box.width < 43.5 || box.height < 43.5)
        .filter((box) => !ALLOWED_UNDER_44.includes(box.label))
        .map((box) => `${box.label} ${box.width}×${box.height}`);

      expect(undersized).toEqual([]);
    });

    for (const width of widths) {
      test(`${route} at ${width} expands no target into its neighbour's`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 812 });
        await page.goto(route);

        const measured = await measureHitAreas(page);
        const overlaps: string[] = [];

        for (let i = 0; i < measured.length; i++) {
          for (let j = i + 1; j < measured.length; j++) {
            const a = measured[i];
            const b = measured[j];
            const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            /* Half a pixel of tolerance: rows tuned to meet exactly at 44px
               pitch report a hairline of contact from subpixel rounding. It
               cannot hide a real defect — the smallest overlap this ever caught
               was 4px, and the rail's were 16px. */
            if (x > 0.5 && y > 0.5) {
              overlaps.push(
                `"${a.label}" × "${b.label}" ${x.toFixed(1)}×${y.toFixed(1)}`,
              );
            }
          }
        }

        expect(overlaps).toEqual([]);
      });
    }
  }

  test("the sticky rail holds the 24px floor without the 44px overlay", async ({
    page,
  }) => {
    /* The rail opts out of the expansion — on a 28px pitch a centred 44px
       overlay reaches into both neighbours, and widening the pitch would push
       `CV →` out of an 800px viewport. It renders only at `lg`, where there is a
       pointer, and each row is 220px wide. The floor still has to hold, and
       `py-1.5` on 12px type is all that holds it. */
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/");

    const rail = page.getByRole("complementary", {
      name: "Profile and page sections",
    });
    const links = await rail.getByRole("link").all();
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(24);
      expect(box!.width).toBeGreaterThanOrEqual(24);
    }
  });

  test("the colophon's inline links still hold the 24px WCAG floor", async ({
    page,
  }) => {
    /* The exception above is a licence to stay at 24px, not to drop below it —
       the bare text box measures 16px, so the floor is set explicitly and this
       is what stops it being lost again. */
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const measured = await measureHitAreas(page);
    const colophon = measured.filter((box) =>
      ALLOWED_UNDER_44.includes(box.label),
    );

    expect(colophon).toHaveLength(ALLOWED_UNDER_44.length);
    for (const box of colophon) {
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.height).toBeGreaterThanOrEqual(24);
    }
  });
});
