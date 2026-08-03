import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { WARM_PRINT } from "@/lib/warm-print";

import { paletteClasses } from "./support/color";

const GENERATED_CONCEPT = "vendor/brand/lorenzo-germini-mark-source.png";
const MARK_SOURCE = "public/lorenzo-germini-mark.png";
const PUBLICATION_MARK = "public/germinai-logo.png";

const RASTER_ASSETS = [
  { path: "public/icon-192x192.png", size: 192 },
  { path: "public/icon-512x512.png", size: 512 },
  { path: "src/app/apple-icon.png", size: 180 },
] as const;

test.describe("Lorenzo Germini personal mark", () => {
  test("cleans only the generated concept's colors, not its geometry", async () => {
    const [generated, master] = await Promise.all([
      paletteClasses(GENERATED_CONCEPT, 1024),
      paletteClasses(MARK_SOURCE, 1024),
    ]);

    expect(master).toEqual(generated);
  });

  test("ships every personal icon from one deterministic source", async () => {
    for (const asset of RASTER_ASSETS) {
      const shipped = readFileSync(asset.path);
      const regenerated = await sharp(MARK_SOURCE)
        .resize(asset.size, asset.size)
        .png()
        .toBuffer();

      expect(await sharp(shipped).metadata(), asset.path).toMatchObject({
        height: asset.size,
        width: asset.size,
      });
      expect(shipped.equals(regenerated), `${asset.path} is stale`).toBe(true);
    }
  });

  test("remains distinct and uses all three Warm Print roles at 16px", async () => {
    const [personal, publication] = await Promise.all([
      paletteClasses(MARK_SOURCE, 16),
      paletteClasses(PUBLICATION_MARK, 16),
    ]);
    const coverage = personal.filter((color) => color !== 0).length;
    const mismatch = personal.filter(
      (color, index) => color !== publication[index],
    ).length;

    expect(new Set(personal)).toEqual(new Set([0, 1, 2]));
    expect(coverage / personal.length).toBeGreaterThanOrEqual(0.18);
    expect(mismatch / personal.length).toBeGreaterThan(0.25);
  });

  test("packs reproducible 16px, 32px, and 48px favicon frames", async () => {
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
        const regenerated = await sharp(MARK_SOURCE)
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

  test("publishes only personal icon assets from the manifest", async ({
    request,
  }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);

    expect((await response.json()).icons).toEqual([
      {
        sizes: "192x192",
        src: "/icon-192x192.png",
        type: "image/png",
      },
      {
        sizes: "512x512",
        src: "/icon-512x512.png",
        type: "image/png",
      },
    ]);
  });
});
