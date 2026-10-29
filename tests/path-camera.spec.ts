/* The camera rig on `/path` (v3; the benchmark's §4(a) and §4(f)): the
   timings and framing as pure functions first, then the shots on the real
   board — the opening, the tour's advance travelling with the pawn, a pick
   flying there, `settled` at the push-in's end with the build rising into the
   dwell, a pause freezing the rig mid-curve, the pull-back to the whole board
   after the last step, and reduced motion's crossfaded cuts. The stage names
   the shot in `data-camera-shot`. */

import { expect, test, type Page } from "@playwright/test";
import { Group, PerspectiveCamera, Vector3 } from "three";

import { STAGE_COPY } from "@/app/path/copy";
import { narrationFor } from "@/app/path/narration";
import { dwellMs, SETTLE_MAX_WAIT_MS } from "@/app/path/tour-clock";
import { buildPlan } from "@/components/path/scene/build-plan";
import {
  pieceOf,
  TILE,
  tileCentre,
  tileScale,
} from "@/components/path/scene/board";
import {
  breathing,
  CAMERA_MS,
  closeUpSlot,
  createCameraRig,
  type CameraRig,
  DRIFT,
  driftAngle,
  driftMs,
  transitTimeline,
} from "@/components/path/scene/camera-rig";
import { easeInOutCubic, easeOutQuart } from "@/components/path/scene/motion";
import { tiltShiftFor } from "@/components/path/scene/post";
import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";

/* The board draws on this machine's GPU, as `path-scene.spec.ts` explains. */
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

const DEG = Math.PI / 180;
/** Any lift: the test's rig and its own sums share it. */
const LIFT = 0.4;

test.describe("the timeline", () => {
  /* §4(a): a skip holds 0.3 s, flies 1.1 s, and the close-up has landed,
     settled, at its end; the pawn's one hop lands inside the flight. */
  test("a skip holds, flies, and settles at the flight's end", () => {
    for (const tiles of [1, 3]) {
      const skip = transitTimeline("skip", tiles);
      expect(skip.endMs).toBe(300 + 1100);
      expect(skip.pushStartMs).toBe(300);
      expect(skip.hopStartMs).toBeGreaterThanOrEqual(300);
      expect(skip.landMs).toBeLessThan(skip.endMs);
    }
  });

  /* §4(a): pull back 0.9 s, the pawn hopping 0.56 s a tile, a 1.2 s
     push-in that settles at its end, with the landing inside it. */
  test("a travel pulls back, hops a tile per 0.56 s, and pushes in", () => {
    for (const tiles of [1, 2]) {
      const travel = transitTimeline("travel", tiles);
      expect(travel.landMs - travel.hopStartMs).toBe(560 * tiles);
      expect(travel.hopStartMs).toBeGreaterThan(0);
      expect(travel.hopStartMs).toBeLessThanOrEqual(900);
      expect(travel.endMs - travel.pushStartMs).toBe(1200);
      expect(travel.landMs).toBeGreaterThan(travel.pushStartMs);
      expect(travel.landMs).toBeLessThan(travel.endMs);
    }
  });

  /* §4(a): 2.4 s from the whole board, 1.2 s for a fragment's visit; the
     landing beat overlaps the shot's last 0.3 s. */
  test("the opening is 2.4 s, or 1.2 s entering at a fragment", () => {
    const full = transitTimeline("opening", 0);
    const short = transitTimeline("opening", 0, true);
    expect(full.endMs).toBe(2400);
    expect(short.endMs).toBe(1200);
    for (const opening of [full, short]) {
      expect(opening.endMs - opening.landMs).toBe(300);
      expect(opening.landMs - opening.hopStartMs).toBe(CAMERA_MS.drop);
    }
  });

  /* The stage settles at the push-in's end and the build rises into the
     dwell (the Coordinator's ruling on §4(a)): every step's build has to
     finish while its dwell runs, the shortest dwell included, however the
     camera arrived. */
  test("every step's build ends inside its dwell, however it arrived", () => {
    const transits = [
      transitTimeline("opening", 0),
      transitTimeline("opening", 0, true),
      transitTimeline("travel", 1),
      transitTimeline("skip", 3),
    ];
    for (const step of PATH_STEPS) {
      const building = buildPlan(step).building.at(-1)?.landsAt ?? 0;
      for (const transit of transits) {
        const afterSettle = transit.landMs + building - transit.endMs;
        expect(afterSettle, `${step.slug}, ${transit.kind}`).toBeLessThan(
          dwellMs(step.slug),
        );
      }
    }
    const shortest = Math.min(...PATH_STEPS.map((step) => dwellMs(step.slug)));
    expect(shortest).toBeGreaterThan(5000);
  });

  /* §4(a): a 6° orbit across the narration and a 0.8 s tail, never under
     5 s, linear, and held at its end. */
  test("the drift is linear across the narration and its tail", () => {
    expect(driftMs(10_000)).toBe(10_800);
    expect(driftMs(1000)).toBe(DRIFT.minMs);
    const span = driftMs(narrationFor("lille").durationMs);
    expect(driftAngle(0, span)).toBe(0);
    expect(driftAngle(span / 2, span)).toBeCloseTo(3 * DEG, 12);
    expect(driftAngle(span, span)).toBeCloseTo(6 * DEG, 12);
    expect(driftAngle(span * 2, span)).toBeCloseTo(6 * DEG, 12);
  });

  /* §4(a): a 1% breathing dolly at 0.15 Hz, starting where the push-in
     landed. */
  test("the close-up breathes 1% at 0.15 Hz", () => {
    expect(breathing(0)).toBe(1);
    const samples = Array.from({ length: 2000 }, (_, i) => breathing(i * 10));
    expect(Math.max(...samples)).toBeCloseTo(1.01, 4);
    expect(Math.min(...samples)).toBeCloseTo(0.99, 4);
    expect(breathing(1000 / 0.15)).toBeCloseTo(1, 9);
  });

  /* Emil's motion guidance: arriving decelerates into the shot; a move
     between two on-screen framings eases both ways. */
  test("the push-in decelerates hard; the pulls ease both ways", () => {
    expect(easeOutQuart(0)).toBe(0);
    expect(easeOutQuart(1)).toBe(1);
    expect((1 - easeOutQuart(0.99)) / 0.01).toBeLessThan(0.001);
    expect(easeOutQuart(0.01) / 0.01).toBeGreaterThan(3.9);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(0.01) / 0.01).toBeLessThan(0.001);
    expect(easeInOutCubic(0.3) + easeInOutCubic(0.7)).toBeCloseTo(1, 12);
  });

  /* The ticket's close-up: about 60% of the frame's height, off centre and
     clear of the bar and tabs below, a portrait phone's higher. */
  test("the close-up's slot is about 60% high, lifted off the bottom", () => {
    const safe = { x0: -1, x1: 1, y0: -1, y1: 1 };
    for (const portrait of [false, true]) {
      const slot = closeUpSlot(safe, portrait);
      const height = (slot.y1 - slot.y0) / 2;
      expect(height).toBeGreaterThanOrEqual(0.55);
      expect(height).toBeLessThanOrEqual(0.7);
      expect(slot.y0).toBeGreaterThan(safe.y0 + 0.4);
      expect(slot.y1).toBeLessThanOrEqual(safe.y1);
      expect(slot.x0).toBeGreaterThanOrEqual(safe.x0);
      expect(slot.x1).toBeLessThanOrEqual(safe.x1);
    }
    expect(closeUpSlot(safe, true).y0).toBeGreaterThan(
      closeUpSlot(safe, false).y0,
    );
  });

  /* The post chain's tilt-shift follows the shot (the coordinator's review
     of v3-light on this branch): at a close-up the band, half the stage
     high and sharp, softens only towards the frame's edges, and only in
     part; a shot of the whole board is all but sharp. */
  test("the tilt-shift is gentle at a close-up and all but gone wide", () => {
    for (const wide of [0.3, 0.5]) {
      const close = tiltShiftFor(wide);
      expect(close.area - close.feather).toBeGreaterThanOrEqual(0.3);
      expect(close.area).toBeGreaterThanOrEqual(0.9);
      expect(close.strength).toBeLessThanOrEqual(0.6);
    }
    const whole = tiltShiftFor(1);
    expect(whole.strength).toBeLessThanOrEqual(0.2);
    expect(whole.area).toBeGreaterThanOrEqual(1.5);
    let last = tiltShiftFor(0).strength;
    for (let wide = 0.05; wide <= 1.2; wide += 0.05) {
      const { strength } = tiltShiftFor(wide);
      expect(strength).toBeLessThanOrEqual(last);
      last = strength;
    }
  });

  /* A landmark fills its layout box only as far as its proportions allow:
     Turin's Mole, 3.3 high in the layout, stands about 2.4 as built. The
     close-up frames what stands, so the Mole's top reaches the slot's top
     rather than leaving the box's empty top above it. */
  test("the close-up frames its pieces as built, not their boxes", () => {
    const mole = pieceOf("turin", "mole");
    const built = 2.4;
    const moleTop = (rig: CameraRig, camera: PerspectiveCamera) => {
      rig.open("turin", transitTimeline("opening", 0, false));
      rig.tick(10_000, false);
      camera.updateMatrixWorld();
      const [cx, cz] = tileCentre("turin");
      const scale = tileScale("turin");
      const y = (TILE.thickness + built) * scale + LIFT * scale;
      return Math.max(
        ...[-1, 1].flatMap((sx) =>
          [-1, 1].map(
            (sz) =>
              new Vector3(
                cx + (mole.x + (sx * mole.w) / 2) * scale,
                y,
                cz + (mole.z + (sz * mole.d) / 2) * scale,
              ).project(camera).y,
          ),
        ),
      );
    };
    const slotTop = closeUpSlot({ x0: -1, x1: 1, y0: -1, y1: 1 }, false).y1;
    const rigWith = (
      pieceHeight?: (slug: PathStepSlug, piece: string) => number | undefined,
    ) => {
      const camera = new PerspectiveCamera(30, 16 / 9, 0.1, 200);
      const rig = createCameraRig({
        camera,
        board: new Group(),
        liftHeight: LIFT,
        pieceHeight,
      });
      return moleTop(rig, camera);
    };
    expect(rigWith()).toBeLessThan(slotTop - 0.1);
    expect(
      rigWith((slug, piece) =>
        slug === "turin" && piece === "mole" ? built : undefined,
      ),
    ).toBeCloseTo(slotTop, 1);
  });
});

const stage = (page: Page) => page.locator("[data-path-stage]");
const stepLink = (page: Page, slug: PathStepSlug) =>
  page.locator(`[data-path-step-link="${slug}"]`);
const playTab = (page: Page) => page.locator("[data-path-tour-play]");

/** Every change of the stage's shot, settled cue and build state from now
 *  on, with when it happened. */
async function watchStage(page: Page) {
  await page.addInitScript(() => {
    const log: { at: number; state: string }[] = [];
    (window as unknown as { __stage: typeof log }).__stage = log;
    new MutationObserver(() => {
      const element = document.querySelector("[data-path-stage]");
      if (!element) return;
      const state = [
        element.getAttribute("data-camera-shot") ?? "-",
        element.hasAttribute("data-stage-settled") ? "settled" : "moving",
        element.getAttribute("data-build-state"),
        element.getAttribute("data-scene-step"),
      ].join(" ");
      if (log.at(-1)?.state !== state) {
        log.push({ at: performance.now(), state });
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      childList: true,
      attributeFilter: [
        "data-camera-shot",
        "data-stage-settled",
        "data-build-state",
        "data-scene-step",
      ],
    });
  });
}

const stageLog = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __stage: { at: number; state: string }[] })
        .__stage,
  );

/** Draw calls so far, counted at the GL context. */
async function countDraws(page: Page) {
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
}

/** Waits for every landmark the index lists to have arrived, or failed.
 *  The board loads all but the first step's once it is up, when the page
 *  is idle; one landing in view draws, so a count of draws held still
 *  starts after the last. */
async function landmarksSettled(page: Page) {
  await expect(page.locator("[data-path-stage] canvas")).toHaveAttribute(
    "data-path-landmarks",
    "settled",
    { timeout: 15_000 },
  );
}

const draws = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __draws: { draws: number } }).__draws.draws,
  );

test.describe("with motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("the opening swoops in, and settles as the close-up lands", async ({
    page,
  }) => {
    await watchStage(page);
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "close-up", {
      timeout: 15_000,
    });
    await expect(stage(page)).toHaveAttribute("data-stage-settled", "");
    const log = await stageLog(page);
    const opening = log.find((entry) => entry.state.startsWith("opening"))!;
    const landed = log.find((entry) => entry.state.startsWith("close-up"))!;
    expect(opening, JSON.stringify(log)).toBeTruthy();
    expect(opening.state).toMatch(/moving/);
    expect(landed.state).toMatch(/settled/);
    expect(landed.at - opening.at).toBeGreaterThan(2000);
  });

  /* A pick takes the skip flight; the stage settles when it lands, about
     1.4 s on, with the tile's build still rising into the dwell. */
  test("a pick flies there and settles at the flight's end", async ({
    page,
  }) => {
    await watchStage(page);
    await page.goto("/path#lille");
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "close-up", {
      timeout: 15_000,
    });
    const clicked = await page.evaluate(() => performance.now());
    await stepLink(page, "now").click();
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "skip");
    await expect(stage(page)).not.toHaveAttribute("data-stage-settled", /.*/);
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "close-up");
    await expect(stage(page)).toHaveAttribute("data-stage-settled", "");
    const log = (await stageLog(page)).filter((entry) => entry.at > clicked);
    const settled = log.find((entry) => /settled \S+ now$/.test(entry.state))!;
    expect(settled, JSON.stringify(log)).toBeTruthy();
    expect(settled.state).toBe("close-up settled building now");
    /* No sooner than the 1.4 s flight; a loaded machine only stretches it. */
    expect(settled.at - clicked).toBeGreaterThan(1300);
    expect(log.some((entry) => entry.state.startsWith("travel"))).toBe(false);
  });

  /* Skip lands the camera with the build, at once: well inside the
     second and more the flight still had to run. */
  test("Skip lands the flight and the build at once", async ({ page }) => {
    await page.goto("/path#lille");
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "close-up", {
      timeout: 15_000,
    });
    await stepLink(page, "turin").click();
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "skip");
    await page.locator("[data-path-build-control]").click();
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "close-up", {
      timeout: 700,
    });
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect(stage(page)).toHaveAttribute("data-stage-settled", "");
  });
});

/** Fake time, paused: frames and the tour's timers run only when the test
 *  runs the clock. */
async function pauseTime(page: Page) {
  const start = new Date("2026-10-29T09:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
}

/** Runs frames until the stage reports `slug` settled. The board's files
 *  arrive in real time, not the page's fake time: a clock run while they
 *  load spends the settle wait, and the tour's own, on a build not yet
 *  begun. So the clock runs only once the build has. */
async function runUntilSettled(page: Page, slug: PathStepSlug) {
  await expect(stage(page)).toHaveAttribute(
    "data-build-state",
    /^(building|built)$/,
    { timeout: 15_000 },
  );
  let elapsed = 0;
  while (elapsed < SETTLE_MAX_WAIT_MS) {
    const element = stage(page);
    if (
      (await element.getAttribute("data-stage-settled")) !== null &&
      (await element.getAttribute("data-scene-step")) === slug
    ) {
      /* The idle load of the rest has had its fake time by now; the files
         arrive in real time. */
      await landmarksSettled(page);
      return elapsed;
    }
    await page.clock.runFor(100);
    elapsed += 100;
  }
  throw new Error(`${slug} never settled`);
}

test.describe("with the tour's clock", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test.beforeEach(async ({ page }) => {
    await countDraws(page);
    await pauseTime(page);
  });

  /* The tour's own advance walks the pawn and travels with it; a pause
     freezes the travel where it is, and play carries it on to land. */
  test("the tour's advance travels, and a pause freezes it mid-curve", async ({
    page,
  }) => {
    await page.goto("/path#turin");
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "webgl", {
      timeout: 15_000,
    });
    await runUntilSettled(page, "turin");
    await expect
      .poll(() =>
        page.locator("[data-path-tour]").getAttribute("data-path-tour-phase"),
      )
      .toBe("dwelling");
    await page.clock.runFor(dwellMs("turin"));
    await expect(page).toHaveURL(/#switzerland$/);
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "travel");
    await page.clock.runFor(500);

    await playTab(page).click();
    await expect(page.locator("[data-path-tour]")).toHaveAttribute(
      "data-path-tour",
      "paused",
    );
    await page.clock.runFor(100);
    const frozen = await draws(page);
    await page.clock.runFor(3000);
    expect(await draws(page)).toBe(frozen);
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "travel");
    await expect(stage(page)).not.toHaveAttribute("data-stage-settled", /.*/);

    await playTab(page).click();
    await runUntilSettled(page, "switzerland");
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "close-up");
  });

  /* A pick while paused plays its flight, then holds still: the close-up
     breathes only while the tour plays. */
  test("a pick while paused flies there, then holds still", async ({
    page,
  }) => {
    await page.goto("/path#turin");
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "webgl", {
      timeout: 15_000,
    });
    await runUntilSettled(page, "turin");
    await playTab(page).click();
    await expect(page.locator("[data-path-tour]")).toHaveAttribute(
      "data-path-tour",
      "paused",
    );

    await stepLink(page, "lille").click();
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "skip");
    await runUntilSettled(page, "lille");
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "close-up");
    /* Let the build finish rising, then nothing moves. */
    await page.clock.runFor(4000);
    const held = await draws(page);
    await page.clock.runFor(2000);
    expect(await draws(page)).toBe(held);
  });

  /* A pause freezes the tour, not the visitor: a theme change or a turn
     made while paused still plays out, then the board stops drawing. */
  async function pausedOnTurin(page: Page) {
    await page.goto("/path#turin");
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "webgl", {
      timeout: 15_000,
    });
    await runUntilSettled(page, "turin");
    await playTab(page).click();
    await expect(page.locator("[data-path-tour]")).toHaveAttribute(
      "data-path-tour",
      "paused",
    );
    await page.clock.runFor(4000);
  }

  test("while paused, a theme change plays out, then stops", async ({
    page,
  }) => {
    await pausedOnTurin(page);
    await page.evaluate(() =>
      document.documentElement.classList.toggle("dark"),
    );
    await page.clock.runFor(1000);
    const held = await draws(page);
    await page.clock.runFor(2000);
    expect(await draws(page)).toBe(held);
  });

  test("while paused, a turn plays out, then stops", async ({ page }) => {
    await pausedOnTurin(page);
    /* The board's top half: the stage's own controls lie lower down. */
    const box = (await page.locator("[data-path-stage] canvas").boundingBox())!;
    const board = () =>
      page.screenshot({
        clip: { x: box.x, y: box.y, width: box.width, height: box.height / 2 },
      });
    await page.getByRole("button", { name: STAGE_COPY.turnLeft }).click();
    await page.clock.runFor(50);
    const started = await board();
    await page.clock.runFor(1000);
    expect((await board()).equals(started)).toBe(false);
    const held = await draws(page);
    await page.clock.runFor(2000);
    expect(await draws(page)).toBe(held);
  });

  /* After the last step's dwell the camera pulls back to the whole board
     and holds there; the step stays settled. */
  test("after the last step, it pulls back to the whole board", async ({
    page,
  }) => {
    await page.goto("/path#next");
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "webgl", {
      timeout: 15_000,
    });
    await runUntilSettled(page, "next");
    await expect
      .poll(() =>
        page.locator("[data-path-tour]").getAttribute("data-path-tour-phase"),
      )
      .toBe("dwelling");
    await page.clock.runFor(dwellMs("next"));
    await expect(page.locator("[data-path-tour]")).toHaveAttribute(
      "data-path-tour",
      "ended",
    );
    await page.clock.runFor(100);
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "end");
    await page.clock.runFor(CAMERA_MS.end + 100);
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "overview");
    await expect(stage(page)).toHaveAttribute("data-stage-settled", "");
    /* The follow's last millimetres, from a whole board away. */
    await page.clock.runFor(1500);
    const held = await draws(page);
    await page.clock.runFor(2000);
    expect(await draws(page)).toBe(held);

    /* Replay from there flies back to the close-up to build it again. */
    await page.locator("[data-path-build-control]").click();
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "skip");
    await runUntilSettled(page, "next");
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "close-up");
  });
});

/* §4(f): no autoplay and no move; a selection cuts to its close-up with a
   150 ms crossfade, and the close-up does not drift or breathe. */
test.describe("under reduced motion", () => {
  test("a selection cuts to its close-up, crossfading", async ({ page }) => {
    await watchStage(page);
    await countDraws(page);
    /* The crossfade's copy lives 150 ms: count it as it is added. */
    await page.addInitScript(() => {
      const added = { count: 0 };
      (window as unknown as { __crossfades: typeof added }).__crossfades =
        added;
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (
              node instanceof HTMLElement &&
              node.hasAttribute("data-path-crossfade")
            ) {
              added.count += 1;
            }
          }
        }
      }).observe(document, { subtree: true, childList: true });
    });
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-camera-shot", "close-up", {
      timeout: 15_000,
    });
    await stepLink(page, "lille").click();
    await expect(stage(page)).toHaveAttribute("data-scene-step", "lille");
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __crossfades: { count: number } })
            .__crossfades.count,
      ),
    ).toBe(1);
    await expect(page.locator("[data-path-crossfade]")).toHaveCount(0);
    await expect(page.locator("[data-path-stage] canvas")).toHaveCount(1);
    const shots = (await stageLog(page)).map(
      (entry) => entry.state.split(" ")[0],
    );
    expect(shots.filter((shot) => shot !== "-" && shot !== "idle")).toEqual(
      shots
        .filter((shot) => shot !== "-" && shot !== "idle")
        .map(() => "close-up"),
    );

    await landmarksSettled(page);
    await page.waitForTimeout(300);
    const still = await draws(page);
    await page.waitForTimeout(1000);
    expect(await draws(page)).toBe(still);
  });
});
