import { type APIRequestContext, expect, test } from "@playwright/test";
import sharp from "sharp";

import { RESUME_DATA } from "@/data/resume-data";
import { OG_FONT, ogFonts } from "@/lib/og-fonts";
import { WARM_PRINT } from "@/lib/warm-print";

import { hexChannels } from "./support/color";

/* Sampled from the frame's structural margins, outside the padding box, so the
   probes stay clear of glyphs: a probe grazing the accent italic would fail
   antialiasing with a message about the ground colour. */
const GROUND_PROBES = [
  [24, 24],
  [1176, 24],
  [24, 606],
  [1176, 606],
  [600, 24],
  [600, 606],
  [24, 315],
  [1176, 315],
  [1160, 200],
  [1160, 460],
] as const;

async function renderedCard(request: APIRequestContext) {
  const response = await request.get("/opengraph-image");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  return sharp(await response.body())
    .raw()
    .toBuffer({ resolveWithObject: true });
}

test.describe("homepage OpenGraph card", () => {
  test("renders flat warm paper at the platforms' declared size", async ({
    request,
  }) => {
    const { size } = await import("@/app/opengraph-image");
    const { data, info } = await renderedCard(request);

    expect({ height: info.height, width: info.width }).toEqual(size);

    /* The incumbent card faked depth with a 135° gradient, which any single
       sample happily passes — so probe the whole frame, not one corner. */
    const ground = hexChannels(WARM_PRINT.light.ground);
    const drift = GROUND_PROBES.map(([x, y]) => {
      const offset = (y * info.width + x) * info.channels;
      return Math.max(
        Math.abs(data[offset] - ground[0]),
        Math.abs(data[offset + 1] - ground[1]),
        Math.abs(data[offset + 2] - ground[2]),
      );
    });

    expect(Math.max(...drift)).toBe(0);
  });

  test("keeps terracotta present but never a large fill", async ({
    request,
  }) => {
    const { data, info } = await renderedCard(request);
    const [red, green, blue] = hexChannels(WARM_PRINT.light.accent);

    let accentPixels = 0;
    for (let offset = 0; offset < data.length; offset += info.channels) {
      if (
        Math.abs(data[offset] - red) <= 24 &&
        Math.abs(data[offset + 1] - green) <= 24 &&
        Math.abs(data[offset + 2] - blue) <= 24
      ) {
        accentPixels += 1;
      }
    }

    /* As composed: ~1.0% of the frame, the opening mark (0.05%) plus the
       italic positioning line. The floor catches terracotta dropping out of
       the card entirely; the ceiling catches it becoming a fill, which
       CONTEXT.md forbids for this role. */
    const share = accentPixels / (info.width * info.height);
    expect(share).toBeGreaterThan(0.002);
    expect(share).toBeLessThan(0.04);
  });

  test("names the settled role label in its unfurl metadata", async ({
    page,
  }) => {
    const { alt } = await import("@/app/opengraph-image");

    expect(alt).toBe(`${RESUME_DATA.name} — ${RESUME_DATA.roleLabel}`);

    await page.goto("/");
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      alt,
    );
  });

  test("ships the display and metadata faces Satori cannot resolve by name", () => {
    const fonts = ogFonts();

    expect(
      fonts.map(({ name, style, weight }) => `${name} ${weight} ${style}`),
    ).toEqual([
      `${OG_FONT.display} 600 normal`,
      `${OG_FONT.display} 600 italic`,
      `${OG_FONT.text} 400 normal`,
      `${OG_FONT.mono} 400 normal`,
    ]);

    for (const font of fonts) {
      /* TrueType's `0x00010000` version tag — a truncated or LFS-pointer file
         would still be a Buffer, and Satori would silently fall back. */
      expect(font.data.readUInt32BE(0)).toBe(0x00010000);
      expect(font.data.byteLength).toBeGreaterThan(20_000);
    }

    expect(
      ogFonts("upright").map(
        ({ name, style, weight }) => `${name} ${weight} ${style}`,
      ),
    ).toEqual([
      `${OG_FONT.display} 600 normal`,
      `${OG_FONT.text} 400 normal`,
      `${OG_FONT.mono} 400 normal`,
    ]);
  });
});
