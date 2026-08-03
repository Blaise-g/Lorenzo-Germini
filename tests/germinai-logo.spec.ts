import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { WARM_PRINT } from "@/lib/warm-print";

import { imageColors, paletteClasses } from "./support/color";

const LOGO_SOURCE = "public/germinai-logo.png";
const APPROVED_CONCEPT = "vendor/brand/germinai-logo-source.png";
const WORDMARK_SOURCE = "vendor/brand/germinai-wordmark-source.png";
const WORDMARK_SQUARE = "public/germinai-wordmark-square.png";
const WORDMARK = "public/germinai-wordmark.png";
const SUBSTACK_WORDMARK = "public/germinai-wordmark-substack.png";

test.describe("germinai publication mark", () => {
  test("keeps one reproducible raster master in the signed Warm Print palette", async () => {
    const approved = await sharp(APPROVED_CONCEPT).metadata();
    const metadata = await sharp(LOGO_SOURCE).metadata();
    const palette = new Set([
      WARM_PRINT.light.ground,
      WARM_PRINT.light.ink,
      WARM_PRINT.light.accent,
    ]);

    expect(approved.width).toBeGreaterThanOrEqual(1024);
    expect(approved.height).toBe(approved.width);
    expect({ height: metadata.height, width: metadata.width }).toEqual({
      height: 1024,
      width: 1024,
    });
    expect(await imageColors(LOGO_SOURCE)).toEqual(palette);
  });

  test("preserves the approved concept silhouette and color layers", async () => {
    const [approved, shipped] = await Promise.all([
      paletteClasses(APPROVED_CONCEPT),
      paletteClasses(LOGO_SOURCE),
    ]);
    const comparedPixels = approved.filter(
      (approvedClass, index) => approvedClass !== 0 || shipped[index] !== 0,
    ).length;
    const mismatchedPixels = approved.filter(
      (approvedClass, index) => approvedClass !== shipped[index],
    ).length;

    expect(mismatchedPixels / comparedPixels).toBeLessThan(0.04);
  });

  test("keeps square and horizontal terracotta-ai wordmarks", async () => {
    const [approved, square, horizontal, approvedClasses, squareClasses] =
      await Promise.all([
        sharp(WORDMARK_SOURCE).metadata(),
        sharp(WORDMARK_SQUARE).metadata(),
        sharp(WORDMARK).metadata(),
        paletteClasses(WORDMARK_SOURCE),
        paletteClasses(WORDMARK_SQUARE),
      ]);
    const mismatch = approvedClasses.filter(
      (approvedClass, index) => approvedClass !== squareClasses[index],
    ).length;

    expect(approved.width).toBeGreaterThanOrEqual(1024);
    expect({ height: square.height, width: square.width }).toEqual({
      height: 1024,
      width: 1024,
    });
    expect(horizontal.width! / horizontal.height!).toBeGreaterThan(2);
    expect(mismatch / approvedClasses.length).toBeLessThan(0.04);
    expect(await imageColors(WORDMARK_SQUARE)).toEqual(
      await imageColors(LOGO_SOURCE),
    );
    expect(await imageColors(WORDMARK)).toEqual(await imageColors(LOGO_SOURCE));
  });

  test("ships a transparent Substack wordmark at the recommended dimensions", async () => {
    const { data, info } = await sharp(SUBSTACK_WORDMARK)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const opaqueColors = new Set<string>();
    let transparentPixels = 0;

    for (let offset = 0; offset < data.length; offset += info.channels) {
      const alpha = data[offset + 3];
      if (alpha === 0) {
        transparentPixels += 1;
        continue;
      }
      opaqueColors.add(
        `#${[data[offset], data[offset + 1], data[offset + 2]]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("")}`,
      );
    }

    expect({
      channels: info.channels,
      height: info.height,
      width: info.width,
    }).toEqual({ channels: 4, height: 256, width: 1344 });
    expect(transparentPixels).toBeGreaterThan(info.width * info.height * 0.5);
    expect(opaqueColors).toEqual(
      new Set([WARM_PRINT.light.ink, WARM_PRINT.light.accent]),
    );
  });
});
