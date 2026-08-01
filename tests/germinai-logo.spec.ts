import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { WARM_PRINT } from "@/lib/warm-print";

import { hexChannels } from "./support/color";

const LOGO_SOURCE = "public/germinai-logo.png";
const APPROVED_CONCEPT = "vendor/brand/germinai-logo-source.png";
const WORDMARK_SOURCE = "vendor/brand/germinai-wordmark-source.png";
const WORDMARK_SQUARE = "public/germinai-wordmark-square.png";
const WORDMARK = "public/germinai-wordmark.png";

const RASTER_ASSETS = [
  { path: "public/icon-192x192.png", size: 192 },
  { path: "public/icon-512x512.png", size: 512 },
  { path: "src/app/apple-icon.png", size: 180 },
] as const;

async function paletteClasses(path: string, size = 512) {
  const palette = [
    hexChannels(WARM_PRINT.light.ground),
    hexChannels(WARM_PRINT.light.ink),
    hexChannels(WARM_PRINT.light.accent),
  ];
  const { data, info } = await sharp(path)
    .resize(size, size)
    .flatten({ background: WARM_PRINT.light.ground })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return Array.from({ length: info.width * info.height }, (_, pixel) => {
    const offset = pixel * info.channels;
    return palette.reduce(
      (nearest, color, index) => {
        const distance = color.reduce(
          (total, channel, channelIndex) =>
            total + (data[offset + channelIndex] - channel) ** 2,
          0,
        );
        return distance < nearest.distance ? { distance, index } : nearest;
      },
      { distance: Number.POSITIVE_INFINITY, index: -1 },
    ).index;
  });
}

async function imageColors(path: string) {
  const { data, info } = await sharp(path)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const colors = new Set<string>();
  for (let offset = 0; offset < data.length; offset += info.channels) {
    colors.add(
      `#${[data[offset], data[offset + 1], data[offset + 2]]
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`,
    );
  }
  return colors;
}

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

  test("ships raster derivatives that exactly match the cleaned master", async () => {
    for (const asset of RASTER_ASSETS) {
      const shipped = readFileSync(asset.path);
      const metadata = await sharp(shipped).metadata();
      const regenerated = await sharp(LOGO_SOURCE)
        .resize(asset.size, asset.size)
        .png()
        .toBuffer();

      expect(
        { height: metadata.height, width: metadata.width },
        asset.path,
      ).toEqual({ height: asset.size, width: asset.size });
      expect(shipped.equals(regenerated), `${asset.path} is stale`).toBe(true);
    }
  });

  test("preserves the approved concept silhouette and color layers", async () => {
    const [approved, shipped] = await Promise.all([
      paletteClasses(APPROVED_CONCEPT),
      paletteClasses("public/icon-512x512.png"),
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

  test("keeps the growth layer visible at favicon size", async () => {
    const [approved, shipped] = await Promise.all([
      paletteClasses(APPROVED_CONCEPT, 16),
      paletteClasses(LOGO_SOURCE, 16),
    ]);
    const approvedAccentPixels = approved.filter((color) => color === 2).length;
    const shippedAccentPixels = shipped.filter((color) => color === 2).length;

    expect(approvedAccentPixels).toBeGreaterThan(0);
    expect(shippedAccentPixels).toBeGreaterThanOrEqual(
      Math.floor(approvedAccentPixels * 0.8),
    );
  });

  test("packs crisp 16px, 32px, and 48px favicon frames", async () => {
    const favicon = readFileSync("src/app/favicon.ico");
    const frameCount = favicon.readUInt16LE(4);
    const frames = await Promise.all(
      Array.from({ length: frameCount }, async (_, index) => {
        const entryOffset = 6 + index * 16;
        const byteLength = favicon.readUInt32LE(entryOffset + 8);
        const imageOffset = favicon.readUInt32LE(entryOffset + 12);
        const shipped = favicon.subarray(imageOffset, imageOffset + byteLength);
        const metadata = await sharp(shipped).metadata();
        const size = metadata.width!;
        const regenerated = await sharp(LOGO_SOURCE)
          .resize(size, size)
          .ensureAlpha()
          .png()
          .toBuffer();

        expect(metadata.height, `${size}px favicon height`).toBe(size);
        expect(metadata.channels, `${size}px favicon channels`).toBe(4);
        expect(shipped.equals(regenerated), `${size}px favicon is stale`).toBe(
          true,
        );
        return size;
      }),
    );

    expect(frames).toEqual([16, 32, 48]);
  });

  test("publishes the new mark from the web app manifest", async ({
    request,
  }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sizes: "1024x1024",
          src: "/germinai-logo.png",
          type: "image/png",
        }),
        expect.objectContaining({
          sizes: "512x512",
          src: "/icon-512x512.png",
        }),
      ]),
    );
  });
});
