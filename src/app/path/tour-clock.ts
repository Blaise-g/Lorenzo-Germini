import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";

import { narrationFor } from "./narration";

/* The pure half of `/path`'s tour: how long it stays at a step, and the clock
   that decides when it moves on. No React and no DOM here, so the specs run
   it directly; the hook that drives it is in `tour.tsx`. */

/** The pause after a step's narration ends, before the pawn moves on: long
 *  enough to see the last prop settle, short enough not to read as a stall. */
export const NARRATION_BEAT_MS = 1200;
/** How long the tour waits for the stage to report a step settled before it
 *  starts the dwell anyway: no runtime, a stuck load, a stage that never
 *  reports. A build takes about two to three seconds. */
export const SETTLE_MAX_WAIT_MS = 6000;

/** The dwell at a step: its narration, then a beat. The same with the voice
 *  on or off, as the captions run on the clip's own timings. */
export function dwellMs(slug: PathStepSlug): number {
  return narrationFor(slug).durationMs + NARRATION_BEAT_MS;
}

/** How far into its narration a step is: nothing while it waits for the
 *  stage, the dwell's elapsed time after. `runningFor` is the time the clock
 *  has run since `clock` was set, which its timer has not yet reported. */
export function playheadMs(clock: StepClock, runningFor = 0): number {
  if (clock.phase === "waiting") return 0;
  if (clock.phase === "done") return clock.dwell;
  return Math.min(clock.dwell, clock.dwell - clock.remaining + runningFor);
}

const slugs = PATH_STEPS.map((step) => step.slug);

export const FIRST_STEP: PathStepSlug = slugs[0];
export const LAST_STEP: PathStepSlug = slugs[slugs.length - 1];

/** The step after `slug` along the path, or null after the last. */
export function stepAfter(slug: PathStepSlug): PathStepSlug | null {
  return slugs[slugs.indexOf(slug) + 1] ?? null;
}

/** The step before `slug`, or null before the first. */
export function stepBefore(slug: PathStepSlug): PathStepSlug | null {
  const index = slugs.indexOf(slug);
  return index > 0 ? slugs[index - 1] : null;
}

/** One step's clock. It waits for the stage to settle, at most
 *  `SETTLE_MAX_WAIT_MS`, then dwells, then is done and the tour moves on.
 *  Whichever of settled and the wait running out comes first starts the
 *  dwell, and only once. `remaining` is what is left of the current phase, so
 *  a pause keeps it. */
export type StepClock =
  | { phase: "waiting"; remaining: number; dwell: number }
  | { phase: "dwelling"; remaining: number; dwell: number }
  | { phase: "done"; remaining: 0; dwell: number };

export function startClock(
  dwell: number,
  maxWait = SETTLE_MAX_WAIT_MS,
): StepClock {
  return { phase: "waiting", remaining: maxWait, dwell };
}

/** The stage reported the step settled: it starts the dwell if the wait has
 *  not already, and changes nothing after. */
export function settleClock(clock: StepClock): StepClock {
  if (clock.phase !== "waiting") return clock;
  return { phase: "dwelling", remaining: clock.dwell, dwell: clock.dwell };
}

/** `ms` of running time went by. Time past the end of the wait carries into
 *  the dwell, so a late timer does not lengthen the step. */
export function elapseClock(clock: StepClock, ms: number): StepClock {
  if (clock.phase === "done") return clock;
  const remaining = clock.remaining - ms;
  if (remaining > 0) return { ...clock, remaining };
  if (clock.phase === "waiting") {
    return elapseClock(settleClock(clock), -remaining);
  }
  return { phase: "done", remaining: 0, dwell: clock.dwell };
}

/** The tour's timing: the step it is timing and that step's clock, one
 *  piece of state, so a clock is never paired with another step's. */
export type Timing = { slug: PathStepSlug; clock: StepClock };

export type TimingAction =
  /** The step changed: a new clock, whatever selected it. */
  | { type: "start"; slug: PathStepSlug; dwell: number }
  /** The stage reported `slug` settled. */
  | { type: "settle"; slug: PathStepSlug }
  /** `ms` of running time went by on `from`, the clock the timer was set
   *  for; a clock since replaced by a new step or a settle is left alone. */
  | { type: "elapse"; from: StepClock; ms: number };

/** Every change to the timing, as a reducer: React may replay its actions
 *  over an earlier state — a step that a `replaceStep` from an effect
 *  renders at once, ahead of a timer's update still queued — and each lands
 *  the same way whatever order it is replayed in. Kept as separate states,
 *  a replay once paired the new step with the last one's finished clock,
 *  and the tour ran on to the end in one go. */
export function timingReducer(state: Timing, action: TimingAction): Timing {
  switch (action.type) {
    case "start":
      return state.slug === action.slug
        ? state
        : { slug: action.slug, clock: startClock(action.dwell) };
    case "settle":
      if (state.slug !== action.slug) return state;
      return state.clock.phase === "waiting"
        ? { ...state, clock: settleClock(state.clock) }
        : state;
    case "elapse":
      return state.clock === action.from
        ? { ...state, clock: elapseClock(state.clock, action.ms) }
        : state;
  }
}
