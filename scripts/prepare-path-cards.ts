/* Turns the GPT Image card art into the ink-separation textures the path
   board reads (`src/components/path/scene/card-art.ts`). Each original in
   `vendor/path-cards/` is a two-ink risograph illustration on white; this
   unmixes every pixel into terracotta and slate-blue ink coverage, cuts the
   card out with a white margin, and writes `public/path/cards/<name>.webp`:

     R = terracotta coverage, G = slate-blue coverage, B = 0,
     A = the die-cut mask, margin included.

   The halftone screen is smoothed to continuous coverage first (it is finer
   than the board shows, and costs most of the bytes), then each card is
   encoded as `encode` says. It also writes the tileable paper grain,
   `grain.webp`.

     bun run generate:path-cards                    every card, and the grain
     bun run generate:path-cards --import <png> <name>
                                                    keep a new original, losslessly
     bun run generate:path-cards --preview <dir>    also recombine each card in a
                                                    light and a dark palette */

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { CARD_ART } from "../src/components/path/scene/card-art";

const ORIGINALS = path.join(process.cwd(), "vendor", "path-cards");
const OUT = path.join(process.cwd(), "public", "path", "cards");

/** Texels per scene unit, so every card prints at one density on the board. */
const DENSITY = 256;
const MAX_SIDE = 1024;
const MAX_BYTES = 60 * 1024;
const GRAIN_MAX_BYTES = 20 * 1024;
/** The white margin the die cut leaves around the ink, in scene units. */
const CUT_MARGIN = 0.035;

/* The inks as GPT Image prints them, measured from the originals. They only
   need to point the right way: unmixing reads each pixel's darkening along
   these two directions, and the board recolours from the path tokens. */
const TERRACOTTA: Rgb = [196, 82, 52];
const SLATE_BLUE: Rgb = [58, 84, 118];

/** Coverage below this is paper noise, not ink. */
const INK_FLOOR = 0.08;
/** Total coverage at which a pixel counts as printed, for the cut. */
const PRINTED = 0.3;
/** The halftone screen's blur, in source pixels: the screen is too fine to
 *  keep at board size and costs most of a texture's bytes, so it is smoothed
 *  to continuous coverage and the runtime's grain takes its place. */
const DESCREEN = 1.5;
/** Coverage is stored in this many steps: smaller files, no visible banding. */
const LEVELS = 32;

/** Cards whose enclosed paper is cut out rather than kept, such as the open
 *  centres of the coils, which the Mole shows through. */
const CUT_HOLES: ReadonlySet<string> = new Set(["turin-coils"]);
/** An enclosed hole is cut only above this share of the card's area. */
const MIN_HOLE = 0.004;

export type Rgb = readonly [number, number, number];

function density(value: number, paper: number): number {
  return -Math.log(Math.max(value, 1) / Math.max(paper, 1));
}

/** How much of each ink a pixel carries, from 0 to 1. The inks are modelled
 *  as filters over the paper, so their optical densities add: overprinted
 *  ink reads as both, a halftone edge as a little of one. */
export function unmix(
  pixel: Rgb,
  paper: Rgb,
  inkA: Rgb = TERRACOTTA,
  inkB: Rgb = SLATE_BLUE,
): [number, number] {
  const d = pixel.map((value, c) => density(value, paper[c]));
  const a = inkA.map((value, c) => density(value, paper[c]));
  const b = inkB.map((value, c) => density(value, paper[c]));
  const dot = (x: number[], y: number[]) =>
    x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
  const aa = dot(a, a);
  const bb = dot(b, b);
  const ab = dot(a, b);
  const ad = dot(a, d);
  const bd = dot(b, d);
  const det = aa * bb - ab * ab;
  let ca = (ad * bb - bd * ab) / det;
  let cb = (bd * aa - ad * ab) / det;
  /* Off the plane the two inks span (a stray grey, or darker than both
     together), fall back to the best fit with one coverage pinned. */
  if (ca < 0) {
    ca = 0;
    cb = bd / bb;
  } else if (cb < 0) {
    cb = 0;
    ca = ad / aa;
  }
  const clamp = (x: number) => (x < INK_FLOOR ? 0 : Math.min(1, x));
  return [clamp(ca), clamp(cb)];
}

/** Squared distance to the nearest set cell, by two chamfer passes (3–4
 *  weights, divided back to pixels). */
function distanceTo(set: Uint8Array, width: number, height: number) {
  const far = 1e9;
  const d = new Float32Array(width * height);
  for (let i = 0; i < d.length; i++) d[i] = set[i] ? 0 : far;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - width] + 3);
        if (x > 0) v = Math.min(v, d[i - width - 1] + 4);
        if (x < width - 1) v = Math.min(v, d[i - width + 1] + 4);
      }
      d[i] = v;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      let v = d[i];
      if (x < width - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < height - 1) {
        v = Math.min(v, d[i + width] + 3);
        if (x < width - 1) v = Math.min(v, d[i + width + 1] + 4);
        if (x > 0) v = Math.min(v, d[i + width - 1] + 4);
      }
      d[i] = v;
    }
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

/** Labels the 4-connected regions where `inside` is set; 0 is outside. */
function regions(inside: Uint8Array, width: number, height: number) {
  const label = new Int32Array(width * height);
  const sizes = [0];
  const stack: number[] = [];
  for (let start = 0; start < label.length; start++) {
    if (!inside[start] || label[start]) continue;
    const id = sizes.length;
    let size = 0;
    label[start] = id;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % width;
      const next = [
        x > 0 ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        i - width,
        i + width,
      ];
      for (const j of next) {
        if (j < 0 || j >= label.length || !inside[j] || label[j]) continue;
        label[j] = id;
        stack.push(j);
      }
    }
    sizes.push(size);
  }
  return { label, sizes };
}

/** The die cut: every printed pixel and everything within `margin` of one,
 *  with enclosed paper kept (or, with `cutHoles`, cut when it is large), and
 *  specks too small to cut dropped. 1 inside the card, 0 outside. */
export function dieCut(
  printed: Uint8Array,
  width: number,
  height: number,
  margin: number,
  cutHoles = false,
): Uint8Array {
  const near = distanceTo(printed, width, height);
  const shape = new Uint8Array(width * height);
  for (let i = 0; i < shape.length; i++) shape[i] = near[i] <= margin ? 1 : 0;

  /* Paper regions: the one touching the border is outside; the rest are
     holes, filled unless the card cuts them. */
  const paper = shape.map((v) => 1 - v);
  const holes = regions(paper, width, height);
  const outside = new Set<number>();
  for (let x = 0; x < width; x++) {
    outside.add(holes.label[x]);
    outside.add(holes.label[(height - 1) * width + x]);
  }
  for (let y = 0; y < height; y++) {
    outside.add(holes.label[y * width]);
    outside.add(holes.label[y * width + width - 1]);
  }
  const minHole = MIN_HOLE * width * height;
  for (let i = 0; i < shape.length; i++) {
    const id = holes.label[i];
    if (!id || outside.has(id)) continue;
    if (!(cutHoles && holes.sizes[id] >= minHole)) shape[i] = 1;
  }

  /* A die cut is one piece: keep the largest, and any piece near its size. */
  const pieces = regions(shape, width, height);
  const largest = Math.max(...pieces.sizes);
  for (let i = 0; i < shape.length; i++) {
    if (pieces.sizes[pieces.label[i]] < largest * 0.05) shape[i] = 0;
  }
  return shape;
}

/** The paper's colour: the median of the image's border, which is all paper. */
function paperOf(data: Buffer, width: number, height: number): Rgb {
  const channels: number[][] = [[], [], []];
  const sample = (x: number, y: number) => {
    for (let c = 0; c < 3; c++) channels[c].push(data[(y * width + x) * 3 + c]);
  };
  for (let x = 0; x < width; x += 4) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 0; y < height; y += 4) {
    sample(0, y);
    sample(width - 1, y);
  }
  return channels.map((values) => {
    values.sort((p, q) => p - q);
    return values[values.length >> 1];
  }) as unknown as Rgb;
}

const quantise = (coverage: number) =>
  Math.round(Math.round(coverage * (LEVELS - 1)) * (255 / (LEVELS - 1)));

/** One original, separated and cut, at `longSide` texels on its long side. */
export async function separate(
  input: string | Buffer,
  longSide: number,
  margin: number,
  cutHoles = false,
  descreen = DESCREEN,
) {
  const { data, info } = await sharp(input)
    .flatten({ background: "#ffffff" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const paper = paperOf(data, width, height);

  const inks = new Uint8Array(width * height * 2);
  const printed = new Uint8Array(width * height);
  let left = width,
    right = 0,
    top = height,
    bottom = 0;
  for (let i = 0; i < width * height; i++) {
    const [a, b] = unmix(
      [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]],
      paper,
    );
    inks[i * 2] = Math.round(a * 255);
    inks[i * 2 + 1] = Math.round(b * 255);
    if (a + b >= PRINTED) {
      printed[i] = 1;
      const x = i % width;
      const y = (i / width) | 0;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error("No ink found");

  /* The margin is given in output texels; work in source pixels. */
  const inkLong = Math.max(right - left, bottom - top) + 1;
  const sourceMargin = Math.max(2, (margin * inkLong) / longSide);
  const shape = dieCut(printed, width, height, sourceMargin, cutHoles);

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (!shape[i]) continue;
    rgba[i * 4] = inks[i * 2];
    rgba[i * 4 + 1] = inks[i * 2 + 1];
    rgba[i * 4 + 3] = 255;
  }

  /* Crop to the cut, then scale; the mask's edge is softened by a pixel at
     the output size so the cut does not stair-step. */
  const pad = Math.ceil(sourceMargin) + 2;
  const box = {
    left: Math.max(0, left - pad),
    top: Math.max(0, top - pad),
    width: Math.min(width, right + pad + 1) - Math.max(0, left - pad),
    height: Math.min(height, bottom + pad + 1) - Math.max(0, top - pad),
  };
  const scale = Math.min(1, longSide / Math.max(box.width, box.height));
  const outWidth = Math.max(1, Math.round(box.width * scale));
  const outHeight = Math.max(1, Math.round(box.height * scale));
  /* Descreening blurs the inks only, never the cut. */
  const cropped = sharp(rgba, { raw: { width, height, channels: 4 } }).extract(
    box,
  );
  const [inkLayer, cutLayer] = await Promise.all([
    (descreen > 0 ? cropped.clone().blur(descreen) : cropped.clone())
      .resize(outWidth, outHeight, { kernel: "lanczos3" })
      .raw()
      .toBuffer(),
    cropped
      .clone()
      .extractChannel(3)
      .resize(outWidth, outHeight, { kernel: "lanczos3" })
      .raw()
      .toBuffer(),
  ]);
  const scaled = Buffer.alloc(outWidth * outHeight * 4);
  for (let i = 0; i < outWidth * outHeight; i++) {
    const alpha = cutLayer[i];
    scaled[i * 4] = alpha ? quantise(inkLayer[i * 4] / 255) : 0;
    scaled[i * 4 + 1] = alpha ? quantise(inkLayer[i * 4 + 1] / 255) : 0;
    scaled[i * 4 + 3] = alpha;
  }
  return { data: scaled, width: outWidth, height: outHeight, paper };
}

/** The smallest faithful encoding within budget: lossless if it fits,
 *  else lossy at the highest quality that does. Lossy WebP subsamples
 *  colour, which bleeds one ink's channel into the other's; once the screen
 *  is descreened that bleed measures about 3 levels in 255, so it is the
 *  fallback, not the rule. The cut (alpha) stays lossless either way. */
export async function encode(data: Buffer, width: number, height: number) {
  const raw = { raw: { width, height, channels: 4 as const } };
  const lossless = await sharp(data, raw)
    .webp({ lossless: true, effort: 6 })
    .toBuffer();
  if (lossless.length <= MAX_BYTES) {
    return { webp: lossless, encoding: "lossless" };
  }
  let webp = lossless;
  let quality = 95;
  for (; quality >= 60; quality -= 5) {
    webp = await sharp(data, raw)
      .webp({ quality, alphaQuality: 100, smartSubsample: true, effort: 6 })
      .toBuffer();
    if (webp.length <= MAX_BYTES) break;
  }
  return { webp, encoding: `lossy q${Math.max(quality, 60)}` };
}

/** A tileable paper grain, one channel: fibres from wrapped value noise,
 *  plus fine tooth. Mid-grey on average, so it can multiply or add. */
export async function grain(size = 256): Promise<Buffer> {
  let seed = 7;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const field = new Float32Array(size * size);
  for (const [period, weight] of [
    [8, 0.35],
    [32, 0.25],
    [64, 0.15],
  ] as const) {
    const lattice = Array.from({ length: period * period }, random);
    const at = (x: number, y: number) =>
      lattice[(y % period) * period + (x % period)];
    const cell = size / period;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const gx = x / cell;
        const gy = y / cell;
        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const fx = gx - x0;
        const fy = gy - y0;
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
        const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
        field[y * size + x] += (top * (1 - sy) + bottom * sy) * weight;
      }
    }
  }
  const pixels = Buffer.alloc(size * size);
  for (let i = 0; i < pixels.length; i++) {
    const tooth = (random() - 0.5) * 0.25;
    pixels[i] = Math.round(
      Math.max(0, Math.min(255, (field[i] - 0.375 + tooth) * 200 + 128)),
    );
  }
  return sharp(pixels, { raw: { width: size, height: size, channels: 1 } })
    .webp({ quality: 40, effort: 6 })
    .toBuffer();
}

/* Preview only: approximate stock and inks for each mode, to judge the
   separation by eye. What ships is coloured by the runtime from the tokens. */
const PREVIEW = {
  light: {
    ground: [236, 227, 213],
    paper: [246, 239, 226],
    inkA: [200, 85, 58],
    inkB: [61, 90, 128],
  },
  dark: {
    ground: [29, 25, 22],
    paper: [52, 45, 40],
    inkA: [226, 140, 108],
    inkB: [143, 169, 204],
  },
} satisfies Record<string, Record<string, Rgb>>;

/** The card printed in one mode's palette, over that mode's ground. Light
 *  inks multiply over the paper; dark mode's lighter inks cover it. */
export async function preview(
  data: Buffer,
  width: number,
  height: number,
  mode: keyof typeof PREVIEW,
) {
  const { ground, paper, inkA, inkB } = PREVIEW[mode];
  const pad = 24;
  const w = width + pad * 2;
  const h = height + pad * 2;
  const out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 3;
      const sx = x - pad;
      const sy = y - pad;
      const inside = sx >= 0 && sy >= 0 && sx < width && sy < height;
      const i = (sy * width + sx) * 4;
      const alpha = inside ? data[i + 3] / 255 : 0;
      const a = inside ? data[i] / 255 : 0;
      const b = inside ? data[i + 1] / 255 : 0;
      for (let c = 0; c < 3; c++) {
        let card: number;
        if (mode === "light") {
          card =
            paper[c] *
            (1 - a * (1 - inkA[c] / paper[c])) *
            (1 - b * (1 - inkB[c] / paper[c]));
        } else {
          card = paper[c] + (inkA[c] - paper[c]) * a;
          card = card + (inkB[c] - card) * b;
          card *= 1 - 0.35 * a * b;
        }
        out[o + c] = Math.round(ground[c] + (card - ground[c]) * alpha);
      }
    }
  }
  return sharp(out, { raw: { width: w, height: h, channels: 3 } })
    .png()
    .toBuffer();
}

/** Each texture's long side: the largest card using it, at `DENSITY`. */
function textures() {
  const sides = new Map<string, number>();
  for (const card of CARD_ART) {
    const name = path.basename(card.file, ".webp");
    const side = Math.min(
      MAX_SIDE,
      Math.round(Math.max(card.width, card.height) * DENSITY),
    );
    sides.set(name, Math.max(sides.get(name) ?? 0, side));
  }
  return sides;
}

async function importOriginal(png: string, name: string) {
  await mkdir(ORIGINALS, { recursive: true });
  const target = path.join(ORIGINALS, `${name}.webp`);
  await sharp(png).webp({ lossless: true, effort: 6 }).toFile(target);
  console.log(`${target}: ${((await stat(target)).size / 1024).toFixed(0)} KB`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--import") {
    const [, png, name] = args;
    if (!png || !name) {
      console.error("Usage: bun run generate:path-cards --import <png> <name>");
      process.exit(1);
    }
    return importOriginal(png, name);
  }
  const previewFlag = args.indexOf("--preview");
  const previewDir = previewFlag >= 0 ? args[previewFlag + 1] : undefined;
  if (previewDir) await mkdir(previewDir, { recursive: true });
  await mkdir(OUT, { recursive: true });

  const available = new Set(await readdir(ORIGINALS).catch(() => []));
  let over = false;
  for (const [name, side] of textures()) {
    if (!available.has(`${name}.webp`)) {
      console.warn(`${name}: no original in vendor/path-cards, skipped`);
      continue;
    }
    const card = await separate(
      path.join(ORIGINALS, `${name}.webp`),
      side,
      CUT_MARGIN * DENSITY,
      CUT_HOLES.has(name),
    );
    const { webp, encoding } = await encode(card.data, card.width, card.height);
    await writeFile(path.join(OUT, `${name}.webp`), webp);
    const flag = webp.length > MAX_BYTES ? "  OVER BUDGET" : "";
    if (flag) over = true;
    console.log(
      `${name}: ${card.width}×${card.height}, aspect ${(card.width / card.height).toFixed(3)}, ` +
        `${(webp.length / 1024).toFixed(1)} KB, ${encoding}${flag}`,
    );
    if (previewDir) {
      for (const mode of ["light", "dark"] as const) {
        await writeFile(
          path.join(previewDir, `${name}-${mode}.png`),
          await preview(card.data, card.width, card.height, mode),
        );
      }
    }
  }

  const texture = await grain();
  await writeFile(path.join(OUT, "grain.webp"), texture);
  console.log(`grain: ${(texture.length / 1024).toFixed(1)} KB`);
  if (texture.length > GRAIN_MAX_BYTES) over = true;
  if (over) process.exit(1);
}

/* Run as a script, not when a test imports the functions above. */
if (path.basename(process.argv[1] ?? "") === "prepare-path-cards.ts") {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
