/* The path board's die-cut cards (comp B): the manifest the board builds
   from, the textures it names, and the ink separation that makes them. No
   browser: it reads `public/path/cards/` and calls the script's functions. */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { dieCut, unmix, type Rgb } from "../scripts/prepare-path-cards";
import {
  CARD_ART,
  TILE_SIZE,
  cardsForStep,
} from "../src/components/path/scene/card-art";
import { PATH_STEPS } from "../src/data/path";

const MAX_SIDE = 1024;
const MAX_BYTES = 60 * 1024;
const GRAIN_MAX_BYTES = 20 * 1024;

const shipped = (file: string) => path.join(process.cwd(), "public", file);
const files = [...new Set(CARD_ART.map((card) => card.file))];

test.describe("the card manifest", () => {
  test("ids are unique and every card stands on its tile", () => {
    const ids = CARD_ART.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const card of CARD_ART) {
      expect(card.id.startsWith(`${card.step}-`), card.id).toBe(true);
      expect(Math.abs(card.position.x), card.id).toBeLessThanOrEqual(
        TILE_SIZE / 2,
      );
      expect(Math.abs(card.position.z), card.id).toBeLessThanOrEqual(
        TILE_SIZE / 2,
      );
      expect(card.width, card.id).toBeLessThanOrEqual(TILE_SIZE);
    }
  });

  test("every step has its cards, and every prop a step names has one", () => {
    for (const step of PATH_STEPS) {
      const cards = cardsForStep(step.slug);
      expect(cards.length, step.slug).toBeGreaterThan(0);
      const drawn = new Set(cards.map((card) => card.prop));
      for (const prop of step.props) {
        expect(drawn.has(prop.id), `${step.slug}: ${prop.id}`).toBe(true);
      }
    }
  });

  test("a card renders only its own step's props", () => {
    for (const card of CARD_ART) {
      if (!card.prop) continue;
      const step = PATH_STEPS.find((item) => item.slug === card.step);
      expect(
        step?.props.map((prop) => prop.id),
        card.id,
      ).toContain(card.prop);
    }
  });

  test("no two cards on a tile render the same prop", () => {
    for (const step of PATH_STEPS) {
      const props = cardsForStep(step.slug).flatMap((card) =>
        card.prop ? [card.prop] : [],
      );
      expect(new Set(props).size, step.slug).toBe(props.length);
    }
  });

  test("each tile's build order runs from zero without gaps", () => {
    for (const step of PATH_STEPS) {
      expect(
        cardsForStep(step.slug).map((card) => card.order),
        step.slug,
      ).toEqual(cardsForStep(step.slug).map((_, index) => index));
    }
  });
});

test.describe("the card textures", () => {
  for (const file of files) {
    test(`${file} is a cut ink separation within budget`, async () => {
      const bytes = await readFile(shipped(file));
      expect(bytes.length).toBeLessThanOrEqual(MAX_BYTES);

      const image = sharp(bytes);
      const meta = await image.metadata();
      expect(meta.format).toBe("webp");
      expect(meta.hasAlpha).toBe(true);
      expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(MAX_SIDE);

      /* B is unused (lossy encoding may leave it a few levels off zero);
         A is a cut, so some of the texture is outside it. */
      const stats = await image.stats();
      expect(stats.channels[2].mean).toBeLessThan(4);
      expect(stats.channels[3].min).toBe(0);
      expect(stats.channels[3].max).toBe(255);
    });
  }

  test("each card's size matches its texture's aspect", async () => {
    for (const card of CARD_ART) {
      const meta = await sharp(shipped(card.file)).metadata();
      const texture = meta.width! / meta.height!;
      const scene = card.width / card.height;
      expect(Math.abs(scene / texture - 1), card.id).toBeLessThan(0.03);
    }
  });

  test("the paper grain is a small tile", async () => {
    const file = shipped("/path/cards/grain.webp");
    expect((await stat(file)).size).toBeLessThanOrEqual(GRAIN_MAX_BYTES);
    const meta = await sharp(file).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(meta.height);
  });
});

test.describe("separating the inks", () => {
  const paper: Rgb = [250, 248, 244];
  const terracotta: Rgb = [196, 82, 52];
  const blue: Rgb = [58, 84, 118];
  /* The inks as filters: each scales the paper's light channel by channel. */
  const print = (a: number, b: number): Rgb =>
    paper.map(
      (p, c) => p * (terracotta[c] / p) ** a * (blue[c] / p) ** b,
    ) as unknown as Rgb;

  for (const [label, a, b] of [
    ["paper", 0, 0],
    ["terracotta", 1, 0],
    ["blue", 0, 1],
    ["both inks overprinted", 1, 1],
    ["a half tint of terracotta", 0.5, 0],
    ["a light tint of blue over terracotta", 1, 0.3],
  ] as const) {
    test(`reads ${label}`, () => {
      const [ca, cb] = unmix(print(a, b), paper, terracotta, blue);
      expect(ca).toBeCloseTo(a, 1);
      expect(cb).toBeCloseTo(b, 1);
    });
  }

  test("reads off-white paper noise as no ink", () => {
    expect(unmix([244, 241, 236], paper, terracotta, blue)).toEqual([0, 0]);
  });
});

test.describe("the die cut", () => {
  const size = 64;
  /** A ring of ink (outer radius 20, inner 12) and a one-pixel speck. */
  function ring() {
    const printed = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const r = Math.hypot(x - 32, y - 32);
        if (r <= 20 && r >= 12) printed[y * size + x] = 1;
      }
    }
    printed[2 * size + 2] = 1;
    return printed;
  }
  const at = (cut: Uint8Array, x: number, y: number) => cut[y * size + x];

  test("leaves a margin around the ink and keeps enclosed paper", () => {
    const cut = dieCut(ring(), size, size, 3);
    expect(at(cut, 32, 32)).toBe(1);
    expect(at(cut, 32 + 22, 32)).toBe(1);
    expect(at(cut, 32 + 25, 32)).toBe(0);
  });

  test("cuts a large enclosed hole when the card asks", () => {
    const cut = dieCut(ring(), size, size, 3, true);
    expect(at(cut, 32, 32)).toBe(0);
    expect(at(cut, 32 + 16, 32)).toBe(1);
  });

  test("drops a speck too small to cut as its own piece", () => {
    const cut = dieCut(ring(), size, size, 3);
    expect(at(cut, 2, 2)).toBe(0);
  });
});
