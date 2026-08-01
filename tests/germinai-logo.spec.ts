import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { WARM_PRINT } from "@/lib/warm-print";

import { hexChannels } from "./support/color";

const LOGO_SOURCE = "public/germinai-logo.svg";

const RASTER_ASSETS = [
  { path: "public/icon-192x192.png", size: 192 },
  { path: "public/icon-512x512.png", size: 512 },
  { path: "src/app/apple-icon.png", size: 180 },
] as const;

function svgColors(source: string) {
  return [...source.matchAll(/#[\da-f]{6}/gi)].map(([color]) =>
    color.toLowerCase(),
  );
}

test.describe("germinai publication mark", () => {
  test("keeps one reproducible square SVG in the signed Warm Print palette", () => {
    const source = readFileSync(LOGO_SOURCE, "utf8");
    const palette = new Set([
      WARM_PRINT.light.ground,
      WARM_PRINT.light.ink,
      WARM_PRINT.light.accent,
    ]);

    expect(source).toContain('viewBox="0 0 512 512"');
    expect(source).toContain('aria-label="germinai publication logo"');
    expect(new Set(svgColors(source))).toEqual(palette);
    expect(source).not.toMatch(
      /<(?:filter|linearGradient|radialGradient|text)\b/,
    );
  });

  test("ships raster derivatives that exactly match the vector source", async () => {
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

  test("keeps the growth layer visible at favicon size", async () => {
    const { data, info } = await sharp(LOGO_SOURCE)
      .resize(16, 16)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const accent = hexChannels(WARM_PRINT.light.accent);

    let visibleAccentPixels = 0;
    for (let offset = 0; offset < data.length; offset += info.channels) {
      const distance = Math.max(
        Math.abs(data[offset] - accent[0]),
        Math.abs(data[offset + 1] - accent[1]),
        Math.abs(data[offset + 2] - accent[2]),
      );
      if (distance <= 48) visibleAccentPixels += 1;
    }

    expect(visibleAccentPixels).toBeGreaterThanOrEqual(12);
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
          .png()
          .toBuffer();

        expect(metadata.height, `${size}px favicon height`).toBe(size);
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
          src: "/germinai-logo.svg",
          type: "image/svg+xml",
        }),
        expect.objectContaining({
          sizes: "512x512",
          src: "/icon-512x512.png",
        }),
      ]),
    );
  });
});
