import type { PathStep } from "@/data/path.types";

/** The step's label on the path: its place, then its period, or "home" for
 *  the first step, which has no dates. */
export function stepPeriod(step: PathStep) {
  if (step.period) return step.period;
  return step.sceneId === "home" && step.homeStage === 1 ? "home" : undefined;
}
