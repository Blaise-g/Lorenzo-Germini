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
      const own = el.getBoundingClientRect();
      const after = getComputedStyle(el, "::after");
      const hasOverlay =
        after.content !== "none" && after.position === "absolute";
      /* The pointer lands on the union of the element's own box and its overlay,
         so the overlay's minimums are what this has to measure — reading the
         element's box alone would report the 24px the fix deliberately left
         alone. */
      const expands = hasOverlay && after.minWidth === "44px";
      /* The other overlay in the system is the essay card's: `after:inset-0` over
         a `relative` article, so the whole card is the target and the anchor's own
         box is a fraction of it. Measured, `EssayLink` reported 276×25 at 375 once
         #89 gave `/writing` its full measure back and the title stopped wrapping
         to two lines — a title one line shorter would have reported it at any
         point before that, because the anchor was never the hit area. */
      const stretched = hasOverlay && after.inset === "0px";
      /* `offsetParent` is the abs containing block for every case in this
         codebase — the essay card's `relative` article — but it is not that in
         general: `transform`, `filter` and `contain` establish one without
         `position`. So the walk is checked rather than assumed. An overlay whose
         `offsetParent` is not positioned reports its own box and fails the 44px
         sweep, rather than silently passing on a box that is not its target. */
      const container =
        stretched &&
        el.offsetParent &&
        getComputedStyle(el.offsetParent).position !== "static"
          ? el.offsetParent
          : null;
      const rect = container ? container.getBoundingClientRect() : own;
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

  /* The nav, not the whole `complementary`: the aside also holds the profile's
     action cluster, whose four links sit side by side on one row. They share a
     `y`, so a vertical-pitch assertion reads them as a 44px overlap — the
     horizontal sweep above is what covers those. */
  const railLinks = (page: import("@playwright/test").Page) =>
    page.getByRole("navigation", { name: "Page sections" }).getByRole("link");

  test("the sticky rail holds the 24px floor for a fine pointer", async ({
    page,
  }) => {
    /* The rail opts out of `.touch-target`, and the pitch is why: at 28px a
       centred 44px overlay reaches 8px into each neighbour, so the overlay
       collides with itself at any pitch below 44. A cursor does not need the
       expansion — each row is 220×28, well past SC 2.5.8's 24×24 — but the floor
       still has to hold, and `py-1.5` on 12px type is all that holds it. */
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/");

    const links = await railLinks(page).all();
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(24);
      expect(box!.width).toBeGreaterThanOrEqual(24);
    }
  });

  test.describe("the sticky rail under a coarse pointer", () => {
    /* iPad landscape is 1024 wide with no pointer, which is the case the rail's
       old reasoning assumed away: `lg` is a viewport width, not an input device.
       `hasTouch` is what makes `(pointer: coarse)` match in Chromium. */
    test.use({ hasTouch: true, viewport: { width: 1024, height: 800 } });

    test("grows every row to a real 44px box, not an overlay", async ({
      page,
    }) => {
      await page.goto("/");

      /* The premise. If this stops matching, the rows below silently fall back
         to 28px and the rest of this file would not notice. */
      expect(
        await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
      ).toBe(true);

      const links = await railLinks(page).all();
      expect(links.length).toBeGreaterThan(0);

      for (const link of links) {
        const box = await link.boundingBox();
        /* The box itself, deliberately — an overlay cannot solve this at a
           sub-44px pitch, so the fix widens the row rather than painting a
           larger hit area over it. */
        expect(box!.height).toBeGreaterThanOrEqual(43.5);
      }
    });

    test("keeps `CV →` inside the 800px viewport #86 holds it to", async ({
      page,
    }) => {
      /* The cost of the expansion, and the reason it was thought impossible:
         the previous note here put it at ~96px, which would not have fitted.
         Measured, the rail's last row ends at 790px against 694px for a fine
         pointer — inside 800, and the rail is `lg:sticky lg:top-8`, so any
         scrolling lifts it further clear. 10px of margin is thin, which is why
         this is asserted rather than left to the comment. */
      await page.goto("/");

      const box = await railLinks(page).last().boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(800);
    });

    test("expands no row into its neighbour's", async ({ page }) => {
      /* The 44px pitch is what makes the expansion safe, so it is asserted
         directly rather than left to the sweep above: rows that meet exactly at
         44px are the intended outcome, and overlap is the failure. */
      await page.goto("/");

      const boxes = await Promise.all(
        (await railLinks(page).all()).map((link) => link.boundingBox()),
      );

      for (let i = 1; i < boxes.length; i++) {
        const overlap = boxes[i - 1]!.y + boxes[i - 1]!.height - boxes[i]!.y;
        expect(overlap).toBeLessThanOrEqual(0.5);
      }
    });
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
