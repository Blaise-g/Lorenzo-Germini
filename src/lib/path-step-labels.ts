import type { PathRole, PathStep } from "@/data/path.types";

/** The step's label on the path: its place, then its period, or "home" for
 *  the first step, which has no dates. */
export function stepPeriod(step: PathStep) {
  if (step.period) return step.period;
  return step.sceneId === "home" && step.homeStage === 1 ? "home" : undefined;
}

/** A degree is already one of the step's lines, word for word, so wherever
 *  the step is set its role drops the title and keeps the school. */
export function roleRepeatsLine(step: PathStep, role: PathRole) {
  return step.lines.includes(`${role.title}, ${role.organisation}.`);
}
