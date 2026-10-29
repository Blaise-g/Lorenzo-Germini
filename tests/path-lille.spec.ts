/* Lille's tile on the `/path` board (#149; v3's solid board): the belfry
   and the Vieille Bourse courtyard with the pipe loop, and a clock whose
   hand sweeps to the projected saving. Nothing on it is written: the figure
   is the step's line, which the voice reads. The contract is #141 —
   decisions 3, 8, 10 and 11 — with storyboard §7.5 and the asset budgets of
   §9 and §11 in docs/research/experience-rethink.md. The runtime's shared
   behaviour is `path-scene.spec.ts`; this is what Lille adds to it, with
   the world's file budgets. */

import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

import { buildPlan, stillsFor } from "@/components/path/scene/build-plan";
import { GRAIN_FILE } from "@/components/path/scene/assets";
import { SCENE_FALLBACK_LINES } from "@/components/path/scene/fallback";
import { HAND_END_ANGLE, handAngle } from "@/components/path/scene/lille";
import {
  assetsForStep,
  LANDMARK_INDEX,
  SCENE_ASSETS,
} from "@/components/path/scene/scene-assets";
import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";

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
function propsThrough(slug: PathStepSlug) {
  const plan = buildPlan(PATH_STEPS.find((step) => step.slug === slug)!);
  return [...plan.standing, ...plan.building.map((prop) => prop.id)].join(" ");
}

/* §9 and §11's budgets. */
const STILL_BYTES = 150 * 1024;
const SCENE_BYTES = 1.5 * 1024 * 1024;
/** What a cold `/path` costs before any world file: the HTML, fonts, CSS,
 *  Next's chunks and three.js, 794.8 KB measured on a production build
 *  (`docs/path-measurements.md`, v3-harden), rounded up. */
const PAGE_BYTES = 800 * 1024;
/** The landmarks shipped: the ids the index lists. */
async function listedIds(): Promise<string[]> {
  return Object.keys(
    JSON.parse(await readFile(publicFile(LANDMARK_INDEX), "utf8")),
  );
}

/** The files the board fetches before a landing on `slug` first paints:
 *  the grain, the landmark index and that step's own landmarks the index
 *  lists. The rest load later, lazily (`runtime.ts`). A landmark the index
 *  does not list is never asked for; its stand-in stands. */
async function firstPaintFiles(slug: PathStepSlug): Promise<string[]> {
  const listed = await listedIds();
  return [
    GRAIN_FILE,
    LANDMARK_INDEX,
    ...assetsForStep(slug)
      .filter((asset) => listed.includes(asset.id))
      .map((asset) => asset.file),
  ];
}

/** Waits for every landmark the index lists to have arrived, or failed:
 *  until then one may land and take its stand-in's place. */
async function landmarksSettled(page: Page) {
  await expect(page.locator("[data-path-stage] canvas")).toHaveAttribute(
    "data-path-landmarks",
    "settled",
    { timeout: 15_000 },
  );
}

/** Every file the board can fetch on a desktop: the grain, the index and
 *  every landmark it lists. */
async function worldFiles(): Promise<string[]> {
  const listed = await listedIds();
  return [
    GRAIN_FILE,
    LANDMARK_INDEX,
    ...SCENE_ASSETS.filter((asset) => listed.includes(asset.id)).map(
      (asset) => asset.file,
    ),
  ];
}

test.describe("the figure", () => {
  /* The clock carries no figure: its caption line does, so a change to the
     CV's number reaches the voice and the page, never a stale plaque. */
  test("comes from the line the clock captions, with 'projected'", () => {
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
    /* In the page's text, which v3 keeps off the screen, where the voice
       tells the step, and the label off paper, as `StepSection` prints it. */
    await expect(label).toBeAttached();
    await expect(label).toContainText(lille.illustration.label);
    for (const inspiration of lille.illustration.inspirations) {
      await expect(label).toContainText(inspiration);
    }
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

  /* The index lists only what shipped, and only landmarks the manifest
     names: a listed file that is not there, or a listed LOD, would 404 on
     every visit that asks for it. */
  test("the landmark index lists only shipped files the manifest names", async () => {
    const ids = SCENE_ASSETS.map((asset) => asset.id);
    const index = JSON.parse(
      await readFile(publicFile(LANDMARK_INDEX), "utf8"),
    ) as Record<string, { lodFile?: string }>;
    for (const [id, entry] of Object.entries(index)) {
      expect(ids, id).toContain(id);
      const asset = SCENE_ASSETS.find((each) => each.id === id)!;
      await expect(access(publicFile(asset.file)), id).resolves.toBeUndefined();
      if (entry.lodFile) {
        await expect(
          access(publicFile(entry.lodFile)),
          entry.lodFile,
        ).resolves.toBeUndefined();
      }
    }
  });

  /* A landing's first paint loads the grain, the index, its own step's
     landmarks and one still, on top of the page itself; the rest of the
     board's landmarks follow it. The costliest landing is the budget's. */
  test("a landing's first-paint files and a still fit 1.5 MB with the page", async () => {
    let world = 0;
    for (const step of PATH_STEPS) {
      let files = 0;
      for (const url of await firstPaintFiles(step.slug)) {
        files += (await stat(publicFile(url))).size;
      }
      world = Math.max(world, files);
    }
    const stills = PATH_STEPS.flatMap((step) =>
      Object.values(stillsFor(step) ?? {}),
    );
    let still = 0;
    for (const url of stills) {
      still = Math.max(still, (await stat(publicFile(url))).size);
    }
    expect(PAGE_BYTES + world + still).toBeLessThanOrEqual(SCENE_BYTES);
  });
});

test.describe("on /path", () => {
  test.describe("the build", () => {
    test.use({ contextOptions: { reducedMotion: "no-preference" } });

    test("Lille asks for its own files first, then builds in about 2–3 s and ends still", async ({
      page,
    }) => {
      const files: string[] = [];
      page.on("request", (request) => {
        if (/\/path\/(world|models)\//.test(request.url())) {
          files.push(request.url());
        }
      });
      const href = (url: string) => new URL(url, page.url()).href;
      /* The board's files fetched by the time the build starts, read in the
         page as it does: a poll from here would see it later. */
      await page.addInitScript(() => {
        const seen = { files: null as string[] | null };
        (window as unknown as { __firstPaint: typeof seen }).__firstPaint =
          seen;
        new MutationObserver(() => {
          const element = document.querySelector("[data-path-stage]");
          if (
            seen.files ||
            element?.getAttribute("data-build-state") !== "building"
          ) {
            return;
          }
          seen.files = performance
            .getEntriesByType("resource")
            .map((entry) => entry.name)
            .filter((name) => /\/path\/(world|models)\//.test(name));
        }).observe(document, { subtree: true, attributes: true });
      });
      await page.goto("/path#lille");
      await expect(stage(page)).toHaveAttribute("data-build-state", "building");
      /* What the first paint waited on: Lille's own, and no other step's. */
      const firstPaint = await page.evaluate(
        () =>
          (window as unknown as { __firstPaint: { files: string[] } })
            .__firstPaint.files,
      );
      expect([...firstPaint].sort()).toEqual(
        (await firstPaintFiles("lille")).map(href).sort(),
      );
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
      await expect(stage(page)).toHaveAttribute("data-scene-lit", "0 1 2");
      /* Then the rest of the board, once each, however many times the
         stage asked to show Lille, and no landmark the index does not list. */
      await landmarksSettled(page);
      expect(files.sort()).toEqual((await worldFiles()).map(href).sort());
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
     as it did the first time: no piece resized, nothing missing. Under
     reduced motion (the suite's default) both are the settled board with
     the pawn on Lille. Antialiasing differs by a few pixels between draws;
     a resized piece changes a large share of the stage. */
  test("a return to Lille draws the board it drew the first time", async ({
    page,
  }) => {
    const canvas = page.locator("[data-path-stage] canvas");
    async function drawnLille() {
      /* Every landmark in, so none lands between the two draws. */
      await landmarksSettled(page);
      await expect(stage(page)).toHaveAttribute("data-scene-props", /belfry/);
      await expect(stage(page)).toHaveAttribute("data-build-state", "built");
      /* A screenshot is what is on screen over the canvas: the last step's
         frame, crossfading out over 150 ms, has to have gone. */
      await expect(page.locator("[data-path-crossfade]")).toHaveCount(0);
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
     still builds, and the line names Lille. */
  test("a landmark that does not load shows Lille's still and says why, and home still builds", async ({
    page,
  }) => {
    await page.route(`**${LANDMARK_INDEX}`, (route) =>
      route.fulfill({ json: { "lille-belfry": {}, "lille-bourse": {} } }),
    );
    await page.route("**/path/models/lille-*", (route) => route.abort());
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

    /* A return asks for the landmarks again, and builds this time: with
       the model, or with its stand-in where there is none yet. */
    await page.unroute("**/path/models/lille-*");
    await page.locator('[data-path-step-link="lille"]').click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect(stage(page)).not.toHaveAttribute("data-fallback-reason", /./);
  });
});
