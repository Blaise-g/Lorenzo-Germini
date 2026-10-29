import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
  type Group,
  type Object3D,
} from "three";

import type { PathStepSlug } from "@/data/path.types";

import { BEAT_NODE, parts } from "./piece-beats";
import type { Paint } from "./paint";
import { SOFT, TURN, type Play } from "./play";

/* The board's moments (v3): small surprises now and then on top of its
   ambient life — the duo's gestures, a flock crossing, a piece doing its
   thing unasked. One at a time, every 20 to 40 s at random while the board
   rests or dwells, never the same twice running and never over a cue's
   beat. They run on the board's living clock, so they freeze on Pause,
   stop after the end, and under reduced motion never come. Rare, so they
   may be a little more expressive than a click's answer; each is over in
   one to three seconds. */

export const MOMENT_EVERY_MS = { min: 20_000, max: 40_000 } as const;

export type MomentName =
  | "wave"
  | "spin"
  | "jab"
  | "birds"
  | "plume"
  | "chime"
  | "glint"
  | "tack";

/** What a moment can reach on the board. */
export type MomentStage = {
  figure: Object3D;
  buddy: Object3D;
  /** A piece's handle on `slug`'s tile, if it stands there. */
  piece(slug: PathStepSlug, id: string): Object3D | undefined;
  /** The current tile's centre, in the board's frame. */
  centre: Vector3;
};

/** The moments `slug`'s tile has: the duo's and the flock everywhere, and
 *  each tile's own where its piece stands. */
export function momentsFor(slug: PathStepSlug): MomentName[] {
  const all: MomentName[] = ["wave", "spin", "jab", "birds"];
  if (slug === "switzerland") all.push("plume", "tack");
  if (slug === "lille") all.push("chime");
  if (slug === "turin") all.push("glint");
  return all;
}

/** The next moment: any of `names` but `last`, by `random` in [0, 1). */
export function nextMoment(
  names: readonly MomentName[],
  last: MomentName | undefined,
  random: number,
): MomentName {
  const choices = names.filter((name) => name !== last);
  return choices[Math.floor(random * choices.length) % choices.length];
}

/** How long until the next moment, by `random` in [0, 1). */
export function momentWait(random: number): number {
  return (
    MOMENT_EVERY_MS.min + random * (MOMENT_EVERY_MS.max - MOMENT_EVERY_MS.min)
  );
}

const FLOCK = 7;
const FLOCK_MS = 2800;

export function createMoments(options: {
  board: Group;
  paint: Paint;
  play: Play;
  random?: () => number;
}) {
  const { board, paint, play } = options;
  const random = options.random ?? Math.random;
  let wait = momentWait(random());
  let last: MomentName | undefined;
  let flockMs = FLOCK_MS;

  /* ─── The flock ─── */

  /* A bird: a shallow V of two wings, its body at the origin, flying
     along +x. Flapping folds the wings up and down about the body. */
  const wing = new BufferGeometry();
  wing.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array([
        /* Left wing, then right, each a thin triangle swept back. */
        0.06, 0, 0, -0.05, 0, 0, -0.1, 0, -0.26, 0.06, 0, 0, -0.1, 0, 0.26,
        -0.05, 0, 0,
      ]),
      3,
    ),
  );
  wing.computeVertexNormals();
  const birdMaterial = paint.material({ base: "ink-cool", shade: 0.55 });
  birdMaterial.side = DoubleSide;
  const flock = new InstancedMesh(wing, birdMaterial, FLOCK);
  flock.visible = false;
  flock.frustumCulled = false;
  board.add(flock);
  const from = new Vector3();
  const to = new Vector3();
  const at = new Vector3();
  const scale = new Vector3();
  const turn = new Quaternion();
  const matrix = new Matrix4();
  const flapping = new Matrix4();
  const UP = new Vector3(0, 1, 0);
  /** Each bird's place in the V and its flap's phase. */
  const formation = Array.from({ length: FLOCK }, (_, i) => {
    const rank = Math.ceil(i / 2);
    const side = i % 2 === 0 ? 1 : -1;
    return {
      back: rank * 0.42,
      out: side * rank * 0.38,
      up: (i % 3) * 0.08,
      phase: i * 0.9,
    };
  });

  function startFlock(centre: Vector3) {
    /* Across the tile on a diagonal, high over it, from the board's left
       to its right as the camera sees it. */
    const lean = (random() - 0.5) * 3;
    from.set(centre.x - 8, centre.y + 1.8, centre.z + lean + 0.6);
    to.set(centre.x + 8, centre.y + 2.6, centre.z - lean - 0.6);
    flockMs = 0;
    poseFlock();
  }

  function poseFlock() {
    flock.visible = flockMs < FLOCK_MS;
    if (!flock.visible) return;
    const u = flockMs / FLOCK_MS;
    const heading = Math.atan2(-(to.z - from.z), to.x - from.x);
    for (let i = 0; i < FLOCK; i++) {
      const bird = formation[i];
      at.lerpVectors(from, to, u);
      at.x -= bird.back * Math.cos(heading);
      at.z += bird.back * Math.sin(heading);
      at.x += bird.out * Math.sin(heading);
      at.z += bird.out * Math.cos(heading);
      at.y += bird.up + Math.sin(u * 9 + bird.phase) * 0.06;
      const flap = Math.sin(flockMs / 70 + bird.phase);
      turn.setFromAxisAngle(UP, heading);
      scale.set(1.5, 1.5, 1.5 * (0.55 + 0.45 * Math.abs(flap)));
      matrix.compose(at, turn, scale);
      /* Wings up and down: a lean of the whole V about its body. */
      matrix.multiply(flapping.makeRotationX(flap * 0.5));
      flock.setMatrixAt(i, matrix);
    }
    flock.instanceMatrix.needsUpdate = true;
  }

  /* ─── Playing one ─── */

  function play1(name: MomentName, slug: PathStepSlug, stage: MomentStage) {
    const { gestures } = play;
    switch (name) {
      case "wave":
        gestures.wave(stage.figure, 1.2);
        return true;
      case "spin":
        gestures.spin(stage.buddy, 1);
        return true;
      case "jab":
        gestures.jab(stage.buddy, 1.2);
        return true;
      case "birds":
        startFlock(stage.centre);
        return true;
      case "plume": {
        const jet = stage.piece(slug, "jet-d-eau");
        const plumes = jet ? parts(jet, BEAT_NODE.plume) : [];
        for (const plume of plumes) play.kick(plume, "squash", 6, SOFT);
        return plumes.length > 0;
      }
      case "tack": {
        const boat = stage.piece(slug, "sailboat");
        if (!boat) return false;
        /* Comes about: turns onto the other tack, leaning into it, and
           back again. */
        play.retarget(boat, "turn", 0.9, TURN);
        play.kick(boat, "lean", -1.6, SOFT);
        play.after(1300, () => play.retarget(boat, "turn", -0.9, TURN));
        return true;
      }
      case "chime": {
        const clock = stage.piece(slug, "clock-face");
        const belfry = stage.piece(slug, "belfry");
        if (!clock && !belfry) return false;
        if (clock) {
          for (const hand of parts(clock, BEAT_NODE.hand)) {
            play.retarget(hand, "dial", -Math.PI * 2);
          }
        }
        if (belfry) play.shake(belfry, 0.3, 4, 110);
        return true;
      }
      case "glint": {
        const mole = stage.piece(slug, "mole");
        if (!mole) return false;
        play.kick(mole, "glint", 10, SOFT);
        play.kick(mole, "squash", 0.8, SOFT);
        return true;
      }
    }
  }

  return {
    /** Counts `ms` of quiet toward the next moment, and plays it when due.
     *  `quiet` is false while a beat plays or anything else is moving the
     *  board; the wait holds until it is. Returns the moment played. */
    tick(
      ms: number,
      quiet: boolean,
      slug: PathStepSlug | undefined,
      stage: MomentStage,
    ): MomentName | undefined {
      if (ms <= 0) return undefined;
      if (flockMs < FLOCK_MS) {
        flockMs = Math.min(flockMs + ms, FLOCK_MS);
        poseFlock();
      }
      if (!quiet || !slug) return undefined;
      wait -= ms;
      if (wait > 0) return undefined;
      wait = momentWait(random());
      const names = momentsFor(slug);
      for (let tries = 0; tries < names.length; tries++) {
        const name = nextMoment(names, last, random());
        if (play1(name, slug, stage)) {
          last = name;
          return name;
        }
      }
      return undefined;
    },
    /** Plays `name` now (for the clips, and a spec). */
    play(name: MomentName, slug: PathStepSlug, stage: MomentStage) {
      if (play1(name, slug, stage)) last = name;
    },
    active() {
      return flockMs < FLOCK_MS;
    },
    finish() {
      flockMs = FLOCK_MS;
      poseFlock();
    },
    dispose() {
      wing.dispose();
    },
  };
}

export type Moments = ReturnType<typeof createMoments>;
