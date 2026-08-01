import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

import { WARM_PRINT } from "../src/lib/warm-print.ts";

const root = resolve(import.meta.dirname, "..");
const { accent, ground, ink } = WARM_PRINT.light;
const palette = [ground, ink, accent].map((hex) =>
  hex
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16)),
);

async function normalizedSquare(sourcePath) {
  const approvedConcept = await readFile(resolve(root, sourcePath));
  const normalizedPixels = await sharp(approvedConcept)
    .resize(1024, 1024)
    .removeAlpha()
    .raw()
    .toBuffer();

  for (let offset = 0; offset < normalizedPixels.length; offset += 3) {
    const nearest = palette.reduce(
      (best, color) => {
        const distance = color.reduce(
          (total, channel, index) =>
            total + (normalizedPixels[offset + index] - channel) ** 2,
          0,
        );
        return distance < best.distance ? { color, distance } : best;
      },
      { color: palette[0], distance: Number.POSITIVE_INFINITY },
    );
    normalizedPixels.set(nearest.color, offset);
  }

  return sharp(normalizedPixels, {
    raw: { channels: 3, height: 1024, width: 1024 },
  })
    .png()
    .toBuffer();
}

const source = await normalizedSquare("vendor/brand/germinai-logo-source.png");
const wordmarkSquare = await normalizedSquare(
  "vendor/brand/germinai-wordmark-source.png",
);
const wordmark = await sharp(wordmarkSquare)
  .trim({ background: ground, threshold: 0 })
  .extend({
    background: ground,
    bottom: 56,
    left: 80,
    right: 80,
    top: 56,
  })
  .png()
  .toBuffer();

await writeFile(resolve(root, "public/germinai-logo.png"), source);
await writeFile(
  resolve(root, "public/germinai-wordmark-square.png"),
  wordmarkSquare,
);
await writeFile(resolve(root, "public/germinai-wordmark.png"), wordmark);

const pngTargets = [
  { path: "public/icon-192x192.png", size: 192 },
  { path: "public/icon-512x512.png", size: 512 },
  { path: "src/app/apple-icon.png", size: 180 },
];

await Promise.all(
  pngTargets.map(async (target) => {
    const output = await sharp(source)
      .resize(target.size, target.size)
      .png()
      .toBuffer();
    await writeFile(resolve(root, target.path), output);
  }),
);

const faviconSizes = [16, 32, 48];
const faviconFrames = await Promise.all(
  faviconSizes.map((size) =>
    sharp(source).resize(size, size).ensureAlpha().png().toBuffer(),
  ),
);
const directorySize = 6 + faviconFrames.length * 16;
const header = Buffer.alloc(directorySize);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(faviconFrames.length, 4);

let imageOffset = directorySize;
faviconFrames.forEach((frame, index) => {
  const entryOffset = 6 + index * 16;
  const size = faviconSizes[index];
  header.writeUInt8(size, entryOffset);
  header.writeUInt8(size, entryOffset + 1);
  header.writeUInt8(0, entryOffset + 2);
  header.writeUInt8(0, entryOffset + 3);
  header.writeUInt16LE(1, entryOffset + 4);
  header.writeUInt16LE(32, entryOffset + 6);
  header.writeUInt32LE(frame.length, entryOffset + 8);
  header.writeUInt32LE(imageOffset, entryOffset + 12);
  imageOffset += frame.length;
});

await writeFile(
  resolve(root, "src/app/favicon.ico"),
  Buffer.concat([header, ...faviconFrames]),
);
