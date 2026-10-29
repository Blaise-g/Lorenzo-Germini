/* The board on `/path` (#148, v2's board): the runtime loads after the
   overlay paints, the selected step's tile builds, Skip and Replay, reduced
   motion, light and dark, and the stills when the browser cannot run it. The contract is #141 — decisions
   8, 11, 12 and 13, implementation decisions 6–8 and the testing decisions'
   Build, Fallback and Weight bullets — with storyboard §7.4, §7.5 and §7.7 of
   docs/research/experience-rethink.md. The pure halves are in
   `path-scene-contract.spec.ts`; the pawn's hops and the tour's settled cue
   are `path-board.spec.ts`. */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { buildPlan } from "@/components/path/scene/build-plan";
import { transitTimeline } from "@/components/path/scene/camera-rig";
import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";
import {
  FALLBACK_REASON_LINES,
  SCENE_FALLBACK_LINES,
} from "@/components/path/scene/fallback";

import { MAX_DRAWING_PIXELS } from "@/components/path/scene/drawing-buffer";
import { LANDMARK_INDEX } from "@/components/path/scene/scene-assets";

import { setTheme, themeToggle } from "./support/theme";

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

/* Turbopack names a module's chunk after its path, so three.js and the scene
   runtime are recognisable by URL in dev. */
const threeChunk = /three_build_three/;
const sceneChunk =
  /three_build_three|components_path_scene_(?!build|fallback|capabilities)/;

const stage = (page: Page) => page.locator("[data-path-stage]");

/** Has the landmark index list `ids`, as if their files had shipped: the
   board then asks for them, and a test can route what they return. */
async function listLandmarks(page: Page, ids: readonly string[]) {
  await page.route(`**${LANDMARK_INDEX}`, (route) =>
    route.fulfill({
      json: Object.fromEntries(ids.map((id) => [id, {}])),
    }),
  );
}

const overlay = (page: Page) => page.locator("[data-path-overlay]");

/** Waits for every landmark the index lists to have arrived, or failed:
 *  the board loads all but the first step's after its first paint. */
async function landmarksSettled(page: Page) {
  await expect(page.locator("[data-path-stage] canvas")).toHaveAttribute(
    "data-path-landmarks",
    "settled",
    { timeout: 15_000 },
  );
}

const buildControl = (page: Page) => page.locator("[data-path-build-control]");
const stepLink = (page: Page, slug: PathStepSlug) =>
  page.locator(`[data-path-step-link="${slug}"]`);

const stepNamed = (slug: PathStepSlug) =>
  PATH_STEPS.find((step) => step.slug === slug)!;

/** Every prop on the board up to and including `slug`'s, in the data's
 *  order: what stands once the pawn has reached its tile. */
function propsThrough(slug: PathStepSlug) {
  const plan = buildPlan(PATH_STEPS.find((step) => step.slug === slug)!);
  return [...plan.standing, ...plan.building.map((prop) => prop.id)].join(" ");
}

/** The caption lines a step's props light, as the stage lists them. */
function captionLines(slug: PathStepSlug) {
  return [...new Set(stepNamed(slug).props.map((p) => p.captionLine))]
    .sort((a, b) => a - b)
    .join(" ");
}

/** Every value the stage's build state takes, in order, from the first
 *  paint: a build that skipped a state, or ran when it should not, shows up
 *  here where a single poll could miss it. */
async function recordBuildStates(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __buildStates: string[] }).__buildStates = seen;
    new MutationObserver(() => {
      const state = document
        .querySelector("[data-path-stage]")
        ?.getAttribute("data-build-state");
      if (state && seen.at(-1) !== state) seen.push(state);
    }).observe(document, {
      subtree: true,
      attributes: true,
      childList: true,
      attributeFilter: ["data-build-state"],
    });
  });
}

const buildStates = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __buildStates: string[] }).__buildStates,
  );

test.describe("loading", () => {
  test("/path paints its overlay before it requests any 3D", async ({
    page,
  }) => {
    await page.goto("/path");
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "webgl");
    const timings = await page.evaluate(() => ({
      paint:
        performance
          .getEntriesByType("paint")
          .find((entry) => entry.name === "first-contentful-paint")
          ?.startTime ?? Infinity,
      three: performance
        .getEntriesByType("resource")
        .filter((entry) => /three_build_three/.test(entry.name))
        .map((entry) => entry.startTime),
    }));
    expect(timings.three.length).toBeGreaterThan(0);
    for (const start of timings.three) {
      expect(start).toBeGreaterThan(timings.paint);
    }
  });

  test("/ requests no 3D chunk", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));
    await page.goto("/", { waitUntil: "networkidle" });
    expect(requested.filter((url) => sceneChunk.test(url))).toEqual([]);
  });

  test("the path tokens resolve in the page, where the scene reads them", async ({
    page,
  }) => {
    await page.goto("/path");
    const tokens = await page.evaluate(() =>
      ["paper", "ink-warm", "ink-cool", "fog"].map((role) =>
        getComputedStyle(document.documentElement)
          .getPropertyValue(`--path-${role}`)
          .trim(),
      ),
    );
    for (const value of tokens) expect(value).not.toBe("");
  });
});

test.describe("the build", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("home's step builds in about 2–3 s, lighting its captions as props land", async ({
    page,
  }) => {
    await recordBuildStates(page);
    /* Every state the stage passes through, recorded as it changes: a
       loaded machine's polling can miss the middle of a build. */
    await page.addInitScript(() => {
      const seen: (string | null)[][] = [];
      (window as unknown as { __stageStates: typeof seen }).__stageStates =
        seen;
      new MutationObserver(() => {
        const stage = document.querySelector("[data-path-stage]");
        if (!stage) return;
        seen.push(
          ["data-build-state", "data-scene-lit", "data-scene-props"].map(
            (name) => stage.getAttribute(name),
          ),
        );
      }).observe(document, {
        subtree: true,
        attributes: true,
        childList: true,
        attributeFilter: [
          "data-build-state",
          "data-scene-lit",
          "data-scene-props",
        ],
      });
    });
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    const started = Date.now();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 8000,
    });
    /* The first show opens with the swoop to the close-up (v3), and the
       pieces rise once the pawn has dropped onto its tile. */
    const took = Date.now() - started - transitTimeline("opening", 0).landMs;
    expect(took).toBeGreaterThan(1500);
    expect(took).toBeLessThan(4000);
    expect(await buildStates(page)).toEqual(["loading", "building", "built"]);
    /* Part-way, the first prop had landed and lit its line while the rest
       were still to come: the highlight follows the build, not its end. */
    const states = await page.evaluate(
      () =>
        (window as unknown as { __stageStates: (string | null)[][] })
          .__stageStates,
    );
    expect(
      states.some(
        ([state, lit, props]) =>
          state === "building" && lit === "0" && props !== propsThrough("home"),
      ),
      JSON.stringify(states),
    ).toBe(true);
    await expect(stage(page)).toHaveAttribute(
      "data-scene-lit",
      captionLines("home"),
    );
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      propsThrough("home"),
    );
  });

  /* Arriving cold at step 4, the pawn has passed steps 1–3: their tiles
     stand before step 4's own pieces rise. A later step adds its own to
     everything before it, Lille's passed tile included. */
  test("steps 4 and 6 build on every earlier tile", async ({ page }) => {
    await page.goto("/path#cuneo-2022");
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      new RegExp(`^${propsThrough("switzerland")}`),
    );
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 5000,
    });
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      propsThrough("cuneo-2022"),
    );
    await expect(stage(page)).toHaveAttribute(
      "data-scene-lit",
      captionLines("cuneo-2022"),
    );

    await stepLink(page, "now").click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 6000,
    });
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      propsThrough("now"),
    );
    await expect(stage(page)).toHaveAttribute(
      "data-scene-lit",
      captionLines("now"),
    );
  });

  test("Skip by click reaches the end; Replay rebuilds; nothing then moves on", async ({
    page,
  }) => {
    await page.goto("/path#home");
    await expect(buildControl(page)).toHaveText("Skip");
    await buildControl(page).click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      propsThrough("home"),
    );
    await expect(stage(page)).toHaveAttribute(
      "data-scene-lit",
      captionLines("home"),
    );

    await expect(buildControl(page)).toHaveText("Replay");
    await buildControl(page).click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    await expect(stage(page)).not.toHaveAttribute("data-scene-lit", /./);
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 5000,
    });

    /* The end is still: no loop back into a build, no step advance. */
    await page.waitForTimeout(1500);
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    expect(new URL(page.url()).hash).toBe("#home");
  });

  test("a click on the scene skips the build", async ({ page }) => {
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    await page.locator("[data-path-stage] canvas").click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 500,
    });
  });

  test("Esc skips the build, and a second Esc returns focus to the step list", async ({
    page,
  }) => {
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    await page.keyboard.press("Escape");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 500,
    });
    await expect(stepLink(page, "home")).not.toBeFocused();
    await page.keyboard.press("Escape");
    await expect(stepLink(page, "home")).toBeFocused();
  });

  /* While a tile's landmarks load, Replay and the turns are shown
     unavailable and do nothing; the one with focus keeps it. The board asks
     for the rest of its landmarks once home is up, so Lille's are refused
     then, and held on their retry. */
  test("while a scene loads, its controls are unavailable and keep focus", async ({
    page,
  }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    let refuse = true;
    await listLandmarks(page, ["lille-belfry", "lille-bourse"]);
    await page.route("**/path/models/lille-*", async (route) => {
      if (refuse) return route.fulfill({ status: 500 });
      await held;
      await route.continue();
    });
    await page.goto("/path#home");
    await buildControl(page).click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await landmarksSettled(page);
    await buildControl(page).focus();
    refuse = false;

    /* A fragment selects Lille without moving focus off Replay. */
    await page.evaluate(() => {
      location.hash = "#lille";
    });
    await expect(stage(page)).toHaveAttribute("data-build-state", "loading");
    await expect(buildControl(page)).toHaveAttribute("aria-disabled", "true");
    await expect(buildControl(page)).toBeFocused();
    for (const name of ["Turn the scene left", "Turn the scene right"]) {
      await expect(page.getByRole("button", { name })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    }
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Turn the scene left" }).focus();
    await page.keyboard.press("Enter");
    await expect(stage(page)).toHaveAttribute("data-build-state", "loading");

    release();
    await expect(stage(page)).toHaveAttribute(
      "data-build-state",
      /building|built/,
    );
    await expect(buildControl(page)).not.toHaveAttribute("aria-disabled", /./);
    /* The press while loading did not turn the scene: both turns are open. */
    await expect(
      page.getByRole("button", { name: "Turn the scene left" }),
    ).toBeEnabled();
  });

  test("Esc on the voice controls skips the build and leaves focus there", async ({
    page,
  }) => {
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    const voiceSwitch = page.locator("[data-path-voice-switch]");
    await voiceSwitch.focus();
    await page.keyboard.press("Escape");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 500,
    });
    await expect(voiceSwitch).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(voiceSwitch).toBeFocused();
  });

  test("Esc from the stage's controls returns focus to the step list", async ({
    page,
  }) => {
    await page.goto("/path#home");
    await buildControl(page).click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect(buildControl(page)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(stepLink(page, "home")).toBeFocused();
  });

  test("the two turn buttons turn the board once each way", async ({
    page,
  }) => {
    await page.goto("/path#home");
    const left = page.getByRole("button", { name: "Turn the scene left" });
    const right = page.getByRole("button", { name: "Turn the scene right" });
    await left.click();
    await expect(left).toBeDisabled();
    await right.click();
    await expect(left).toBeEnabled();
    await right.click();
    await expect(right).toBeDisabled();
  });

  /* Light and dark follow the site's class (storyboard §7.9), live: the
     scene's ground is the fog token, which is the page's ground in each mode. */
  test("the scene follows the site's theme toggle", async ({ page }) => {
    await setTheme(page, "light");
    await page.goto("/path#home");
    await buildControl(page).click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");

    const cornerBrightness = async () => {
      const box = (await page
        .locator("[data-path-stage] canvas")
        .boundingBox())!;
      /* The top-right corner: the step list lies over the top-left one on
         a wide screen, and the panel over the bottom-right. */
      const png = await page.screenshot({
        clip: { x: box.x + box.width - 4, y: box.y + 2, width: 2, height: 2 },
      });
      const { default: sharp } = await import("sharp");
      const { data } = await sharp(png)
        .raw()
        .toBuffer({ resolveWithObject: true });
      return Math.max(data[0], data[1], data[2]);
    };

    expect(await cornerBrightness()).toBeGreaterThan(192);
    await themeToggle(page).click();
    await expect.poll(cornerBrightness).toBeLessThan(64);
    await themeToggle(page).click();
    await expect.poll(cornerBrightness).toBeGreaterThan(192);
  });
});

/* The board's tiles are a second way to pick a step, for a pointer; the
   step list is the keyboard's, and the tile is hidden from assistive tech
   with the rest of the canvas. */
test.describe("picking on the board", () => {
  /** Sweeps the canvas for a point the board says is a tile other than the
   *  selected one: the pointer shows it as clickable there, as a step and
   *  not a piece that answers a click (`path-life.spec.ts`). */
  async function findTile(page: Page) {
    const canvas = stage(page).locator("canvas");
    const box = (await canvas.boundingBox())!;
    for (let row = 1; row < 10; row++) {
      for (let column = 1; column < 16; column++) {
        const x = box.x + (box.width * column) / 16;
        const y = box.y + (box.height * row) / 10;
        await page.mouse.move(x, y);
        await page.evaluate(
          () => new Promise((done) => requestAnimationFrame(() => done(0))),
        );
        await page.evaluate(
          () => new Promise((done) => requestAnimationFrame(() => done(0))),
        );
        const cursor = await canvas.evaluate(
          (element) => getComputedStyle(element).cursor,
        );
        const pointing = await canvas.getAttribute("data-path-pointing");
        if (cursor === "pointer" && pointing === "step") return { x, y };
      }
    }
    return null;
  }

  test("a click on another step's tile selects it and pushes; a click off the board does not", async ({
    page,
  }) => {
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    const canvas = stage(page).locator("canvas");
    const box = (await canvas.boundingBox())!;

    /* The middle of the ring is table, not a tile. */
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page).toHaveURL(/#home$/);

    const before = await page.evaluate(() => history.length);
    const tile = await findTile(page);
    expect(tile, "a tile under the pointer somewhere").not.toBeNull();
    await page.mouse.click(tile!.x, tile!.y);
    await expect(page).not.toHaveURL(/#home$/);
    const picked = new URL(page.url()).hash.slice(1) as PathStepSlug;
    await expect(overlay(page)).toHaveAttribute("data-path-shown", picked);
    expect(await page.evaluate(() => history.length)).toBe(before + 1);
    await expect(stepLink(page, picked)).toHaveAttribute("aria-current", /./);
    /* The tile just picked is the selected one: no longer a link, though a
       piece on it may still answer a click. */
    await page.mouse.move(tile!.x, tile!.y);
    await expect(canvas).not.toHaveAttribute("data-path-pointing", "step");
  });
});

test.describe("reduced motion", () => {
  /* The suite's default context emulates reduced motion. */
  test("shows the whole board built at once, without a build", async ({
    page,
  }) => {
    await recordBuildStates(page);
    await page.goto("/path#cuneo-2022");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    expect(await buildStates(page)).toEqual(["loading", "built"]);
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      propsThrough("next"),
    );
    await expect(stage(page)).toHaveAttribute(
      "data-scene-lit",
      captionLines("cuneo-2022"),
    );
    await expect(buildControl(page)).toHaveText("Replay");
  });

  /* One step's end state cuts to another's: the stage names the new step
     and lights its lines, though the board itself does not change. */
  test("a second step cuts straight to its own end state", async ({ page }) => {
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-scene-step", "home");
    await stepLink(page, "turin").click();
    await expect(stage(page)).toHaveAttribute("data-scene-step", "turin");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect(stage(page)).toHaveAttribute(
      "data-scene-lit",
      captionLines("turin"),
    );
  });
});

/* Once a build settles, nothing is drawn until something moves: the frame
   sample does not keep an idle scene rendering (decision 8). */
test.describe("rendering on demand", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const counts = { draws: 0 };
      (window as unknown as { __draws: typeof counts }).__draws = counts;
      const proto = WebGL2RenderingContext.prototype;
      for (const name of [
        "drawElements",
        "drawArrays",
        "drawElementsInstanced",
        "drawArraysInstanced",
      ] as const) {
        const original = proto[name] as (...args: unknown[]) => void;
        (proto as unknown as Record<string, unknown>)[name] = function (
          this: WebGL2RenderingContext,
          ...args: unknown[]
        ) {
          counts.draws += 1;
          return original.apply(this, args);
        };
      }
    });
  });

  const draws = (page: Page) =>
    page.evaluate(
      () => (window as unknown as { __draws: { draws: number } }).__draws.draws,
    );

  test("a settled scene draws nothing until it is turned", async ({ page }) => {
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect.poll(() => draws(page)).toBeGreaterThan(0);
    /* A landmark landing in view draws it, once: let them all land. */
    await landmarksSettled(page);
    /* Let a frame already requested finish. */
    await page.waitForTimeout(200);
    const settled = await draws(page);
    await page.waitForTimeout(1000);
    expect(await draws(page)).toBe(settled);

    await page.getByRole("button", { name: "Turn the scene left" }).click();
    await expect.poll(() => draws(page)).toBeGreaterThan(settled);
  });
});

/* Replay and the turns are laid on the board's own frame: at its
   bottom-left on a wide screen, at its bottom-right on a phone, and inside the
   stage either way, so they never land on the strip or the panel. */
test.describe("the board's tabs", () => {
  for (const { name, viewport, corner } of [
    {
      name: "a wide screen",
      viewport: { width: 1440, height: 900 },
      corner: "bottom-left",
    },
    {
      name: "a phone",
      viewport: { width: 375, height: 812 },
      corner: "bottom-right",
    },
  ] as const) {
    test(`sit at the board's ${corner} on ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/path#lille");
      await expect(buildControl(page)).toBeVisible();
      const tabs = await page
        .locator("[data-path-board-controls]")
        .boundingBox();
      const box = await stage(page).boundingBox();
      expect(tabs && box).toBeTruthy();
      const inside = {
        left: tabs!.x - box!.x,
        right: box!.x + box!.width - (tabs!.x + tabs!.width),
        top: tabs!.y - box!.y,
        bottom: box!.y + box!.height - (tabs!.y + tabs!.height),
      };
      for (const gap of Object.values(inside))
        expect(gap).toBeGreaterThanOrEqual(-0.5);
      if (corner === "bottom-left") {
        expect(inside.left).toBeLessThanOrEqual(1);
        expect(inside.bottom).toBeLessThanOrEqual(1);
      } else {
        expect(inside.bottom).toBeLessThanOrEqual(24);
        expect(inside.right).toBeLessThanOrEqual(48);
      }
    });
  }
});

test.describe("on a wide, high-density screen", () => {
  test.use({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 2 });

  test("the canvas holds no more pixels than its cap", async ({ page }) => {
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    const canvas = page.locator("[data-path-stage] canvas");
    const size = await canvas.evaluate((element: HTMLCanvasElement) => ({
      pixels: element.width * element.height,
      cssWidth: element.clientWidth,
    }));
    expect(size.cssWidth).toBeGreaterThan(1600);
    expect(size.pixels).toBeLessThanOrEqual(MAX_DRAWING_PIXELS + 1);
  });
});

/* The landmarks load lazily (v3-harden): a landing waits on its own step's
   only, and the rest follow once the board is up. One that lands on a tile
   already standing takes its stand-in's place there, with no loading state
   and no still. */
test.describe("landmarks loaded later", () => {
  test("a landmark landing after its tile was shown takes its stand-in's place", async ({
    page,
  }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/path/models/turin-mole*.glb", async (route) => {
      await held;
      await route.continue();
    });
    await recordBuildStates(page);
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");

    await stepLink(page, "turin").click();
    await expect(stage(page)).toHaveAttribute("data-scene-step", "turin");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    /* Built at once, with the mole's stand-in: no loading, no still. */
    expect((await buildStates(page)).slice(1)).not.toContain("loading");
    await expect(stage(page)).not.toHaveAttribute("data-fallback-reason", /./);
    const canvas = page.locator("[data-path-stage] canvas");
    await expect(canvas).toHaveAttribute("data-path-landmarks", "loading");
    const { default: sharp } = await import("sharp");
    const drawn = async () =>
      sharp(await canvas.screenshot())
        .raw()
        .toBuffer();
    const standIn = await drawn();

    release();
    await landmarksSettled(page);
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const mole = await drawn();
    let changed = 0;
    for (let i = 0; i < standIn.length; i += 4) {
      const delta = Math.max(
        Math.abs(standIn[i] - mole[i]),
        Math.abs(standIn[i + 1] - mole[i + 1]),
        Math.abs(standIn[i + 2] - mole[i + 2]),
      );
      if (delta > 32) changed++;
    }
    /* The close-up is on the mole: the model in its place redraws a share
       of the stage, where a missed swap redraws next to none. */
    expect(changed / (standIn.length / 4)).toBeGreaterThan(0.01);
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
  });

  test.describe("on a phone", () => {
    test.use({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });

    test("fetches each landmark's LOD, and no full model", async ({ page }) => {
      const models: string[] = [];
      page.on("request", (request) => {
        if (/\/path\/models\/.+\.glb$/.test(request.url())) {
          models.push(new URL(request.url()).pathname);
        }
      });
      await page.goto("/path#lille");
      await expect(stage(page)).toHaveAttribute("data-build-state", "built");
      await landmarksSettled(page);
      const index = JSON.parse(
        await readFile(
          path.join(process.cwd(), "public", LANDMARK_INDEX),
          "utf8",
        ),
      ) as Record<string, { lodFile: string }>;
      expect(models.sort()).toEqual(
        Object.values(index)
          .map((entry) => entry.lodFile)
          .sort(),
      );
    });
  });
});

/* A tile whose build throws: Lille's belfry arrives as a file that does not
   parse, which breaks Lille's tile and no other. Only Lille shows its
   stills, and the tile is tried again the next time it is selected, when
   the file is not there and the belfry's stand-in stands. */
test.describe("a tile that fails to build", () => {
  const BELFRY = "**/path/models/lille-belfry.glb";

  test.beforeEach(async ({ page }) => {
    await listLandmarks(page, ["lille-belfry"]);
    await page.route(BELFRY, (route) =>
      route.fulfill({
        status: 200,
        contentType: "model/gltf-binary",
        body: "not a model",
      }),
    );
  });

  test("shows its stills and why; the other tiles still build", async ({
    page,
  }) => {
    const errors: Error[] = [];
    page.on("pageerror", (error) => errors.push(error));
    await page.goto("/path#lille");
    await expect(stage(page)).toHaveAttribute(
      "data-fallback-reason",
      "scene-failed",
    );
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "webgl");
    await expect(page.locator("[data-path-fallback-reason]")).toHaveText(
      SCENE_FALLBACK_LINES["scene-failed"]("Lille"),
    );
    await expect(page.locator("[data-path-stage] canvas")).toBeHidden();
    await expect(buildControl(page)).toHaveCount(0);

    await stepLink(page, "cuneo-2022").click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect(page.locator("[data-path-fallback-reason]")).toHaveCount(0);
    await expect(page.locator("[data-path-stage] canvas")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("is tried again when it is next selected", async ({ page }) => {
    await page.goto("/path#lille");
    await expect(stage(page)).toHaveAttribute(
      "data-fallback-reason",
      "scene-failed",
    );
    await page.unroute(BELFRY);
    await stepLink(page, "now").click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await stepLink(page, "lille").click();
    await expect(stage(page)).toHaveAttribute("data-scene-step", "lille");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect(stage(page)).not.toHaveAttribute("data-fallback-reason", /./);
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      /belfry courtyard pipe-loop clock-face/,
    );
  });
});

/* A tile's landmark that does not arrive: that tile shows its stills and
   says why, the rest of the board builds, and the next selection of the tile
   fetches it again. */
test.describe("a tile whose landmarks fail to load", () => {
  test("shows its stills and why, and loads them on its next selection", async ({
    page,
  }) => {
    let fail = true;
    await listLandmarks(page, ["lille-belfry"]);
    await page.route("**/path/models/lille-belfry.glb", (route) =>
      fail ? route.fulfill({ status: 500 }) : route.continue(),
    );
    await page.goto("/path#lille");
    await expect(stage(page)).toHaveAttribute(
      "data-fallback-reason",
      "assets-failed",
    );
    await expect(page.locator("[data-path-fallback-reason]")).toHaveText(
      SCENE_FALLBACK_LINES["assets-failed"]("Lille"),
    );

    await stepLink(page, "home").click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect(page.locator("[data-path-fallback-reason]")).toHaveCount(0);

    fail = false;
    await stepLink(page, "lille").click();
    await expect(stage(page)).toHaveAttribute("data-scene-step", "lille");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect(stage(page)).not.toHaveAttribute("data-fallback-reason", /./);
  });
});

test.describe("the fallback", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
    });
  });

  test("with getContext refusing, /path shows the stills and why, and loads no 3D", async ({
    page,
  }) => {
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));
    await page.goto("/path#cuneo-2022");
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "fallback");
    await expect(stage(page)).toHaveAttribute(
      "data-fallback-reason",
      "context-failed",
    );
    await expect(page.locator("[data-path-fallback-reason]")).toHaveText(
      FALLBACK_REASON_LINES["context-failed"],
    );
    const still = page.locator(
      '[data-path-backdrop="cuneo-2022"] [data-path-still="light"]',
    );
    await expect(still).toBeVisible();
    await expect
      .poll(() => still.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await expect(page.locator("[data-path-stage] canvas")).toBeHidden();
    await expect(buildControl(page)).toHaveCount(0);
    expect(requested.filter((url) => threeChunk.test(url))).toEqual([]);
  });
});
