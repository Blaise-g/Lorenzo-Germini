"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

import type { PathStepSlug } from "@/data/path.types";

/* The contract between the scene stage and the tour. The tour drives the
   selected step; the stage follows it, moves the pawn and builds that step's
   tile, and reports here when the step has settled, so the tour starts its
   dwell only once there is something to look at. Without a runtime — no
   WebGL, a fallback, reduced motion, a tile whose cards did not load — the stage
   reports a step settled as soon as its stills or text are showing. */

/** The step the stage last showed, and whether its pawn move and build have
 *  finished. `slug` is null before the stage has shown anything. */
export type StageStatus = { slug: PathStepSlug | null; settled: boolean };

const INITIAL: StageStatus = { slug: null, settled: false };

const StageStatusContext = createContext<StageStatus>(INITIAL);
const SetStageStatusContext = createContext<(status: StageStatus) => void>(
  () => {},
);

export function StageStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StageStatus>(INITIAL);
  return (
    <SetStageStatusContext value={setStatus}>
      <StageStatusContext value={status}>{children}</StageStatusContext>
    </SetStageStatusContext>
  );
}

/** For the tour: what the stage is showing and whether it has settled. */
export function useStageStatus(): StageStatus {
  return useContext(StageStatusContext);
}

/** For the scene stage: reports the step it shows and when it settles. */
export function useSetStageStatus() {
  return useContext(SetStageStatusContext);
}

/* The contract between the narration and the board (v3): the cue being
   spoken or captioned now, so the board can move the prop its sentence is
   about while it is said. The tour publishes it, from the same clock with
   the voice on or off. It names a prop by the data's id (`path.ts`), never by
   how the board draws it. */

/** The cue playing at the selected step. Consumers re-render when `slug`,
 *  `index`, `prop` or `running` change, and not as the cue plays: read
 *  `progress()` per frame for that. */
export type NarrationCue = {
  /** The step being narrated: the selected step. */
  slug: PathStepSlug;
  /** The cue's index in `narrationFor(slug).cues`. */
  index: number;
  /** The prop the cue is about, by its id in the step's `props`, or null
   *  for a cue about none. */
  prop: string | null;
  /** Whether the narration is moving: false while the step waits for the
   *  stage, while the tour is paused or held, and after its narration. */
  running: boolean;
  /** How far through the cue's speech the narration is, 0 to 1, read live.
   *  Call it each frame; a held value goes stale. */
  progress: () => number;
};

export const NarrationCueContext = createContext<NarrationCue | null>(null);

/** For the board: the cue playing now, or null outside the tour. */
export function useNarrationCue(): NarrationCue | null {
  return useContext(NarrationCueContext);
}
