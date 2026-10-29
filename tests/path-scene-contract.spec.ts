/* The scene runtime's contract without a browser (#148): the fallback decision
   for each trigger storyboard §7.4 lists, and what each step builds. #141's
   testing decisions ask for the pure function to be tested directly; the
   browser half is `path-scene.spec.ts`. */

import { expect, test } from "@playwright/test";

import {
  buildPlan,
  hasScene,
  litLines,
  SCENES_WITH_ART,
} from "@/components/path/scene/build-plan";
import {
  decideFallback,
  FALLBACK_REASON_LINES,
  SCENE_FALLBACK_LINES,
  type CapabilitySignals,
} from "@/components/path/scene/fallback";
import {
  DRAWING_BYTES_PER_PIXEL,
  drawingPixelRatio,
  MAX_DRAWING_PIXELS,
  MAX_PIXEL_RATIO,
} from "@/components/path/scene/drawing-buffer";
import { SCENES } from "@/components/path/scene/scenes";
import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";

const capable: CapabilitySignals = {
  webgl2: true,
  context: "ok",
  saveData: false,
};

const frames = (count: number, ms: number) =>
  Array.from({ length: count }, () => ms);

const stepNamed = (slug: PathStepSlug) =>
  PATH_STEPS.find((step) => step.slug === slug)!;

test.describe("the fallback decision", () => {
  test("a capable browser keeps the scene, before and after its frames", () => {
    expect(decideFallback(capable)).toBeNull();
    expect(decideFallback(capable, frames(60, 16.7))).toBeNull();
  });

  test("each capability trigger shows the stills, with its own reason", () => {
    expect(decideFallback({ ...capable, webgl2: false })).toBe("no-webgl2");
    expect(decideFallback({ ...capable, context: "failed" })).toBe(
      "context-failed",
    );
    expect(
      decideFallback({ ...capable, context: "major-performance-caveat" }),
    ).toBe("performance-caveat");
    expect(decideFallback({ ...capable, saveData: true })).toBe("save-data");
  });

  test("the median of the first 60 frames above 33 ms shows the stills", () => {
    expect(decideFallback(capable, frames(60, 34))).toBe("slow-frames");
    /* "Above 33 ms": exactly 33 is not slow. */
    expect(decideFallback(capable, frames(60, 33))).toBeNull();
    /* A median, not a mean: a few long frames (shader compiles) do not tip
       it, and a majority of them does. */
    expect(
      decideFallback(capable, [...frames(29, 200), ...frames(31, 16)]),
    ).toBeNull();
    expect(
      decideFallback(capable, [...frames(31, 200), ...frames(29, 16)]),
    ).toBe("slow-frames");
  });

  test("fewer than 60 frames is no verdict, and later frames never reopen it", () => {
    expect(decideFallback(capable, frames(59, 100))).toBeNull();
    expect(
      decideFallback(capable, [...frames(60, 16), ...frames(200, 100)]),
    ).toBeNull();
  });

  test("every reason has a line saying why", () => {
    for (const line of Object.values(FALLBACK_REASON_LINES)) {
      expect(line).toMatch(/^Showing stills: /);
    }
    for (const line of Object.values(SCENE_FALLBACK_LINES)) {
      expect(line("Lille")).toMatch(/^Showing stills: /);
    }
  });

  test("a scene's failed assets are named as that scene's", () => {
    expect(SCENE_FALLBACK_LINES["assets-failed"]("Lille")).toContain(
      "Lille’s models",
    );
    expect(SCENE_FALLBACK_LINES["scene-failed"]("Lille")).toContain(
      "the scene failed to build",
    );
  });
});

test.describe("what each step builds", () => {
  /* The host decides from `SCENES_WITH_ART` whether to show the canvas; the
     runtime draws from `SCENES`. Out of step, a scene would show a stale
     canvas over its still, or never show at all. */
  test("the scenes the host shows are the scenes the runtime has art for", () => {
    expect(Object.keys(SCENES).sort()).toEqual([...SCENES_WITH_ART].sort());
  });

  test("every prop a step with art names has art in its scene", () => {
    expect(SCENES_WITH_ART).toEqual(["home", "lille"]);
    for (const step of PATH_STEPS.filter(hasScene)) {
      for (const prop of step.props) {
        expect(
          SCENES[step.sceneId]!.props,
          `${step.slug}'s ${prop.id}`,
        ).toHaveProperty([prop.id]);
      }
    }
  });

  /* Home builds up (storyboard §7.1): a return shows the earlier stages'
     props in place and builds only its own. */
  test("home's returns stand on the earlier steps' props", () => {
    expect(buildPlan(stepNamed("home")).standing).toEqual([]);
    expect(buildPlan(stepNamed("cuneo-2022")).standing).toEqual([
      "plateau",
      "bisalta",
      "school",
    ]);
    expect(buildPlan(stepNamed("now")).standing).toEqual([
      "plateau",
      "bisalta",
      "school",
      "schoolroom",
      "mvp-window",
    ]);

    expect(buildPlan(stepNamed("home")).building.map((p) => p.id)).toEqual([
      "plateau",
      "bisalta",
      "school",
    ]);
    expect(
      buildPlan(stepNamed("cuneo-2022")).building.map((p) => p.id),
    ).toEqual(["schoolroom", "mvp-window"]);
    expect(buildPlan(stepNamed("now")).building.map((p) => p.id)).toEqual([
      "startup-desk",
      "office",
    ]);
  });

  test("every build lands its props in order over about 2–3 s", () => {
    for (const step of PATH_STEPS) {
      const { building } = buildPlan(step);
      const lands = building.map((prop) => prop.landsAt);
      expect(lands, step.slug).toEqual([...lands].sort((a, b) => a - b));
      expect(lands.at(-1)!, step.slug).toBeGreaterThanOrEqual(2000);
      expect(lands.at(-1)!, step.slug).toBeLessThanOrEqual(3000);
    }
  });

  test("a caption line lights when its prop lands, and stays lit", () => {
    const plan = buildPlan(stepNamed("now"));
    const [desk, office] = plan.building;
    expect(litLines(plan, 0)).toEqual([]);
    expect(litLines(plan, desk.landsAt - 1)).toEqual([]);
    expect(litLines(plan, desk.landsAt)).toEqual([0]);
    expect(litLines(plan, office.landsAt)).toEqual([0, 3]);
    expect(litLines(plan, office.landsAt + 10_000)).toEqual([0, 3]);
  });
});

/* GH-141's 64 MB GPU budget, against the stage sizes the measurement report
   estimates (docs/path-measurements.md): CSS width and height of the stage. */
test.describe("the drawing buffer", () => {
  const MB = 1024 * 1024;
  /** The scenes' uploaded buffers and textures, from the report. */
  const UPLOADS = 1.8 * MB;
  const bufferBytes = (width: number, height: number, dpr: number) => {
    const ratio = drawingPixelRatio(width, height, dpr);
    return (
      Math.floor(width * ratio) *
      Math.floor(height * ratio) *
      DRAWING_BYTES_PER_PIXEL
    );
  };

  test("a 2560-wide, ×2 screen stays under the 64 MB budget", () => {
    expect(bufferBytes(2096, 448, 2) + UPLOADS).toBeLessThanOrEqual(64 * MB);
  });

  test("no stage holds more than its pixel cap, at any density", () => {
    for (const [width, height] of [
      [342, 224],
      [976, 378],
      [2096, 448],
      [3376, 448],
      [7000, 448],
    ]) {
      for (const dpr of [1, 2, 3]) {
        const ratio = drawingPixelRatio(width, height, dpr);
        expect(ratio).toBeLessThanOrEqual(Math.min(dpr, MAX_PIXEL_RATIO));
        expect(width * ratio * height * ratio).toBeLessThanOrEqual(
          MAX_DRAWING_PIXELS + 1,
        );
      }
    }
  });

  test("a stage under the cap keeps the device's ratio, up to 1.5", () => {
    expect(drawingPixelRatio(976, 378, 2)).toBe(MAX_PIXEL_RATIO);
    expect(drawingPixelRatio(342, 224, 1)).toBe(1);
  });
});
