/* The identity portrait (#86, plus the studio replacement).
 *
 * The source is a 4:5 studio portrait served from `/public` rather than the
 * GitHub avatar CDN, and the flat site draws it in one frame beside the
 * subhead: 56×70 on screen, 96×120 on paper. Both are 4:5 because a square
 * frame centre-crops the face out of a 4:5 source — the subject's head
 * occupies the top third. The 144×180 rail frame retired with the rail
 * (#141, decision 12).
 *
 * The monochrome is warm rather than `grayscale`, which is the point: neutral
 * grey against warm paper is the one place the system's "warm" claim visibly
 * breaks, and it breaks harder the larger the portrait gets. */
import { expect, test } from "@playwright/test";

import { RESUME_DATA } from "@/data/resume-data";
import { setTheme, themes } from "./support/theme";

const BAND = { width: 56, height: 70 };
/** The printed slot: `print:h-[120px] print:w-24`, deliberately larger than
 *  the screen frame, because on paper the portrait is the identity's anchor. */
const BAND_PRINT = { width: 96, height: 120 };

test("the portrait is local and 4:5, not a remote avatar", async ({
  request,
}) => {
  /* Root-relative so `next/image` optimizes it. A remote URL here also meant a
     `remotePatterns` entry and two preconnect hints for a host nothing else
     used. */
  expect(RESUME_DATA.avatarUrl.startsWith("/")).toBe(true);

  /* Through the `request` fixture, so `baseURL` carries `PLAYWRIGHT_PORT` — a
     hardcoded origin here breaks the suite on a moved port. */
  const response = await request.get(RESUME_DATA.avatarUrl);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image");
});

test("the band frame is 56×70 and declares that width to the optimizer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const frame = page.getByTestId("flat-site-intro").locator(".portrait-warm");
  const box = await frame.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box!.width)).toBe(BAND.width);
  expect(Math.round(box!.height)).toBe(BAND.height);

  /* Two elements, one per medium, because `sizes` takes no print condition and
     this one frame is 56px on screen and 96px on paper. The screen element is
     the visible one here; the print element is asserted below. */
  await expect(frame.locator("img:visible")).toHaveAttribute(
    "sizes",
    `${BAND.width}px`,
  );
});

test("the band serves its 96px printed slot rather than upscaling the 56px file", async ({
  page,
}) => {
  /* The defect this splits: with a single `sizes="56px"` element, print at DPR 1
     picked the 64w candidate for a 96px slot — a ~1.5× upscale on the one
     surface where the portrait is deliberately largest. Raising the shared value
     to `96px` instead cost the screen 128w → 256w at DPR 2, which is the
     regression #86 fixed by moving off `96px`. Two elements cost nothing,
     because a hidden image is never fetched — asserted in the next test. */
  await page.emulateMedia({ media: "print" });
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/");

  const frame = page.getByTestId("flat-site-intro").locator(".portrait-warm");
  const box = await frame.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box!.width)).toBe(BAND_PRINT.width);
  expect(Math.round(box!.height)).toBe(BAND_PRINT.height);

  const printed = frame.locator("img:visible");
  await expect(printed).toHaveAttribute("sizes", `${BAND_PRINT.width}px`);

  /* The assertion that matters is the file the browser actually chose, not the
     declaration: `sizes` is only an input to candidate selection. */
  await expect
    .poll(async () =>
      printed.evaluate((img: HTMLImageElement) =>
        img.currentSrc
          ? new URL(img.currentSrc, location.href).searchParams.get("w")
          : null,
      ),
    )
    .toBe(String(BAND_PRINT.width));
});

test("only the medium's own portrait is fetched, so the split costs nothing", async ({
  page,
}) => {
  /* The premise the two-element split rests on, and the one a previous pass got
     wrong: `loading="lazy"` on a `display: none` image does not merely defer the
     request, it never makes it — a hidden image has no box, so no viewport
     proximity to trigger on. If that ever stopped holding, every page would pay
     for portraits it does not paint and the split would become a real cost. */
  const widths: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url(), "http://localhost");
    if (url.pathname.startsWith("/_next/image")) {
      widths.push(url.searchParams.get("w")!);
    }
  });

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });

  /* The screen element is the only painted one: its 56px slot at DPR 1 takes
     the 64w candidate, and the 96px print element is not requested at all. */
  expect(widths).toEqual(["64"]);
});

test("both slots are 4:5, so neither centre-crops the face", () => {
  /* Asserted against the constants the two tests above measure the live frames
     against, rather than by re-measuring: a slot that drifts off 4:5 fails there
     on its exact dimensions, and this states the reason those numbers are the
     numbers. */
  expect(BAND.width / BAND.height).toBeCloseTo(4 / 5, 5);
  expect(BAND_PRINT.width / BAND_PRINT.height).toBeCloseTo(4 / 5, 5);
});

for (const theme of themes) {
  test(`${theme} mode tints the portrait warm rather than neutral grey`, async ({
    page,
  }) => {
    await setTheme(page, theme);
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/");

    const filter = await page
      .locator(".portrait-warm")
      .first()
      .evaluate((el) => getComputedStyle(el).filter);

    /* A plain `grayscale(1)` is exactly the defect this replaced. */
    expect(filter).toContain("grayscale(1)");
    expect(filter).not.toBe("grayscale(1)");
    expect(filter).toContain("sepia(");

    /* The assertion that matters is the painted result, not the declaration.
       `ctx.filter` runs the same filter implementation as CSS, so sampling a
       filtered draw reports what the page actually puts on screen. */
    const sample = await page.evaluate(
      async ([src, appliedFilter]) => {
        const image = new Image();
        image.src = src;
        await image.decode();

        const canvas = document.createElement("canvas");
        canvas.width = 144;
        canvas.height = 180;
        const ctx = canvas.getContext("2d")!;
        ctx.filter = appliedFilter;
        ctx.drawImage(image, 0, 0, 144, 180);

        /* The studio backdrop, well clear of the subject. */
        const [r, g, b] = ctx.getImageData(8, 8, 1, 1).data;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        return { r, g, b, spread: max - min };
      },
      [RESUME_DATA.avatarUrl, filter] as const,
    );

    /* Warm means red ≥ green ≥ blue with real separation. Neutral grey is
       spread 0, which is what `grayscale` alone produces. */
    expect(sample.spread).toBeGreaterThan(8);
    expect(sample.r).toBeGreaterThanOrEqual(sample.g);
    expect(sample.g).toBeGreaterThanOrEqual(sample.b);
  });
}

test("print neutralizes the dark knock-back", async ({ page }) => {
  /* The repo's documented blind spot, one property wider than the token block:
     `@media print` reassigns colours for `.dark`, but the dark portrait rule is
     a `filter`, which no token override can reach. Printing from dark mode would
     otherwise put the knocked-back portrait onto white paper. */
  const filters: string[] = [];

  for (const theme of themes) {
    await setTheme(page, theme);
    await page.emulateMedia({ media: "print", colorScheme: theme });
    await page.setViewportSize({ width: 800, height: 1100 });
    await page.goto("/");

    filters.push(
      await page
        .locator(".portrait-warm")
        .first()
        .evaluate((el) => getComputedStyle(el).filter),
    );
  }

  expect(filters[0]).toBe(filters[1]);
  /* Equality alone would also hold if print had settled on the dark value for
     both, which is the very outcome this guards against. */
  for (const filter of filters) {
    expect(filter).not.toContain("brightness(0.78)");
  }
});
