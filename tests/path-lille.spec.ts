/* Lille's tile on the `/path` board (#149, v2's board): the belfry and the
   Vieille Bourse courtyard with the pipe loop, a clock whose hand sweeps to
   the projected saving, and its plaque. The contract is #141 — decisions 3, 8, 10 and 11 — with
   storyboard §7.5 and the asset budgets of §9 and §11 in
   docs/research/experience-rethink.md. The runtime's shared behaviour is
   `path-scene.spec.ts`; this is what Lille adds to it, with the card art's
   budgets. */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

import { stillsFor } from "@/components/path/scene/build-plan";
import { CARD_ART } from "@/components/path/scene/card-art";
import { SCENE_FALLBACK_LINES } from "@/components/path/scene/fallback";
import { GRAIN_FILE } from "@/components/path/scene/ink";
import {
  HAND_END_ANGLE,
  handAngle,
  LILLE_FIGURE,
} from "@/components/path/scene/lille";
import { decodeModel, encodeModel } from "@/components/path/scene/model-format";
import { PATH_STEPS } from "@/data/path";

/* The board draws on this machine's GPU (Metal through ANGLE), not the
   headless default, SwiftShader: five workers sharing one software
   rasteriser draw it at 50–75 ms a frame, and the 33 ms frame sample then
   rightly shows the stills. That is a starved device, not the board under
   test; the slow-frames verdict itself is `path-board.spec.ts`'s. */
test.use({
  launchOptions: {
    args: [
      "--mute-audio",
      "--use-angle=metal",
      "--enable-gpu",
      "--ignore-gpu-blocklist",
    ],
  },
});

const lille = PATH_STEPS.find((step) => step.slug === "lille")!;
const publicFile = (url: string) => path.join(process.cwd(), "public", url);
const stage = (page: Page) => page.locator("[data-path-stage]");
const overlay = (page: Page) => page.locator("[data-path-overlay]");

/** Every prop on the board up to and including `slug`'s, in the data's
 *  order: what stands once the pawn has reached its tile. */
function propsThrough(slug: string) {
  const index = PATH_STEPS.findIndex((step) => step.slug === slug);
  return PATH_STEPS.slice(0, index + 1)
    .flatMap((step) => step.props.map((prop) => prop.id))
    .join(" ");
}

/* §9 and §11's budgets. */
const STILL_BYTES = 150 * 1024;
const SCENE_BYTES = 1.5 * 1024 * 1024;
/** What a cold `/path` costs before any card: the HTML, fonts, CSS, Next's
 *  chunks and three.js, measured on a production build
 *  (`docs/path-measurements.md`), rounded up. */
const PAGE_BYTES = 600 * 1024;
/** The board's card files: every one the manifest names, each fetched
 *  once, whichever step a visitor lands on. */
const CARD_FILES = [...new Set(CARD_ART.map((card) => card.file))];

test.describe("the figure", () => {
  test("says exactly what decision 3 gives it, with 'projected'", () => {
    expect(LILLE_FIGURE).toBe("10,000 m³ a year — projected saving");
  });

  /* Taken from the step's line, so a change to the CV's number moves the
     clock with it — or stops the build, rather than leaving it stale. */
  test("comes from the line the clock captions", () => {
    const clock = lille.props.find((prop) => prop.id === "clock-face")!;
    expect(lille.lines[clock.captionLine]).toContain(
      "projected to save 10,000 m³ a year",
    );
  });

  test("the hand starts at noon and ends on the saving's mark", () => {
    expect(handAngle(0)).toBeCloseTo(0);
    expect(handAngle(1)).toBe(HAND_END_ANGLE);
    /* It only ever sweeps one way, so it never passes the mark and comes back. */
    const angles = Array.from({ length: 21 }, (_, i) => handAngle(i / 20));
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i]).toBeLessThanOrEqual(angles[i - 1]);
    }
    expect(handAngle(1.5)).toBe(HAND_END_ANGLE);
  });
});

test.describe("the illustration", () => {
  test("is labelled as one and names its inspirations", () => {
    expect(lille.illustration.label).toMatch(/^Illustration: /);
    expect(lille.illustration.inspirations.join(" ")).toMatch(/belfry/);
    expect(lille.illustration.inspirations.join(" ")).toMatch(/Vieille Bourse/);
  });

  test("Lille's panel on /path shows its label and inspirations", async ({
    page,
  }) => {
    await page.goto("/path#lille");
    const label = page.locator(
      '[data-path-panel="lille"] [data-path-illustration]',
    );
    await expect(label).toBeVisible();
    await expect(label).toContainText(lille.illustration.label);
    for (const inspiration of lille.illustration.inspirations) {
      await expect(label).toContainText(inspiration);
    }
  });
});

test.describe("the model format", () => {
  const mesh = {
    positions: Float32Array.from([0, 0, 0, 2, 0, 0, 0, 1, -3, 1, 1, 1]),
    indices: Uint32Array.from([0, 1, 2, 0, 2, 3]),
  };

  test("reads back what it wrote, to within its quantisation", () => {
    const decoded = decodeModel(encodeModel(mesh));
    expect([...decoded.indices]).toEqual([...mesh.indices]);
    decoded.positions.forEach((value, i) =>
      expect(value).toBeCloseTo(mesh.positions[i], 4),
    );
  });

  test("keeps indices past 65,535 vertices", () => {
    const count = 70_000;
    const positions = Float32Array.from({ length: count * 3 }, (_, i) => i);
    const indices = Uint32Array.from([0, 65_535, count - 1]);
    const decoded = decodeModel(encodeModel({ positions, indices }));
    expect([...decoded.indices]).toEqual([0, 65_535, count - 1]);
    expect(decoded.positions[(count - 1) * 3]).toBeCloseTo((count - 1) * 3, 0);
  });

  test("refuses a file that is not one, or is cut short", () => {
    expect(() => decodeModel(new ArrayBuffer(64))).toThrow(/Not a path model/);
    const stray = encodeModel({
      ...mesh,
      indices: Uint32Array.from([0, 1, 4]),
    });
    expect(() => decodeModel(stray)).toThrow(/past its vertices/);
    const whole = encodeModel(mesh);
    expect(() => decodeModel(whole.slice(0, whole.byteLength - 2))).toThrow(
      /expected/,
    );
  });
});

test.describe("the budgets", () => {
  test("each of Lille's stills is at most 150 KB, and so is every other", async () => {
    const steps = PATH_STEPS.filter((step) => stillsFor(step));
    expect(steps.map((step) => step.slug)).toContain("lille");
    for (const step of steps) {
      for (const still of Object.values(stillsFor(step)!)) {
        const { size } = await stat(publicFile(still));
        expect(size, still).toBeLessThanOrEqual(STILL_BYTES);
      }
    }
  });

  /* The card format (`card-art.ts`): a WebP whose channels are an ink
     separation, R and G the two inks, A the die-cut mask. */
  test("every card the manifest names is a WebP with a cut mask", async () => {
    expect(CARD_FILES.length).toBeGreaterThan(0);
    for (const url of CARD_FILES) {
      const meta = await sharp(await readFile(publicFile(url))).metadata();
      expect(meta.format, url).toBe("webp");
      expect(meta.hasAlpha, url).toBe(true);
    }
  });

  /* Every landing loads the whole board's cards, the grain and one still,
     on top of the page itself. */
  test("the board's cards and a still fit 1.5 MB with the page", async () => {
    let cards = 0;
    for (const url of [...CARD_FILES, GRAIN_FILE]) {
      cards += (await stat(publicFile(url))).size;
    }
    const stills = PATH_STEPS.flatMap((step) =>
      Object.values(stillsFor(step) ?? {}),
    );
    let still = 0;
    for (const url of stills) {
      still = Math.max(still, (await stat(publicFile(url))).size);
    }
    expect(PAGE_BYTES + cards + still).toBeLessThanOrEqual(SCENE_BYTES);
  });
});

test.describe("on /path", () => {
  test.describe("the build", () => {
    test.use({ contextOptions: { reducedMotion: "no-preference" } });

    test("Lille loads every card once, then builds in about 2–3 s and ends still", async ({
      page,
    }) => {
      const cards: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes("/path/cards/")) cards.push(request.url());
      });
      await page.goto("/path#lille");
      await expect(stage(page)).toHaveAttribute("data-build-state", "building");
      const started = Date.now();
      await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
        timeout: 5000,
      });
      const took = Date.now() - started;
      expect(took).toBeGreaterThan(1500);
      expect(took).toBeLessThan(4000);
      await expect(stage(page)).toHaveAttribute(
        "data-scene-props",
        propsThrough("lille"),
      );
      await expect(overlay(page)).toHaveAttribute("data-path-lit", "0 1 2");
      /* One fetch each, however many times the stage asked to show Lille,
         and the stock's grain. */
      expect(cards.sort()).toEqual(
        [...CARD_FILES, GRAIN_FILE]
          .map((url) => new URL(url, page.url()).href)
          .sort(),
      );
    });

    test("Skip ends it at once", async ({ page }) => {
      await page.goto("/path#lille");
      await expect(stage(page)).toHaveAttribute("data-build-state", "building");
      await page.locator("[data-path-build-control]").click();
      await expect(stage(page)).toHaveAttribute("data-build-state", "built");
      await expect(stage(page)).toHaveAttribute(
        "data-scene-props",
        propsThrough("lille"),
      );
    });
  });

  /* A return draws Lille from the tiles it already holds, so it must look
     as it did the first time: no card resized, nothing missing. Under
     reduced motion (the suite's default) both are the settled board with
     the pawn on Lille. Antialiasing differs by a few pixels between draws;
     a resized card changes a large share of the stage. */
  test("a return to Lille draws the board it drew the first time", async ({
    page,
  }) => {
    const canvas = page.locator("[data-path-stage] canvas");
    async function drawnLille() {
      await expect(stage(page)).toHaveAttribute("data-scene-props", /belfry/);
      await expect(stage(page)).toHaveAttribute("data-build-state", "built");
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      return sharp(await canvas.screenshot())
        .raw()
        .toBuffer();
    }
    await page.goto("/path#lille");
    const first = await drawnLille();
    await page.locator('[data-path-step-link="home"]').click();
    await expect(stage(page)).toHaveAttribute("data-scene-step", "home");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await page.locator('[data-path-step-link="lille"]').click();
    await expect(stage(page)).toHaveAttribute("data-scene-step", "lille");
    const again = await drawnLille();
    expect(again.length).toBe(first.length);
    let changed = 0;
    for (let i = 0; i < first.length; i += 4) {
      const delta = Math.max(
        Math.abs(first[i] - again[i]),
        Math.abs(first[i + 1] - again[i + 1]),
        Math.abs(first[i + 2] - again[i + 2]),
      );
      if (delta > 32) changed++;
    }
    expect(changed / (first.length / 4)).toBeLessThan(0.01);
  });

  test("under reduced motion, Lille shows the whole board without a build", async ({
    page,
  }) => {
    const seen: string[] = [];
    await page.exposeFunction("recordState", (state: string) => {
      if (seen.at(-1) !== state) seen.push(state);
    });
    await page.addInitScript(() => {
      new MutationObserver(() => {
        const state = document
          .querySelector("[data-path-stage]")
          ?.getAttribute("data-build-state");
        if (state) {
          (
            window as unknown as { recordState(state: string): void }
          ).recordState(state);
        }
      }).observe(document, {
        subtree: true,
        attributes: true,
        childList: true,
        attributeFilter: ["data-build-state"],
      });
    });
    await page.goto("/path#lille");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    expect(seen).not.toContain("building");
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      propsThrough("next"),
    );
  });

  /* An asset failure is Lille's alone: the stage keeps running, so home
     still builds, and the line names Lille's cards. */
  test("a card that does not load shows Lille's still and says why, and home still builds", async ({
    page,
  }) => {
    await page.route("**/path/cards/lille-*", (route) => route.abort());
    await page.goto("/path#lille");
    await expect(stage(page)).toHaveAttribute(
      "data-fallback-reason",
      "assets-failed",
    );
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "webgl");
    await expect(stage(page)).toHaveAttribute("data-build-state", "idle");
    await expect(page.locator("[data-path-fallback-reason]")).toHaveText(
      SCENE_FALLBACK_LINES["assets-failed"](lille.place),
    );
    await expect(page.locator("[data-path-fallback-reason]")).toContainText(
      "Lille",
    );
    await expect(page.locator("[data-path-build-control]")).toHaveCount(0);
    await expect(page.locator("[data-path-stage] canvas")).toBeHidden();
    const still = page.locator(
      '[data-path-backdrop="lille"] [data-path-still="light"]',
    );
    await expect(still).toBeVisible();
    await expect
      .poll(() => still.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);

    await page.locator('[data-path-step-link="home"]').click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect(stage(page)).not.toHaveAttribute("data-fallback-reason", /./);
    await expect(page.locator("[data-path-fallback-reason]")).toHaveCount(0);
    await expect(page.locator("[data-path-stage] canvas")).toBeVisible();

    /* A return asks for the cards again, and gets them this time. */
    await page.unroute("**/path/cards/lille-*");
    await page.locator('[data-path-step-link="lille"]').click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect(stage(page)).not.toHaveAttribute("data-fallback-reason", /./);
  });
});
