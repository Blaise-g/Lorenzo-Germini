import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "public/germinai-logo.svg");
const source = await readFile(sourcePath);

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
  faviconSizes.map((size) => sharp(source).resize(size, size).png().toBuffer()),
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
