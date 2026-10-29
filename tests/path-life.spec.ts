/* The board's life on `/path` (v3; the benchmark's §4(d)): the curves its
   ambient motion and arrivals move on, the one table of the narration's
   beats against the narration itself, the landmarks' ink grade, and then
   the beats firing on the real board as the cues play, with the voice off,
   and the board coming to rest under reduced motion and on Pause. */

import { expect, test, type Page } from "@playwright/test";
import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  type PlaneGeometry,
  Vector3,
  ShaderChunk,
} from "three";

import { pieceOf } from "@/components/path/scene/board";
import {
  BEATS,
  beatFor,
  cueTurn,
  HOPPERS,
} from "@/components/path/scene/beats";
import {
  gradeAlbedo,
  INK_GRADE,
  inkGrade,
} from "@/components/path/scene/grade";
import {
  bump,
  glowEnvelope,
  HOP_BEAT_MS,
  hopBeat,
  IDLE_EVERY_MS,
  IDLE_SQUASH,
  idleSquash,
  landingDip,
  LANDING_MS,
  landmarkSink,
  landmarkWake,
  DORMANT,
  DORMANT_LANDMARK_SINK,
  risePose,
  wakePose,
} from "@/components/path/scene/motion";
import {
  CONFETTI,
  flakeAt,
  flakes,
  flakeSize,
} from "@/components/path/scene/confetti";
import { createLife, type LifePiece } from "@/components/path/scene/life";
import { inject, SUN_ANCHOR, VIEW_ANCHOR } from "@/components/path/scene/paint";
import {
  createMoments,
  type MomentName,
  type MomentStage,
  momentsFor,
  momentWait,
  nextMoment,
} from "@/components/path/scene/moments";
import type { Paint } from "@/components/path/scene/paint";
import type { Palette } from "@/components/path/scene/palette";
import {
  createPlay,
  type Play,
  type Reactor,
} from "@/components/path/scene/play";
import { grassCount, PHONE_GRASS_SHARE } from "@/components/path/scene/world";
import { PATH_STEPS } from "@/data/path";
import { PATH_NARRATION } from "@/data/path-narration";
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

const SLUGS = PATH_STEPS.map((step) => step.slug as PathStepSlug);

test.describe("the curves", () => {
  test("the landing dips the tile at once and springs it back in time", () => {
    expect(landingDip(0)).toBe(0);
    expect(landingDip(55)).toBeCloseTo(1, 5);
    /* Down within a frame or two, not eased in. */
    expect(landingDip(20)).toBeGreaterThan(0.5);
    /* Springs past its rest and is back by the landing's end. */
    const after = Array.from({ length: 30 }, (_, i) => landingDip(60 + i * 10));
    expect(Math.min(...after)).toBeLessThan(0);
    expect(Math.abs(landingDip(LANDING_MS - 1))).toBeLessThan(0.1);
    expect(landingDip(LANDING_MS)).toBe(0);
  });

  test("the idle pawn squashes slightly, once every 3 s, from 3 s on", () => {
    expect(IDLE_EVERY_MS).toBe(3000);
    for (let t = 0; t < IDLE_EVERY_MS; t += 50) expect(idleSquash(t)).toBe(1);
    const squashes = (from: number) =>
      Math.min(
        ...Array.from({ length: 60 }, (_, i) => idleSquash(from + i * 10)),
      );
    for (const period of [1, 2, 5]) {
      const deepest = squashes(period * IDLE_EVERY_MS);
      expect(deepest).toBeCloseTo(1 - IDLE_SQUASH, 3);
      /* Slight: under 2% of its height. */
      expect(1 - deepest).toBeLessThan(0.02);
      /* And still between squashes. */
      expect(idleSquash(period * IDLE_EVERY_MS + 1500)).toBe(1);
    }
  });

  test("a beat swells and lights back to rest at its end", () => {
    for (const duration of [900, 1400, 2600]) {
      const swell = Array.from({ length: 99 }, (_, i) =>
        bump(((i + 1) / 100) * duration, duration),
      );
      expect(Math.max(...swell)).toBeGreaterThan(0.95);
      expect(Math.max(...swell)).toBeLessThan(1.05);
      expect(bump(duration, duration)).toBe(0);
      expect(glowEnvelope(duration / 2, duration)).toBeCloseTo(1, 5);
      expect(glowEnvelope(duration, duration)).toBe(0);
      expect(glowEnvelope(0, duration)).toBe(0);
    }
  });

  test("a passing hop leaves the ground and lands upright", () => {
    const mid = hopBeat(HOP_BEAT_MS * 0.45);
    expect(mid.lift).toBeGreaterThan(0.9);
    expect(hopBeat(HOP_BEAT_MS)).toEqual({ lift: 0, squash: 1, tilt: 0 });
    expect(hopBeat(HOP_BEAT_MS - 1).lift).toBeLessThan(0.01);
    expect(Math.abs(hopBeat(HOP_BEAT_MS - 1).tilt)).toBeLessThan(0.01);
  });

  test("a landmark rises from below its tile on a spring", () => {
    expect(landmarkSink(0, 1400)).toBe(1);
    expect(landmarkSink(1, 1400)).toBe(0);
    /* Well under way by 0.3 s, and overshooting a little as it settles. */
    expect(landmarkSink(300 / 1400, 1400)).toBeLessThan(0.5);
    const overshoot = Math.min(
      ...Array.from({ length: 100 }, (_, i) => landmarkSink(i / 100, 1400)),
    );
    expect(overshoot).toBeLessThan(0);
    expect(overshoot).toBeGreaterThan(-0.2);
  });

  /* v3-emil-polish: a tile not yet reached stands dormant, squat and its
     landmark sunk part-way, and wakes from there on the pawn's arrival:
     the wake starts where the dormant pose is, so nothing jumps, and ends
     where a fresh rise would. */
  test("a dormant piece wakes from its dormant pose without a jump", () => {
    const rest = wakePose(0, 1200);
    expect(rest).toEqual({
      visible: true,
      width: DORMANT.width,
      height: DORMANT.height,
      sink: 0,
    });
    const first = wakePose(16 / 1200, 1200);
    expect(Math.abs(first.height - rest.height)).toBeLessThan(0.05);
    expect(Math.abs(first.width - rest.width)).toBeLessThan(0.02);
    expect(wakePose(1, 1200)).toEqual(risePose(1, 1200));
    /* It never sinks below its dormant height on the way up. */
    for (let i = 0; i <= 100; i++) {
      expect(wakePose(i / 100, 1200).height).toBeGreaterThanOrEqual(
        DORMANT.height,
      );
    }
    expect(landmarkWake(0, 1400)).toBe(DORMANT_LANDMARK_SINK);
    expect(landmarkWake(1, 1400)).toBe(0);
    expect(
      Math.abs(landmarkWake(16 / 1400, 1400) - DORMANT_LANDMARK_SINK),
    ).toBeLessThan(0.03);
    /* Visible while dormant: a sunk landmark still stands above its tile. */
    expect(DORMANT_LANDMARK_SINK).toBeLessThan(0.5);
  });

  /* The tour's end: paper thrown up that falls slowly and is gone. */
  test("the confetti goes up, drifts down, and is gone at its end", () => {
    const all = flakes(CONFETTI.perInk, 11);
    expect(flakes(CONFETTI.perInk, 11)).toEqual(all);
    const at = new Vector3();
    for (const flake of all) {
      expect(flakeAt(flake, 0, at).length()).toBe(0);
      const peak = Math.max(
        ...Array.from(
          { length: 40 },
          (_, i) => flakeAt(flake, (i / 40) * CONFETTI.ms, at).y,
        ),
      );
      expect(peak).toBeGreaterThan(0.6);
      /* Falling by its end, and slowly: paper, not stone. */
      const late = flakeAt(flake, CONFETTI.ms - 100, at).y;
      const later = flakeAt(flake, CONFETTI.ms, at).y;
      expect(later).toBeLessThan(late);
      expect((late - later) / 0.1).toBeLessThan(2.5);
    }
    expect(flakeSize(0)).toBe(1);
    expect(flakeSize(CONFETTI.ms * (1 - CONFETTI.fade) - 1)).toBe(1);
    expect(flakeSize(CONFETTI.ms)).toBe(0);
    expect(CONFETTI.ms).toBeLessThan(4000);
  });

  test("phones grow half the grass", () => {
    expect(PHONE_GRASS_SHARE).toBe(0.5);
    expect(grassCount(200, PHONE_GRASS_SHARE)).toBe(100);
    expect(grassCount(46, PHONE_GRASS_SHARE)).toBe(23);
    expect(grassCount(200, 1)).toBe(200);
  });
});

test.describe("the beats table", () => {
  /* Every prop a cue names has a beat, but the Bisalta, which §4(d) gives
     none; the table names nothing the narration does not. */
  test("maps every cue's prop to a piece on its tile", () => {
    const named = new Set<string>();
    for (const slug of SLUGS) {
      for (const cue of PATH_NARRATION[slug]) {
        if (!cue.prop) {
          expect(beatFor(slug, null)).toBeUndefined();
          continue;
        }
        named.add(`${slug}:${cue.prop}`);
        const beat = beatFor(slug, cue.prop);
        if (cue.prop === "bisalta") {
          expect(beat).toBeUndefined();
          continue;
        }
        expect(beat, `${slug}:${cue.prop}`).toBeDefined();
        /* Throws if the tile has no such piece. */
        expect(pieceOf(slug, beat!.piece).prop).toBe(cue.prop);
      }
    }
    expect(Object.keys(BEATS).sort()).toEqual(
      [...named].filter((key) => !key.endsWith(":bisalta")).sort(),
    );
  });

  test("beats are small and quick", () => {
    for (const beat of Object.values(BEATS)) {
      expect(beat.ms).toBeGreaterThanOrEqual(600);
      expect(beat.ms).toBeLessThanOrEqual(3000);
    }
  });

  test("a story told over several cues knows its first and last", () => {
    const cues = PATH_NARRATION["cuneo-2022"];
    const windows = cues
      .map((cue, index) => (cue.prop === "mvp-window" ? index : -1))
      .filter((index) => index >= 0);
    expect(windows.length).toBeGreaterThan(1);
    expect(cueTurn(cues, windows[0])).toEqual({ nth: 0, last: false });
    expect(cueTurn(cues, windows.at(-1)!)).toEqual({
      nth: windows.length - 1,
      last: true,
    });
  });

  test("only small props and trees hop, never a landmark", () => {
    for (const piece of HOPPERS) {
      expect([
        "mole",
        "belfry",
        "school",
        "schoolroom",
        "office",
      ]).not.toContain(piece);
    }
  });
});

test.describe("the ink grade", () => {
  /* A stand-in for the tokens, which only a page can read: a cream stock,
     a terracotta and a slate. */
  const palette: Palette = {
    paper: new Color(0.86, 0.8, 0.68),
    "ink-warm": new Color(0.55, 0.2, 0.12),
    "ink-cool": new Color(0.12, 0.2, 0.3),
    "ink-sun": new Color(0.8, 0.55, 0.15),
    felt: new Color(0.2, 0.3, 0.2),
    fog: new Color(0.8, 0.8, 0.8),
  };

  /* Pulled a little toward the ramp by day, 8%, so the toys keep their own
     colours: with no lift, the distance to the ramp's colour shrinks by
     exactly the amount. */
  test("pulls a model's albedo a little toward the path palette", () => {
    expect(INK_GRADE.day.amount).toBeCloseTo(0.08, 2);
    expect(INK_GRADE.night.amount).toBeLessThan(0.15);
    const grade = { ...inkGrade(palette, 0), lift: 0 };
    const albedo = new Color(0.6, 0.3, 0.2);
    const ramp = gradeAlbedo(albedo, { ...grade, amount: 1 });
    const graded = gradeAlbedo(albedo, grade);
    const before = Math.hypot(
      albedo.r - ramp.r,
      albedo.g - ramp.g,
      albedo.b - ramp.b,
    );
    const after = Math.hypot(
      graded.r - ramp.r,
      graded.g - ramp.g,
      graded.b - ramp.b,
    );
    expect(after / before).toBeCloseTo(1 - grade.amount, 5);
  });

  test("lifts the shadows, more by night", () => {
    const black = new Color(0, 0, 0);
    const lum = (c: Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    const day = gradeAlbedo(black, inkGrade(palette, 0));
    const night = gradeAlbedo(black, inkGrade(palette, 1));
    expect(lum(day)).toBeGreaterThan(0.01);
    expect(INK_GRADE.night.lift).toBeGreaterThan(INK_GRADE.day.lift);
    /* A white stays near the stock. */
    const white = gradeAlbedo(new Color(1, 1, 1), inkGrade(palette, 0));
    expect(lum(white)).toBeGreaterThan(0.7);
    expect(lum(night)).toBeGreaterThan(0);
  });

  /* The shader patches anchor on three's own chunks: an upgrade that
     renames one should fail here, not draw a board with no clouds. */
  test("its anchors are in three's shader chunks", () => {
    expect(ShaderChunk.lights_fragment_begin).toContain(SUN_ANCHOR);
    expect(ShaderChunk.project_vertex).toContain(VIEW_ANCHOR);
    expect(() => inject("void main() {}", SUN_ANCHOR, "x")).toThrow();
  });
});

/* ─── On the board ─── */

const stage = (page: Page) => page.locator("[data-path-stage]");
const playTab = (page: Page) => page.locator("[data-path-tour-play]");

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

/** Waits for every landmark the index lists to have arrived, or failed:
 *  each that lands on a tile in view draws its arrival (v3-harden loads
 *  them once the page is idle). A state, waited on for as long as the
 *  test may run. */
async function landmarksSettled(page: Page) {
  await expect(page.locator("[data-path-stage] canvas")).toHaveAttribute(
    "data-path-landmarks",
    "settled",
    { timeout: 0 },
  );
}

const draws = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __draws: { draws: number } }).__draws.draws,
  );

/** Every beat the stage reports from now on. */
async function watchBeats(page: Page) {
  await page.addInitScript(() => {
    const log: string[] = [];
    (window as unknown as { __beats: string[] }).__beats = log;
    new MutationObserver(() => {
      const beat = document
        .querySelector("[data-path-stage]")
        ?.getAttribute("data-scene-beat");
      if (beat && log.at(-1) !== beat) log.push(beat);
    }).observe(document, {
      subtree: true,
      attributes: true,
      childList: true,
      attributeFilter: ["data-scene-beat"],
    });
  });
}

const beats = (page: Page) =>
  page.evaluate(() => (window as unknown as { __beats: string[] }).__beats);

test.describe("the beats on the board", () => {
  /* The voice is off, so the cues run on the captions' timings; each cue
     about a prop with a beat plays it, in the narration's order. */
  test("play as the captions reach their props, with the voice off", async ({
    page,
  }) => {
    test.slow();
    await watchBeats(page);
    await page.goto("/path#lille");
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "webgl", {
      timeout: 15_000,
    });
    await expect(page.locator("[data-path-voice-switch]")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    /* Reduced motion, the suite's default, waits for Play. */
    await playTab(page).click();
    const expected = PATH_NARRATION.lille
      .filter((cue) => cue.prop && beatFor("lille", cue.prop))
      .map((cue) => cue.prop!);
    await expect
      .poll(async () => (await beats(page)).length, { timeout: 60_000 })
      .toBeGreaterThanOrEqual(expected.length);
    const log = await beats(page);
    expect(log.map((beat) => beat.split(":")[1])).toEqual(expected);
    expect(log.every((beat) => beat.startsWith("lille:"))).toBe(true);
    /* The belfry's two cues are its first and second turn. */
    expect(log).toContain("lille:belfry:0");
    expect(log).toContain("lille:belfry:1");
  });

  /* Reduced motion (the suite's default): the beats still mark their cues,
     shown at their end state, and nothing ambient keeps the board drawing
     while the tour plays. */
  test("under reduced motion, a playing board still comes to rest", async ({
    page,
  }) => {
    /* Counted as frames that drew, and cues that started: a beat draws its
       end state once as its cue starts, which on a loaded machine can fall
       anywhere in the window, while anything ambient draws every frame. */
    await page.addInitScript(() => {
      const counts = { frames: 0, cues: 0 };
      (window as unknown as { __rest: typeof counts }).__rest = counts;
      let frame = 0;
      let drawn = -1;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) =>
        raf((time) => {
          frame += 1;
          callback(time);
        });
      const proto = WebGL2RenderingContext.prototype;
      for (const name of ["drawElements", "drawArrays"] as const) {
        const original = proto[name] as (...args: unknown[]) => void;
        (proto as unknown as Record<string, unknown>)[name] = function (
          this: WebGL2RenderingContext,
          ...args: unknown[]
        ) {
          if (drawn !== frame) {
            drawn = frame;
            counts.frames += 1;
          }
          return original.apply(this, args);
        };
      }
      new MutationObserver(() => (counts.cues += 1)).observe(document, {
        subtree: true,
        attributes: true,
        attributeFilter: ["data-path-cue"],
      });
    });
    const rest = () =>
      page.evaluate(
        () =>
          (window as unknown as { __rest: { frames: number; cues: number } })
            .__rest,
      );
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-stage-settled", "", {
      timeout: 15_000,
    });
    /* Reduced motion waits for Play. */
    await playTab(page).click();
    await expect(page.locator("[data-path-tour]")).toHaveAttribute(
      "data-path-tour",
      "playing",
    );
    /* Each landmark that lands in view draws its arrival once. */
    await landmarksSettled(page);
    const before = await rest();
    await page.waitForTimeout(1500);
    const after = await rest();
    /* At most one frame per cue begun, and one for a draw already asked
       for; a board kept drawing would run to dozens. */
    expect(after.frames - before.frames).toBeLessThanOrEqual(
      after.cues - before.cues + 1,
    );
  });
});

test.describe("with motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  /* §4(d): the board lives while the tour plays, and is still on Pause
     (WCAG 2.2.2's pause). */
  test("the board keeps drawing while it plays, and stops on Pause", async ({
    page,
  }) => {
    await countDraws(page);
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-stage-settled", "", {
      timeout: 15_000,
    });
    const before = await draws(page);
    await page.waitForTimeout(1000);
    expect(await draws(page)).toBeGreaterThan(before);

    await playTab(page).click();
    await expect(page.locator("[data-path-tour]")).toHaveAttribute(
      "data-path-tour",
      "paused",
    );
    await page.waitForTimeout(300);
    const frozen = await draws(page);
    await page.waitForTimeout(1500);
    expect(await draws(page)).toBe(frozen);
  });

  /* v3-emil-polish (R10): a board scrolled out of view draws nothing, as a
     hidden tab does, and draws again when it comes back. */
  test("the board stops drawing while scrolled out of view", async ({
    page,
  }) => {
    await countDraws(page);
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-stage-settled", "", {
      timeout: 15_000,
    });
    await page.evaluate(() => {
      document.body.style.paddingBottom = "4000px";
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(300);
    const away = await draws(page);
    await page.waitForTimeout(1500);
    expect(await draws(page)).toBe(away);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => draws(page)).toBeGreaterThan(away);
  });

  /* Out of view, the step the tour waits on still builds and settles,
     undrawn, so the tour does not stall on it; then the board stops. */
  test("a step started out of view still builds, without drawing", async ({
    page,
  }) => {
    await countDraws(page);
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-scene-step", "home");
    await page.evaluate(() => {
      document.body.style.paddingBottom = "4000px";
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(300);
    const away = await draws(page);
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 15_000,
    });
    await expect(stage(page)).toHaveAttribute("data-stage-settled", "");
    expect(await draws(page)).toBe(away);
  });

  /* The "?" tile's lid lifts over a few frames as its piece wakes, not in
     one; and a tile built again keeps it off. */
  test("the lid lifts over frames, and stays off when the tile is built again", async ({
    page,
  }) => {
    await page.goto("/path#next");
    await page.evaluate(() => {
      const seen: (number | null)[] = [];
      (window as unknown as { lids: typeof seen }).lids = seen;
      const sample = () => {
        seen.push(window.__pathScene?.lid() ?? null);
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const lids = () =>
      page.evaluate(
        () => (window as unknown as { lids: (number | null)[] }).lids,
      );
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 20_000,
    });
    const first = (await lids()).filter((lid) => lid !== null);
    expect(first).toContain(0);
    expect(first.at(-1)).toBe(1);
    const lifting = first.filter((lid) => lid > 0.02 && lid < 0.98);
    expect(lifting.length).toBeGreaterThanOrEqual(3);

    await page.evaluate(() => {
      window.location.hash = "home";
    });
    await expect(stage(page)).toHaveAttribute("data-scene-step", "home");
    await page.evaluate(() => {
      (window as unknown as { lids: unknown[] }).lids.length = 0;
      window.location.hash = "next";
    });
    await expect(stage(page)).toHaveAttribute("data-scene-step", "next");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 20_000,
    });
    const again = (await lids()).filter((lid) => lid !== null);
    expect(again.length).toBeGreaterThan(0);
    expect(Math.min(...again)).toBe(1);
  });
});

/* ─── Play: a click's answer, the duo's gestures, the moments ─── */

test.describe("play", () => {
  /* A stand-in for the board's paint: play reads its lamp colour and lends
     glow through it. */
  const paint = {
    lampColour: { value: new Color(1, 0.8, 0.5) },
    boost() {},
    material: () => new MeshStandardMaterial(),
  } as unknown as Paint;

  function reactor(piece: string) {
    const handle = new Group();
    handle.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial()));
    const root = new Group();
    root.add(handle);
    return { piece, handle, root } satisfies Reactor;
  }

  /** Runs `play` for `ms`, a frame at a time, recording `read` each frame. */
  function run(play: Play, ms: number, read: () => number) {
    const seen: number[] = [];
    for (let t = 0; t < ms; t += 16) {
      play.tick(16);
      seen.push(read());
    }
    return seen;
  }

  test("the figure waves: it leans both ways, then stands upright", () => {
    const play = createPlay({ paint, board: new Group() });
    const figure = reactor("figure");
    expect(play.react(figure, false)).toBe("wave");
    const leans = run(play, 2000, () => figure.handle.rotation.z);
    expect(Math.max(...leans)).toBeGreaterThan(0.08);
    expect(Math.min(...leans)).toBeLessThan(-0.04);
    /* Quick: over within a second and a half. */
    expect(Math.abs(leans[Math.round(1500 / 16)])).toBeLessThan(0.01);
    expect(figure.handle.rotation.z).toBe(0);
    expect(play.active()).toBe(false);
  });

  test("the buddy spins once round and lands facing front, then jabs", () => {
    const play = createPlay({ paint, board: new Group() });
    const buddy = reactor("buddy");
    expect(play.react(buddy, false)).toBe("spin");
    const turns = run(play, 2500, () => buddy.handle.rotation.y);
    expect(Math.max(...turns)).toBeGreaterThan(Math.PI * 1.8);
    expect(buddy.handle.rotation.y).toBe(0);
    expect(play.react(buddy, false)).toBe("jab");
    const reach = run(play, 1500, () => buddy.handle.position.x);
    expect(Math.max(...reach)).toBeGreaterThan(0.05);
    expect(buddy.handle.position.x).toBe(0);
  });

  /* A second click mid-motion adds to the first rather than restarting
     it: no jump back to rest, and a little more. */
  test("a quick second click retargets mid-motion, a little harder", () => {
    const once = createPlay({ paint, board: new Group() });
    const twice = createPlay({ paint, board: new Group() });
    const [a, b] = [reactor("mole"), reactor("mole")];
    once.react(a, false);
    twice.react(b, false);
    run(once, 64, () => 0);
    run(twice, 64, () => 0);
    const before = b.handle.scale.y;
    twice.react(b, false);
    twice.tick(1);
    /* Continuous: the second click starts from where the first had got. */
    expect(Math.abs(b.handle.scale.y - before)).toBeLessThan(0.01);
    const peak = (play: Play, r: Reactor) =>
      Math.max(...run(play, 900, () => Math.abs(r.handle.position.y)));
    expect(peak(twice, b)).toBeGreaterThan(peak(once, a));
  });

  /* The springs' clock stops once they rest, as frames do on a paused
     board: a second click long after the first is a first click again. */
  test("a click long after the last is not a repeat, though nothing ticked", async () => {
    const play = createPlay({ paint, board: new Group() });
    const mole = reactor("mole");
    const peak = () =>
      Math.max(...run(play, 900, () => Math.abs(mole.handle.position.y)));
    play.react(mole, false);
    const first = peak();
    for (let t = 0; play.active() && t < 5000; t += 16) play.tick(16);
    expect(play.active()).toBe(false);
    await new Promise((done) => setTimeout(done, 1600));
    play.react(mole, false);
    expect(peak()).toBeCloseTo(first, 4);
  });

  /* A spring at rest returns to its rest pose, so a moment that turns a
     piece must bring it back while it still moves, never by a jump. */
  test("the boat tacks over and back without a jump", () => {
    const board = new Group();
    const play = createPlay({ paint, board });
    const moments = createMoments({ board, paint, play });
    const boat = new Group();
    const stage: MomentStage = {
      figure: new Group(),
      buddy: new Group(),
      piece: (_, id) => (id === "sailboat" ? boat : undefined),
      centre: new Vector3(),
    };
    moments.play("tack", "switzerland", () => stage);
    let previous = 0;
    let widest = 0;
    let jump = 0;
    for (let t = 0; t < 4000; t += 16) {
      play.tick(16);
      const heading = boat.rotation.y;
      jump = Math.max(jump, Math.abs(heading - previous));
      widest = Math.max(widest, Math.abs(heading));
      previous = heading;
    }
    expect(widest).toBeGreaterThan(0.4);
    expect(jump).toBeLessThan(0.1);
    expect(boat.rotation.y).toBe(0);
    expect(play.active()).toBe(false);
  });

  test("under reduced motion, a click lights the piece and moves nothing", () => {
    const board = new Group();
    const play = createPlay({ paint, board });
    const mole = reactor("mole");
    board.add(mole.root);
    expect(play.react(mole, true)).toBe("highlight");
    const halo = board.children.find(
      (node) =>
        node instanceof Mesh && node.material instanceof MeshBasicMaterial,
    ) as Mesh<PlaneGeometry, MeshBasicMaterial>;
    const levels = run(play, 1200, () => halo.material.opacity);
    expect(Math.max(...levels)).toBeGreaterThan(0.2);
    expect(levels.at(-1)).toBe(0);
    expect(mole.handle.position.y).toBe(0);
    expect(mole.handle.scale.y).toBe(1);
    expect(mole.handle.rotation.z).toBe(0);
  });

  test("moments come every 20 to 40 s, never the same twice running", () => {
    expect(momentWait(0)).toBe(20_000);
    expect(momentWait(0.999)).toBeLessThan(40_000);
    const names = momentsFor("switzerland");
    expect(names).toEqual(expect.arrayContaining(["wave", "spin", "jab"]));
    let last: MomentName | undefined;
    for (let i = 0; i < 200; i++) {
      const next = nextMoment(names, last, Math.random());
      expect(next).not.toBe(last);
      expect(names).toContain(next);
      last = next;
    }
  });
});

/* A click on a piece of the shown step's tile, or on the marker, plays its
   answer and leaves the step where it is; a click on another step's tile
   still goes there (`path-scene.spec.ts`, "picking on the board"). */
test.describe("clicking the board's pieces", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("answers on the shown tile, and does not change the step", async ({
    page,
  }) => {
    await page.goto("/path#switzerland");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 20_000,
    });
    /* Paused, so the tour does not move on while the test clicks: the
       answers run anyway. */
    await playTab(page).click();
    const canvas = stage(page).locator("canvas");
    const box = (await canvas.boundingBox())!;
    const history = await page.evaluate(() => window.history.length);
    let count = 0;
    for (const piece of ["buddy", "figure", "roche-dial"]) {
      const at = await page.evaluate(
        (each) => window.__pathScene!.locate(each),
        piece,
      );
      expect(at, piece).not.toBeNull();
      await page.mouse.move(box.x + at!.x, box.y + at!.y);
      await expect(canvas).toHaveAttribute("data-path-pointing", "piece");
      await page.mouse.click(box.x + at!.x, box.y + at!.y);
      count += 1;
      await expect(stage(page)).toHaveAttribute(
        "data-scene-reaction",
        new RegExp(`^${piece}:\\w+:${count}$`),
      );
      await expect(page).toHaveURL(/#switzerland$/);
      await expect(stage(page)).toHaveAttribute(
        "data-scene-step",
        "switzerland",
      );
    }
    expect(await page.evaluate(() => window.history.length)).toBe(history);
    await expect(page.locator("[data-path-tour]")).toHaveAttribute(
      "data-path-tour",
      "paused",
    );
  });
});

/* ─── A beat's end state across a model swap ─── */

test.describe("a beat's end state", () => {
  /** The MVP window as a generated model: glass lit through its grade. */
  function windowPiece(): LifePiece & { lit: () => { value: number }[] } {
    const beater = new Group();
    const glass = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial(),
    );
    glass.name = "glass";
    const inkLit = { value: 0 };
    (glass.material as MeshStandardMaterial).userData.inkLit = inkLit;
    beater.add(glass);
    return {
      slug: "cuneo-2022",
      piece: "mvp-window",
      beater,
      lit: () => [inkLit],
      shown: () => true,
    };
  }
  const glassLit = (piece: LifePiece) =>
    ((piece.beater.children[0] as Mesh).material as MeshStandardMaterial)
      .userData.inkLit.value as number;

  /* Under reduced motion a beat shows its end state at once. The model
     swapping in after it (the stand-in replaced by the generated GLB) used
     to come up at rest, losing what the caption had just said. */
  test("under reduced motion, survives the piece being swapped", () => {
    const life = createLife({
      board: new Group(),
      camera: new PerspectiveCamera(),
      paint: {
        material: () => new MeshStandardMaterial(),
        boost() {},
        setWater() {},
      } as unknown as Paint,
      emit() {},
    });
    const before = windowPiece();
    life.setTile("cuneo-2022", [before]);
    const beat = life.cue(
      "cuneo-2022",
      "mvp-window",
      { nth: 0, last: false },
      true,
    );
    expect(beat?.piece).toBe("mvp-window");
    const lit = glassLit(before);
    expect(lit).toBeGreaterThan(0);

    const after = windowPiece();
    life.setTile("cuneo-2022", [after]);
    expect(glassLit(after)).toBe(lit);

    /* Resting the tile, as it builds again, clears it for good. */
    life.restTile("cuneo-2022");
    const again = windowPiece();
    life.setTile("cuneo-2022", [again]);
    expect(glassLit(again)).toBe(0);
  });
});
