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

/* ─── The pawn ─── */

/** How many tiles the pawn moves to get from `from` to `to` on a loop of
 *  `count`, the short way round: negative is backwards along the loop. */
export function loopSteps(from: number, to: number, count: number): number {
  const forward = (((to - from) % count) + count) % count;
  return forward <= count / 2 ? forward : forward - count;
}

/** One hop to the next tile, and each further tile adds a shorter one: a
 *  jump across the board still lands inside about 1.2 s. */
const HOP_MS = 560;
const EXTRA_HOP_MS = 180;
export const MAX_MOVE_MS = 1150;

export function moveDuration(steps: number): number {
  const tiles = Math.abs(steps);
  if (tiles === 0) return 0;
  return Math.min(HOP_MS + EXTRA_HOP_MS * (tiles - 1), MAX_MOVE_MS);
}

/** Where the pawn is `progress` of the way through a move of `steps` tiles:
 *  `along`, in tiles from its start (fractional between them), and `lift`,
 *  0 on a tile and 1 at the top of a hop. One hop per tile passed. */
export function movePose(
  steps: number,
  progress: number,
): { along: number; lift: number } {
  const tiles = Math.abs(steps);
  if (tiles === 0 || progress >= 1) return { along: steps, lift: 0 };
  const travelled = easeInOut(progress) * tiles;
  const within = travelled - Math.floor(travelled);
  return {
    along: Math.sign(steps) * travelled,
    lift: Math.sin(Math.PI * within),
  };
}

/** The pawn's landing: a quick squash that springs back, as a turned
 *  wooden piece set down hard would seem to. 1 is its rest height. */
export const LANDING_MS = 320;

export function landingSquash(t: number): number {
  if (t <= 0 || t >= LANDING_MS) return 1;
  const settled = spring(t, 260, 0.3);
  return 1 - 0.14 * (1 - settled) * Math.min(t / 40, 1);
}
