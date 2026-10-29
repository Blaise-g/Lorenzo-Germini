/* The board runtime's contract without a browser (#148, v2's board): the
   fallback decision for each trigger storyboard §7.4 lists, what each step
   builds, the board's layout and its motion curves. #141's testing decisions
   ask for the pure functions to be tested directly; the browser halves are
   `path-scene.spec.ts` and `path-board.spec.ts`. */

import { expect, test } from "@playwright/test";

import {
  buildPlan,
  hasScene,
  litLines,
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
import {
  framePoints,
  LOOP,
  MVP_INK_STRENGTH,
  MVP_WINDOW_LINES,
  TILE,
  tileCentre,
  tileScale,
} from "@/components/path/scene/board";
import { CARD_ART, cardsForStep } from "@/components/path/scene/card-art";
import {
  FOLD_FROM,
  foldPose,
  loopSteps,
  MAX_MOVE_MS,
  moveDuration,
  movePose,
  spring,
} from "@/components/path/scene/motion";
import { MVP_WINDOW_LABEL, PATH_STEPS } from "@/data/path";
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
      "Lille’s cards",
    );
    expect(SCENE_FALLBACK_LINES["scene-failed"]("Lille")).toContain(
      "the scene failed to build",
    );
  });
});

test.describe("what each step builds", () => {
  /* Every step is a tile on the one board (v2's board ticket), so the host
     shows the canvas for every step. */
  test("every step has art", () => {
    expect(PATH_STEPS.every(hasScene)).toBe(true);
  });

  /* The runtime stands each prop's card up when it lands: a prop with no
     card would light its caption line over an empty tile. */
  test("every prop a step names has a card on that step's tile", () => {
    for (const step of PATH_STEPS) {
      const cards = cardsForStep(step.slug).map((card) => card.prop);
      for (const prop of step.props) {
        expect(cards, `${step.slug}'s ${prop.id}`).toContain(prop.id);
      }
    }
    /* And no card renders a prop its step does not name. */
    for (const card of CARD_ART.filter((art) => art.prop)) {
      expect(
        stepNamed(card.step).props.map((prop) => prop.id),
        card.id,
      ).toContain(card.prop);
    }
  });

  /* The pawn has passed every earlier tile on its way here, so a step
     arrived at cold stands on every earlier step's props, in the data's
     order, and builds only its own. */
  test("a step stands on every earlier step's props and builds its own", () => {
    expect(buildPlan(stepNamed("home")).standing).toEqual([]);
    expect(buildPlan(stepNamed("cuneo-2022")).standing).toEqual([
      "plateau",
      "bisalta",
      "school",
      "mole",
      "coils",
      "lake",
      "roche-dial",
      "jet-d-eau",
    ]);
    expect(buildPlan(stepNamed("next")).standing).toEqual(
      PATH_STEPS.slice(0, -1).flatMap((step) => step.props.map((p) => p.id)),
    );

    for (const step of PATH_STEPS) {
      expect(
        buildPlan(step).building.map((p) => p.id),
        step.slug,
      ).toEqual(step.props.map((p) => p.id));
    }
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
  /** The board's uploaded buffers and textures, shadow map included, from
   *  the report: 19.9 MiB measured. */
  const UPLOADS = 20 * MB;
  const bufferBytes = (width: number, height: number, dpr: number) => {
    const ratio = drawingPixelRatio(width, height, dpr);
    return (
      Math.floor(width * ratio) *
      Math.floor(height * ratio) *
      DRAWING_BYTES_PER_PIXEL
    );
  };

  /* The stage's CSS size at 1440×900, 2560×1440 and 375×812, measured. */
  test("every measured stage stays under the 64 MB budget, at ×2 and ×3", () => {
    for (const [width, height] of [
      [976, 522],
      [2096, 640],
      [327, 471],
    ]) {
      for (const dpr of [2, 3]) {
        expect(
          bufferBytes(width, height, dpr) + UPLOADS,
          `${width}×${height} at ×${dpr}`,
        ).toBeLessThanOrEqual(64 * MB);
      }
    }
  });

  test("no stage holds more than its pixel cap, at any density", () => {
    for (const [width, height] of [
      [342, 224],
      [976, 378],
      [2096, 640],
      [3376, 640],
      [7000, 640],
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

/* Decision 3: home's step 4 shows the dimmed "MVP — killed after customer
   discovery" window. The words come from the step's own line. */
test.describe("the MVP window", () => {
  const cuneo = PATH_STEPS.find((step) => step.slug === "cuneo-2022")!;
  const prop = cuneo.props.find((p) => p.id === "mvp-window")!;

  test("carries decision 3's label, from the line it captions", () => {
    expect(MVP_WINDOW_LABEL).toBe("MVP — killed after customer discovery");
    expect(prop.name).toBe(MVP_WINDOW_LABEL);
    expect(cuneo.lines[prop.captionLine]).toMatch(
      /MVP.*Killed it on the evidence after customer discovery\.$/,
    );
  });

  test("is printed on a tag in two lines, faded", () => {
    expect(MVP_WINDOW_LINES).toEqual([
      "MVP —",
      "killed after customer discovery",
    ]);
    expect(MVP_WINDOW_LINES.join(" ")).toBe(MVP_WINDOW_LABEL);
    expect(MVP_INK_STRENGTH).toBeGreaterThan(0);
    expect(MVP_INK_STRENGTH).toBeLessThan(1);
  });
});

/* Comp B: seven tiles on a closed loop in the data's order, Lille and home
   the heroes, Lille at the front and "?" closing the loop beside home. */
test.describe("the board", () => {
  test("the loop is the data's steps, in order", () => {
    expect(LOOP).toEqual(PATH_STEPS.map((step) => step.slug));
    expect(LOOP).toEqual([
      "home",
      "turin",
      "switzerland",
      "cuneo-2022",
      "lille",
      "now",
      "next",
    ]);
  });

  test("Lille is front and centre, home at the back, and both are heroes", () => {
    const [lx, lz] = tileCentre("lille");
    expect(lx).toBeCloseTo(0, 6);
    for (const slug of LOOP)
      expect(tileCentre(slug)[1]).toBeLessThanOrEqual(lz);
    expect(tileCentre("home")[1]).toBeLessThan(0);
    expect(tileScale("lille")).toBeGreaterThan(1);
    expect(tileScale("home")).toBeGreaterThan(1);
    expect(tileScale("turin")).toBe(1);
  });

  /* Neighbours on the loop are neighbours on the table: each tile's
     nearest other tile is one of its two loop neighbours, so "?" sits
     beside home and the pawn's one-tile hop is to an adjacent tile. */
  test("each tile's nearest tile is a neighbour on the loop", () => {
    const distance = (a: string, b: string) => {
      const [ax, az] = tileCentre(a as (typeof LOOP)[number]);
      const [bx, bz] = tileCentre(b as (typeof LOOP)[number]);
      return Math.hypot(ax - bx, az - bz);
    };
    LOOP.forEach((slug, index) => {
      const neighbours = [
        LOOP[(index + 1) % LOOP.length],
        LOOP[(index + LOOP.length - 1) % LOOP.length],
      ];
      const nearest = LOOP.filter((other) => other !== slug).sort(
        (a, b) => distance(slug, a) - distance(slug, b),
      )[0];
      expect(neighbours, slug).toContain(nearest);
    });
    expect([LOOP[0], LOOP.at(-1)]).toEqual(["home", "next"]);
  });

  test("no two tiles overlap on the table", () => {
    const box = (slug: (typeof LOOP)[number]) => {
      const [x, z] = tileCentre(slug);
      const w = (TILE.width / 2) * tileScale(slug);
      const d = (TILE.depth / 2) * tileScale(slug);
      return { left: x - w, right: x + w, back: z - d, front: z + d };
    };
    for (const [i, a] of LOOP.entries()) {
      for (const b of LOOP.slice(i + 1)) {
        const p = box(a);
        const q = box(b);
        const overlap =
          p.left < q.right &&
          q.left < p.right &&
          p.back < q.front &&
          q.back < p.front;
        expect(overlap, `${a} and ${b}`).toBe(false);
      }
    }
  });

  test("the camera frames every tile and every card's top", () => {
    const points = framePoints();
    const cards = CARD_ART.length;
    /* Four footprint corners and a hop top per tile, two corners a card. */
    expect(points).toHaveLength(LOOP.length * 5 + cards * 2);
    for (const [, y] of points) expect(y).toBeGreaterThanOrEqual(0);
  });
});

/* The motion grammar (ticket: subtle-bounce spring, never from scale 0; a
   far jump under about 1.2 s; one arc per tile). */
test.describe("the motion", () => {
  test("a spring starts at 0, overshoots a little, and lands on 1", () => {
    expect(spring(0, 500, 0.2)).toBe(0);
    expect(spring(10_000, 500, 0.2)).toBeCloseTo(1, 6);
    expect(spring(600, 500, 0.2, 600)).toBe(1);
    const peak = Math.max(
      ...Array.from({ length: 200 }, (_, t) => spring(t * 5, 500, 0.2)),
    );
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.15);
  });

  test("a card folds up from nearly flat, never from scale 0, and ends upright", () => {
    const start = foldPose(0, 800);
    expect(start.angle).toBe(FOLD_FROM);
    expect(Math.abs(FOLD_FROM)).toBeLessThan(Math.PI / 2);
    expect(start.opacity).toBe(0);
    for (let progress = 0; progress <= 1; progress += 0.01) {
      expect(foldPose(progress, 800).scale).toBeGreaterThanOrEqual(0.9);
    }
    expect(foldPose(1, 800)).toEqual({ angle: 0, opacity: 1, scale: 1 });
    /* Past upright, a little, on the way: the subtle bounce. */
    const angles = Array.from(
      { length: 99 },
      (_, i) => foldPose((i + 1) / 100, 800).angle,
    );
    expect(Math.max(...angles)).toBeGreaterThan(0);
    expect(Math.max(...angles)).toBeLessThan(0.15);
  });

  test("the pawn goes the short way round the loop", () => {
    expect(loopSteps(0, 1, 7)).toBe(1);
    expect(loopSteps(0, 3, 7)).toBe(3);
    expect(loopSteps(0, 4, 7)).toBe(-3);
    expect(loopSteps(0, 6, 7)).toBe(-1);
    expect(loopSteps(6, 0, 7)).toBe(1);
    expect(loopSteps(4, 4, 7)).toBe(0);
  });

  test("a move lasts under 1.2 s however far, and longer the farther", () => {
    expect(moveDuration(0)).toBe(0);
    const durations = [1, 2, 3].map(moveDuration);
    expect(durations).toEqual([...durations].sort((a, b) => a - b));
    for (const steps of [1, 2, 3, -3]) {
      expect(moveDuration(steps)).toBeLessThanOrEqual(MAX_MOVE_MS);
    }
    expect(MAX_MOVE_MS).toBeLessThanOrEqual(1200);
  });

  test("the pawn hops once per tile and lands on the last", () => {
    for (const steps of [1, 3, -3]) {
      expect(movePose(steps, 1)).toEqual({ along: steps, lift: 0 });
      let landings = 0;
      let last = 0;
      for (let i = 1; i < 2000; i++) {
        const { along, lift } = movePose(steps, i / 2000);
        expect(Math.sign(along) * Math.sign(steps)).toBeGreaterThanOrEqual(0);
        expect(lift).toBeLessThanOrEqual(1);
        if (lift < 0.05 && last >= 0.05) landings += 1;
        last = lift;
      }
      /* Each tile on the way is touched down on, the last one included. */
      expect(landings, `${steps} tiles`).toBe(Math.abs(steps));
    }
  });
});
