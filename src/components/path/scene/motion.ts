/* The board's motion, as pure functions of time: the cards' fold, the
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

/* ─── The fold ─── */

/** A card lying back on its tile, nearly flat: it never starts from flat
 *  zero, as a pop-up's card never lies perfectly flat in its fold. */
export const FOLD_FROM = -Math.PI / 2 + 0.16;
/** The fold's spring: about half a second to look settled, a small bounce
 *  past upright. */
const FOLD_SPRING_MS = 520;
const FOLD_BOUNCE = 0.22;
/** How much of the fold a card takes to fade in over, dithered. */
const FOLD_FADE = 0.14;

export type FoldPose = {
  /** Rotation about the hinge: `FOLD_FROM` lying back, 0 upright. */
  angle: number;
  /** 0 hidden, 1 solid. */
  opacity: number;
  /** A touch under full size as it starts, never 0. */
  scale: number;
};

/** A card `progress` of the way through its fold window (0 to 1). */
export function foldPose(progress: number, windowMs: number): FoldPose {
  if (progress <= 0) return { angle: FOLD_FROM, opacity: 0, scale: 0.94 };
  if (progress >= 1) return { angle: 0, opacity: 1, scale: 1 };
  const settled = spring(progress * windowMs, FOLD_SPRING_MS, FOLD_BOUNCE);
  return {
    angle: FOLD_FROM * (1 - settled),
    opacity: Math.min(progress / FOLD_FADE, 1),
    scale: 0.94 + 0.06 * Math.min(settled, 1),
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

/** The pawn's landing: a quick squash that springs back, as a paper cone
 *  would on a card. 1 is its rest height. */
export const LANDING_MS = 320;

export function landingSquash(t: number): number {
  if (t <= 0 || t >= LANDING_MS) return 1;
  const settled = spring(t, 260, 0.3);
  return 1 - 0.14 * (1 - settled) * Math.min(t / 40, 1);
}
