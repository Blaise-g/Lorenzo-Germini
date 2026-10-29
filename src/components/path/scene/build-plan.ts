import { PATH_STEPS } from "@/data/path";
import type { PathSceneId, PathStep, PathStepSlug } from "@/data/path.types";

/* The board runtime's contract that needs no three.js (GH-148): which steps
   have art, what selecting a step builds and in what order, which caption
   line each prop lights, and where its stills are. The host imports this
   before the runtime loads. */

/** A step's tile build, from selection to its settled board. `building`
 *  covers the pawn's move to the tile as well as its pieces rising;
 *  `idle` is no runtime yet. The host carries it as `data-build-state`. */
export type BuildState = "idle" | "loading" | "building" | "built";

/** The scenes that have art: every step's, now that each step is a tile on
 *  one board. The host shows the canvas for a step whose scene is here. */
export const SCENES_WITH_ART: readonly PathSceneId[] = [
  "home",
  "turin",
  "switzerland",
  "lille",
  "open",
];

const STEPS_BY_SLUG = new Map(PATH_STEPS.map((step) => [step.slug, step]));

export function stepNamed(slug: PathStepSlug): PathStep {
  return STEPS_BY_SLUG.get(slug)!;
}

export function hasScene(step: PathStep): boolean {
  return SCENES_WITH_ART.includes(step.sceneId);
}

/** About 2–3 s from the first piece's rise to the last one settling (GH-141,
 *  decision 8). Every build takes the whole span, however many props it has,
 *  so one prop is not a lonely blink and five are not a stampede. */
export const BUILD_MS = 2400;
/** One prop's rise, from squat to settled on its spring. */
export const PROP_DROP_MS = 800;

/** The camera's limited turn: this many steps either way from the board's
 *  front (storyboard §7.4). */
export const TURN_LIMIT = 1;

export type PlannedProp = {
  id: string;
  /** The step's line this prop captions, counted lit as it lands (the
   *  stage's `data-scene-lit`, the build's progress). */
  captionLine: number;
  /** When it starts to rise and when it settles, in ms from the build's
   *  start. */
  startsAt: number;
  landsAt: number;
};

export type BuildPlan = {
  step: PathStep["slug"];
  /** Standing before the build starts: every earlier step's props, since the
   *  pawn has passed their tiles on its way here (the tour plays the steps
   *  in order, and a fragment enters it part-way). */
  standing: readonly string[];
  /** Raised, in the data's order, which is the build order. */
  building: readonly PlannedProp[];
};

/** What selecting `step` builds: its own tile, with the tiles before it on
 *  the loop already standing. */
export function buildPlan(step: PathStep): BuildPlan {
  const index = PATH_STEPS.findIndex((other) => other.slug === step.slug);
  const standing = PATH_STEPS.slice(0, Math.max(index, 0)).flatMap((other) =>
    other.props.map((prop) => prop.id),
  );

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

  return { step: step.slug, standing, building };
}

/** The caption lines counted lit `elapsed` ms into a build: one per landed
 *  prop. */
export function litLines(plan: BuildPlan, elapsed: number): number[] {
  const lit = plan.building
    .filter((prop) => prop.landsAt <= elapsed)
    .map((prop) => prop.captionLine);
  return [...new Set(lit)].sort((a, b) => a - b);
}

/** The stills a step shows before the board renders and as the fallback, one
 *  per mode: renders of the board settled on that step, every tile built and
 *  the pawn on the step's tile, made by `bun run generate:path-stills`. */
export function stillsFor(
  step: PathStep,
): { light: string; dark: string } | undefined {
  if (!hasScene(step)) return undefined;
  return {
    light: `/path/stills/${step.slug}-light.webp`,
    dark: `/path/stills/${step.slug}-dark.webp`,
  };
}
