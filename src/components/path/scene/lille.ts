/* Lille's clock face (GH-149; GH-141, decision 3): its hand sweeps to the
   mark that stands for the projected saving as the clock rises. The figure
   itself is said by the voice and the caption line, never in the scene. No
   three.js here: a spec checks the sweep directly. */

/** Where the hand ends: a little short of a full turn. Clockwise is
 *  negative about +z. */
export const HAND_END_ANGLE = -(5 / 6) * 2 * Math.PI;

/** The hand's angle as its clock rises: still while it starts to come up,
 *  then sweeping and easing out onto the mark as it settles. */
export function handAngle(progress: number): number {
  const t = Math.min(Math.max((progress - 0.25) / 0.75, 0), 1);
  return HAND_END_ANGLE * (1 - (1 - t) ** 3);
}
