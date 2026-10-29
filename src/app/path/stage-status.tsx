"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

import type { PathStepSlug } from "@/data/path.types";

/* The contract between the scene stage and the tour. The tour drives the
   selected step; the stage follows it, moves the pawn and builds that step's
   tile, and reports here when the step has settled, so the tour starts its
   dwell only once there is something to look at. Without a runtime — no
   WebGL, a fallback, reduced motion, a scene not built yet — the stage
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
