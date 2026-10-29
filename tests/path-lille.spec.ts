/* Lille's scene on `/path` (#149): the belfry and the Vieille Bourse
   courtyard ringed with a pipe loop, and a clock whose hand sweeps to the
   projected saving. The contract is #141 — decisions 3, 8, 10 and 11 — with
   storyboard §7.5 and the asset budgets of §9 and §11 in
   docs/research/experience-rethink.md. The runtime's shared behaviour is
   `path-scene.spec.ts`; this is what Lille adds to it. */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { BoxGeometry, Group, Mesh, type Object3D } from "three";

import { buildPlan, stillsFor } from "@/components/path/scene/build-plan";
import type { SceneKit } from "@/components/path/scene/definition";
import { FALLBACK_REASON_LINES } from "@/components/path/scene/fallback";
import {
  HAND_END_ANGLE,
  handAngle,
  LILLE_FIGURE,
  LILLE_SCENE,
} from "@/components/path/scene/lille";
import { decodeModel, encodeModel } from "@/components/path/scene/model-format";
import { PATH_STEPS } from "@/data/path";

const lille = PATH_STEPS.find((step) => step.slug === "lille")!;
const publicFile = (url: string) => path.join(process.cwd(), "public", url);
const stage = (page: Page) => page.locator("[data-path-stage]");
const overlay = (page: Page) => page.locator("[data-path-overlay]");

/* §9 and §11's budgets. */
const STILL_BYTES = 150 * 1024;
const MODEL_BYTES = 300 * 1024;
const SCENE_BYTES = 1.5 * 1024 * 1024;

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

  /* The runtime poses a prop's motion at progress 1 for its end state, which
     Skip and reduced motion show: the hand there is on the mark. */
  test("the clock's motion at its end puts the hand on the mark", () => {
    const stub = (): Object3D => new Group();
    const kit: SceneKit = {
      solid: (geometry) => new Mesh(geometry),
      pane: (geometry) => new Mesh(geometry),
      model: stub,
      text: () => new Mesh(new BoxGeometry()),
    };
    const clock = LILLE_SCENE.props["clock-face"](kit);
    LILLE_SCENE.motions!["clock-face"](clock, 1);
    expect(clock.getObjectByName("hand")!.rotation.z).toBe(HAND_END_ANGLE);
    LILLE_SCENE.motions!["clock-face"](clock, 0);
    expect(clock.getObjectByName("hand")!.rotation.z).toBeCloseTo(0);
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

  test("each Hunyuan3D prop is at most 300 KB, and decodes", async () => {
    const models = Object.values(LILLE_SCENE.models ?? {});
    expect(models).toHaveLength(2);
    for (const url of models) {
      const file = await readFile(publicFile(url));
      expect(file.length, url).toBeLessThanOrEqual(MODEL_BYTES);
      const { positions, indices } = decodeModel(
        file.buffer.slice(file.byteOffset, file.byteOffset + file.length),
      );
      expect(indices.length % 3, url).toBe(0);
      expect(Math.max(...indices), url).toBeLessThan(positions.length / 3);
    }
  });

  /* What selecting Lille fetches beyond the runtime: its models and one
     still. The runtime's own weight is #152's to measure. */
  test("Lille's assets transfer well under 1.5 MB", async () => {
    const files = [
      ...Object.values(LILLE_SCENE.models ?? {}),
      ...Object.values(stillsFor(lille)!),
    ];
    let total = 0;
    for (const url of files) total += (await stat(publicFile(url))).size;
    expect(total).toBeLessThanOrEqual(SCENE_BYTES);
  });
});

test.describe("on /path", () => {
  test.describe("the build", () => {
    test.use({ contextOptions: { reducedMotion: "no-preference" } });

    test("Lille loads its models, then builds in about 2–3 s and ends still", async ({
      page,
    }) => {
      const models: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes("/path/models/")) models.push(request.url());
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
        "belfry courtyard pipe-loop clock-face",
      );
      await expect(overlay(page)).toHaveAttribute("data-path-lit", "0 1 2");
      /* One fetch each, however many times the stage asked to show Lille. */
      expect(models.sort()).toEqual(
        Object.values(LILLE_SCENE.models!)
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
        buildPlan(lille)
          .building.map((prop) => prop.id)
          .join(" "),
      );
    });
  });

  /* A return draws Lille from the models it already holds, so it must look
     as it did the first time: no prop resized, nothing missing. Antialiasing
     and the label's texture differ by a few pixels between draws; a resized
     prop changes a large share of the stage. */
  test("a return to Lille draws the scene it drew the first time", async ({
    page,
  }) => {
    /* What is under test is the drawing, not the frame rate: a steady
       60 Hz clock keeps a loaded test machine from tripping the slow-frames
       fallback halfway through. */
    await page.addInitScript(() => {
      const native = window.requestAnimationFrame.bind(window);
      let now = 0;
      window.requestAnimationFrame = (callback) =>
        native(() => callback((now += 1000 / 60)));
    });
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
    await expect(stage(page)).toHaveAttribute("data-scene-props", /plateau/);
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await page.locator('[data-path-step-link="lille"]').click();
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

  test("under reduced motion, Lille shows its end state without a build", async ({
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
      "belfry courtyard pipe-loop clock-face",
    );
  });

  test("a model that does not load shows Lille's still and says why", async ({
    page,
  }) => {
    await page.route("**/path/models/**", (route) => route.abort());
    await page.goto("/path#lille");
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "fallback");
    await expect(stage(page)).toHaveAttribute(
      "data-fallback-reason",
      "assets-failed",
    );
    await expect(page.locator("[data-path-fallback-reason]")).toHaveText(
      FALLBACK_REASON_LINES["assets-failed"],
    );
    const still = page.locator(
      '[data-path-backdrop="lille"] [data-path-still="light"]',
    );
    await expect(still).toBeVisible();
    await expect
      .poll(() => still.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  });
});
