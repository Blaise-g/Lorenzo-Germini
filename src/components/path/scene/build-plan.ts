import { PATH_STEPS } from "@/data/path";
import type { PathSceneId, PathStep } from "@/data/path.types";

/* The scene runtime's contract that needs no three.js (GH-148): which scenes
   exist, what a step builds and in what order, which caption line each prop
   lights, and where its stills are. The host imports this before the runtime
   loads. */

/** A step's scene build, from selection to its still composition. `idle` is a
 *  step with no scene yet, or no runtime; the host carries it as
 *  `data-build-state`. */
export type BuildState = "idle" | "loading" | "building" | "built";

/** The scenes that have art. A step whose scene is missing shows its text and
 *  says the scene is not built yet. */
export const SCENES_WITH_ART: readonly PathSceneId[] = ["home", "lille"];

export function hasScene(step: PathStep): boolean {
  return SCENES_WITH_ART.includes(step.sceneId);
}

/** About 2–3 s from the first prop's drop to the last one landing (GH-141,
 *  decision 8). Every build takes the whole span, however many props it has,
 *  so one prop is not a lonely blink and five are not a stampede. */
export const BUILD_MS = 2400;
export const PROP_DROP_MS = 800;

/** The camera's limited turn: this many 45° steps either way from the
 *  scene's front (storyboard §7.4). */
export const TURN_LIMIT = 1;

export type PlannedProp = {
  id: string;
  /** The step's line this prop captions, lit in the text panel as it lands. */
  captionLine: number;
  /** When it starts to drop and when it lands, in ms from the build's start. */
  startsAt: number;
  landsAt: number;
};

export type BuildPlan = {
  scene: PathSceneId;
  /** In place before the build starts: home's earlier returns (storyboard
   *  §7.1, "home builds up"). */
  standing: readonly string[];
  /** Dropped in, in the data's order, which is the build order. */
  building: readonly PlannedProp[];
};

/** What selecting `step` builds. Home's steps share a scene: a return shows
 *  every earlier stage's props standing and builds only its own. */
export function buildPlan(step: PathStep): BuildPlan {
  const standing =
    step.sceneId === "home"
      ? PATH_STEPS.filter(
          (other) =>
            other.sceneId === "home" && other.homeStage < step.homeStage,
        ).flatMap((other) => other.props.map((prop) => prop.id))
      : [];

  const count = step.props.length;
  const stagger = count > 1 ? (BUILD_MS - PROP_DROP_MS) / (count - 1) : 0;
  const building = step.props.map((prop, index) => {
    const startsAt = count > 1 ? index * stagger : BUILD_MS - PROP_DROP_MS;
    return {
      id: prop.id,
      captionLine: prop.captionLine,
      startsAt,
      landsAt: startsAt + PROP_DROP_MS,
    };
  });

  return { scene: step.sceneId, standing, building };
}

/** The caption lines lit `elapsed` ms into a build: one per landed prop. */
export function litLines(plan: BuildPlan, elapsed: number): number[] {
  const lit = plan.building
    .filter((prop) => prop.landsAt <= elapsed)
    .map((prop) => prop.captionLine);
  return [...new Set(lit)].sort((a, b) => a - b);
}

/** The scenes whose stills are painted over their grey-box renders, which
 *  the stills script therefore never overwrites. */
export const PAINTED_SCENES: readonly PathSceneId[] = ["lille"];

/** The stills a step shows before its scene renders and as the fallback, one
 *  per mode: grey-box renders of the runtime's end state, made by `bun run
 *  generate:path-stills`, or, for a scene in `PAINTED_SCENES`, those renders
 *  painted over (`docs/path-assets.md`). */
export function stillsFor(
  step: PathStep,
): { light: string; dark: string } | undefined {
  if (!hasScene(step)) return undefined;
  const name =
    step.sceneId === "home" ? `home-${step.homeStage}` : step.sceneId;
  return {
    light: `/path/stills/${name}-light.webp`,
    dark: `/path/stills/${name}-dark.webp`,
  };
}
