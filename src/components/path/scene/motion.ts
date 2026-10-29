/* The board's motion, as pure functions of time: the pieces' rise, the
   pawn's hops along the loop and its landing. No three.js and no DOM here,
   so a spec checks the curves directly. The grammar is Emil Kowalski's:
   springs for things that settle, a strong ease-in-out for things already on
   screen moving somewhere, and nothing starting from nothing. */

/** A spring's settled fraction `t` ms after release, from 0 to 1, in Apple's
 *  terms: `duration` is how long it takes to look settled, and `bounce` how
 *  far past 1 it swings, kept subtle (0.1–0.3). Exactly 1 once `t` reaches
 *  `end`, so a skipped or finished motion lands on its end pose. */
export function spring(
  t: number,
  duration: number,
  bounce: number,
  end = Infinity,
): number {
  if (t <= 0) return 0;
  if (t >= end) return 1;
  const omega = (2 * Math.PI) / duration;
  const zeta = 1 - bounce;
  const damped = omega * Math.sqrt(1 - zeta * zeta);
  const decay = Math.exp(-zeta * omega * t);
  return (
    1 -
    decay *
      (Math.cos(damped * t) + ((zeta * omega) / damped) * Math.sin(damped * t))
  );
}

/** The strong ease-in-out the site's CSS uses for on-screen movement,
 *  `cubic-bezier(0.77, 0, 0.175, 1)`, close enough as a quintic. */
export function easeInOut(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);
  return x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2;
}

/* ─── The rise ─── */

/** A piece coming up out of its tile: squat and a touch narrow as it
 *  starts, never from nothing, then springing up to its full height with a
 *  small overshoot. */
export const RISE_FROM = { height: 0.18, width: 0.9, sink: 0.12 } as const;
/** The rise's spring: about 0.6 s to look settled, a small bounce past full
 *  height. */
const RISE_SPRING_MS = 600;
const RISE_BOUNCE = 0.22;

export type RisePose = {
  /** Whether it shows at all: not before its rise starts. */
  visible: boolean;
  /** Its scale across (x and z) and up (y), about its foot. */
  width: number;
  height: number;
  /** How far below its place it stands, in scene units. */
  sink: number;
};

/** A piece `progress` of the way through its rise window (0 to 1). */
export function risePose(progress: number, windowMs: number): RisePose {
  if (progress <= 0) {
    return {
      visible: false,
      width: RISE_FROM.width,
      height: RISE_FROM.height,
      sink: RISE_FROM.sink,
    };
  }
  if (progress >= 1) return { visible: true, width: 1, height: 1, sink: 0 };
  const settled = spring(progress * windowMs, RISE_SPRING_MS, RISE_BOUNCE);
  return {
    visible: true,
    width: RISE_FROM.width + (1 - RISE_FROM.width) * Math.min(settled, 1),
    height: RISE_FROM.height + (1 - RISE_FROM.height) * settled,
    sink: RISE_FROM.sink * Math.max(1 - settled, 0),
  };
}

/** A piece on a tile the tour has not reached: standing, so no tile is
 *  ever a bare plinth, but squat, as a toy not yet set up. Not sunk: a
 *  flat piece, a lake or a plateau, would sink out of sight. Its wake
 *  springs from here to full height. */
export const DORMANT = { height: 0.62, width: 0.94 } as const;

/** A piece waking from `DORMANT`, `progress` of the way through its rise
 *  window of `windowMs`: dormant at 0 and before, so the wake starts where
 *  the piece stood, with no jump; then the rise's spring to full height. */
export function wakePose(progress: number, windowMs: number): RisePose {
  if (progress >= 1) return { visible: true, width: 1, height: 1, sink: 0 };
  const settled =
    progress <= 0
      ? 0
      : spring(progress * windowMs, RISE_SPRING_MS, RISE_BOUNCE);
  return {
    visible: true,
    width: DORMANT.width + (1 - DORMANT.width) * Math.min(settled, 1),
    height: DORMANT.height + (1 - DORMANT.height) * settled,
    sink: 0,
  };
}

/* ─── The pawn ─── */

/** How many tiles the pawn moves to get from `from` to `to` on a loop of
 *  `count`, the short way round: negative is backwards along the loop. */
export function loopSteps(from: number, to: number, count: number): number {
  const forward = (((to - from) % count) + count) % count;
  return forward <= count / 2 ? forward : forward - count;
}

/** How the pawn gets to a tile: `travel` walks it, one hop per tile, as the
 *  tour advances; `skip` jumps it there in one long hop, for a step picked
 *  out of order (the benchmark's §4(a)). */
export type HopKind = "travel" | "skip";

/** One hop's horizontal ease: still at take-off and at touch-down, as a
 *  piece flicked from tile to tile is, fastest at the top of its arc. */
export function hopEase(u: number): number {
  const x = Math.min(Math.max(u, 0), 1);
  return x - Math.sin(2 * Math.PI * x) / (2 * Math.PI);
}

/** How high a skip's one long hop goes, in hops: higher the farther it
 *  jumps, up to a cap, so a jump across the board still reads as one arc. */
export function skipHopHeight(tiles: number): number {
  return Math.min(1 + 0.4 * (Math.abs(tiles) - 1), 2.2);
}

/** Where the pawn is `progress` of the way through a move of `steps` tiles:
 *  `along`, in tiles from its start (fractional between them), and `lift`,
 *  in hop heights, 0 on a tile. A travel hops once per tile; a skip once. */
export function movePose(
  kind: HopKind,
  steps: number,
  progress: number,
): { along: number; lift: number } {
  const tiles = Math.abs(steps);
  if (tiles === 0 || progress >= 1) return { along: steps, lift: 0 };
  const p = Math.max(progress, 0);
  if (kind === "skip") {
    return {
      along: steps * hopEase(p),
      lift: Math.sin(Math.PI * p) * skipHopHeight(tiles),
    };
  }
  const travelled = p * tiles;
  const hop = Math.min(Math.floor(travelled), tiles - 1);
  const within = travelled - hop;
  return {
    along: Math.sign(steps) * (hop + hopEase(within)),
    lift: Math.sin(Math.PI * within),
  };
}

/** The pawn's landing: a quick squash that springs back, as a turned
 *  wooden piece set down hard would seem to. 1 is its rest height. */
export const LANDING_MS = 350;

export function landingSquash(t: number): number {
  if (t <= 0 || t >= LANDING_MS) return 1;
  const settled = spring(t, 300, 0.2);
  return 1 - 0.2 * (1 - settled) * Math.min(t / 40, 1);
}

/* ─── The camera's easings (the benchmark's §4(a)) ─── */

/** For moves between two framings, both on screen. */
export function easeInOutCubic(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
}

/** For arriving: fast off the mark, decelerating hard into the shot. */
export function easeOutQuart(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);
  return 1 - (1 - x) ** 4;
}

/* ─── Life (v3; the benchmark's §4(d)) ─── */

/** The landing's thump: the tile under the pawn dips and springs back, as a
 *  board does under a piece set down hard. How far down it is `t` ms after
 *  touch-down, 0 to 1 of the dip, a little past 0 as it springs back. */
export function landingDip(t: number): number {
  if (t <= 0 || t >= LANDING_MS) return 0;
  const DOWN_MS = 55;
  if (t < DOWN_MS) return Math.sin(((t / DOWN_MS) * Math.PI) / 2);
  return 1 - spring(t - DOWN_MS, 280, 0.3);
}

/** The pawn at rest breathes: a slight squash, every `IDLE_EVERY_MS`, as a
 *  piece waiting for its turn. Its height at `t` ms of rest, 1 standing. */
export const IDLE_EVERY_MS = 3000;
export const IDLE_SQUASH = 0.016;
const IDLE_SQUASH_MS = 420;

export function idleSquash(t: number): number {
  if (t <= 0) return 1;
  const within = t % IDLE_EVERY_MS;
  /* The first squash waits a whole period after landing. */
  if (t < IDLE_EVERY_MS || within >= IDLE_SQUASH_MS) return 1;
  return 1 - IDLE_SQUASH * Math.sin((within / IDLE_SQUASH_MS) * Math.PI);
}

/** A beat's swell: up quickly, then easing back to rest by `duration`. 0 at
 *  both ends, about 1 at its height. */
export function bump(t: number, duration: number): number {
  if (t <= 0 || t >= duration) return 0;
  const u = t / duration;
  /* sin(πu)·e^(−2u) peaks near u = 0.36 at about 0.44; normalised to 1. */
  return (Math.sin(Math.PI * u) * Math.exp(-2 * u)) / 0.4436;
}

/** A light coming on for a beat: fast up, held, then back down by
 *  `duration`. 0 to 1. */
export function glowEnvelope(t: number, duration: number): number {
  if (t <= 0 || t >= duration) return 0;
  const attack = Math.min(t / 220, 1);
  const release = Math.min((duration - t) / (duration * 0.4), 1);
  return easeInOut(attack) * easeInOut(release);
}

/** A prop's hop as the pawn passes (the owner's clip): up and down once
 *  over `HOP_BEAT_MS`, with a squash as it leaves and as it lands. */
export const HOP_BEAT_MS = 600;

export function hopBeat(t: number): {
  lift: number;
  squash: number;
  tilt: number;
} {
  if (t <= 0 || t >= HOP_BEAT_MS) return { lift: 0, squash: 1, tilt: 0 };
  const u = t / HOP_BEAT_MS;
  /* The leap takes the middle of the beat; a crouch before and a squash
     after. */
  const air = Math.min(Math.max((u - 0.12) / 0.66, 0), 1);
  const crouch = u < 0.12 ? Math.sin((u / 0.12) * Math.PI) : 0;
  const land = u > 0.78 ? Math.sin(((u - 0.78) / 0.22) * Math.PI) : 0;
  return {
    lift: 4 * air * (1 - air),
    squash: 1 - 0.12 * crouch - 0.1 * land,
    /* A quarter-flip's lean, back to upright as it lands. */
    tilt: Math.sin(air * Math.PI * 2) * 0.22,
  };
}

/** A landmark rising out of its tile (igloo's materialise; §4(d)): it comes
 *  up from below the tile's top on a spring, about 0.6 s to look settled,
 *  rather than unfolding in place. How far below its place it still is, as
 *  a share of its own height, `progress` of the way through its rise window
 *  of `windowMs`; a small dip past 0 is its overshoot. */
export function landmarkSink(progress: number, windowMs: number): number {
  if (progress <= 0) return 1;
  if (progress >= 1) return 0;
  return 1 - spring(progress * windowMs, 600, 0.18);
}

/** How far a landmark on a dormant tile stands sunk into it, as a share
 *  of its height: low enough to read as not yet played, high enough that
 *  its silhouette reads from the whole-board shot. */
export const DORMANT_LANDMARK_SINK = 0.32;

/** A landmark waking from `DORMANT_LANDMARK_SINK`: how far below its place
 *  it still is, as `landmarkSink` gives it, from where it stood dormant. */
export function landmarkWake(progress: number, windowMs: number): number {
  return DORMANT_LANDMARK_SINK * landmarkSink(progress, windowMs);
}

/** How long the tile's ground takes to grow out from a landmark's foot. */
export const REVEAL_MS = 1200;
