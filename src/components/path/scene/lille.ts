import { PATH_STEPS } from "@/data/path";

/* Lille's figure and dial (GH-149; GH-141, decision 3): the plaque under the
   clock card carries the projected saving, and the dial's hand sweeps to the
   mark that stands for it as the card folds up. No three.js here: a spec
   checks the words and the sweep directly. */

const lille = PATH_STEPS.find((step) => step.slug === "lille")!;
const clockLine =
  lille.lines[
    lille.props.find((prop) => prop.id === "clock-face")!.captionLine
  ];
const saving = clockLine.match(/projected to save ([\d,]+ m³ a year)/)?.[1];
if (!saving) {
  throw new Error("Lille's clock expects its line's projected water saving");
}

/** The figure as it is set on the plaque, in two lines: the saving from the
 *  step's own line, never typed in, and decision 3's caption for it. */
export const LILLE_FIGURE_LINES = [`${saving} —`, "projected saving"] as const;
/** What the plaque says: the water figure always says "projected" (GH-141,
 *  decision 10). */
export const LILLE_FIGURE = LILLE_FIGURE_LINES.join(" ");

/** Where the hand ends: a little short of a full turn, pointing at the mark
 *  that stands for the saving. Clockwise is negative about +z. */
export const HAND_END_ANGLE = -(5 / 6) * 2 * Math.PI;

/** The hand's angle as its card folds up: still while the card starts to
 *  rise, then sweeping and easing out onto the mark as it settles. */
export function handAngle(progress: number): number {
  const t = Math.min(Math.max((progress - 0.25) / 0.75, 0), 1);
  return HAND_END_ANGLE * (1 - (1 - t) ** 3);
}
