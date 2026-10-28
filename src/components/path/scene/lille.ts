import {
  BoxGeometry,
  CurvePath,
  CylinderGeometry,
  LineCurve3,
  QuadraticBezierCurve3,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type Object3D,
} from "three";

import { PATH_STEPS } from "@/data/path";

import type { SceneDefinition, SceneKit } from "./definition";
import { at, gable, group } from "./parts";

/* Lille (GH-149; GH-141, decision 3): the Chamber of Commerce belfry and the
   Vieille Bourse's courtyard on the Place du Théâtre, ringed with a pipe loop
   for the water work at GSK, and a clock face whose hand sweeps to the
   projected saving. The belfry and the Bourse's front are Hunyuan3D
   silhouettes (`docs/path-assets.md`); the rest is code. */

const BASE_TOP = 0.3;
const PAVING = 0.08;
/** Where props stand: the courtyard's paving. */
const TOP = BASE_TOP + PAVING;

/** The courtyard's centre, and half its width and depth inside the wings. */
const COURT = { x: 0.7, z: -0.2, halfWidth: 1.9, halfDepth: 1.4 };

const lille = PATH_STEPS.find((step) => step.slug === "lille")!;
const clockLine =
  lille.lines[
    lille.props.find((prop) => prop.id === "clock-face")!.captionLine
  ];
const saving = clockLine.match(/projected to save ([\d,]+ m³ a year)/)?.[1];
if (!saving) {
  throw new Error("Lille's clock expects its line's projected water saving");
}

/** What the clock says, from the step's own line, never typed in: the
 *  water figure always says "projected" (GH-141, decision 10). */
export const LILLE_FIGURE = `${saving} — projected saving`;
/** The figure as it is set under the dial, in two lines that read back to
 *  `LILLE_FIGURE` with a space between them. */
export const LILLE_FIGURE_LINES = [`${saving} —`, "projected saving"] as const;

/** Where the hand ends: a little short of a full turn, pointing at the mark
 *  that stands for the saving. Clockwise is negative about +z. */
export const HAND_END_ANGLE = -(5 / 6) * 2 * Math.PI;

/** The hand's angle as its clock lands: still while it starts to fall, then
 *  sweeping and easing out onto the mark as it lands. */
export function handAngle(progress: number): number {
  const t = Math.min(Math.max((progress - 0.25) / 0.75, 0), 1);
  return HAND_END_ANGLE * (1 - (1 - t) ** 3);
}

const DIAL_RADIUS = 0.48;
const DIAL_HEIGHT = 1.3;

/** A Vieille Bourse side range: a long block of houses under one roof, with
 *  its ground-floor arcade facing into the courtyard. */
function range(kit: SceneKit, length: number, facing: 1 | -1): Object3D {
  const height = 0.85;
  const depth = 0.7;
  const block = at(
    kit.solid(new BoxGeometry(depth, height, length), "prop"),
    0,
    height / 2,
    0,
  );
  const roof = kit.solid(gable(depth + 0.1, 0.42, length + 0.1), "prop");
  const arches = Array.from({ length: 5 }, (_, index) => {
    const arch = kit.pane(new BoxGeometry(0.02, 0.32, 0.3), "outline", 0.7);
    return at(
      arch,
      facing * (depth / 2 + 0.01),
      0.18,
      (index - 2) * (length / 5),
    );
  });
  return group(block, at(roof, 0, height, 0), ...arches);
}

/** A rounded rectangle around the courtyard, as the pipe loop's centreline. */
function loopPath(halfWidth: number, halfDepth: number, corner: number) {
  const path = new CurvePath<Vector3>();
  const y = 0.22;
  const points = [
    [halfWidth, halfDepth],
    [-halfWidth, halfDepth],
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
  ];
  points.forEach(([x, z], index) => {
    const [nx, nz] = points[(index + 1) % points.length];
    const [px, pz] = points[(index + 3) % points.length];
    const toward = (fx: number, fz: number, tx: number, tz: number) => {
      const length = Math.hypot(tx - fx, tz - fz);
      return new Vector3(
        fx + ((tx - fx) / length) * corner,
        y,
        fz + ((tz - fz) / length) * corner,
      );
    };
    const enter = toward(x, z, px, pz);
    const leave = toward(x, z, nx, nz);
    path.add(new QuadraticBezierCurve3(enter, new Vector3(x, y, z), leave));
    path.add(new LineCurve3(leave, toward(nx, nz, x, z)));
  });
  return path;
}

export const LILLE_SCENE: SceneDefinition = {
  id: "lille",
  target: [0, 1.7, -0.4],
  frameRadius: 4.4,

  models: {
    belfry: "/path/models/lille-belfry.bin",
    bourse: "/path/models/lille-bourse.bin",
  },

  base: (kit) => {
    const ground = at(
      kit.solid(new CylinderGeometry(4.9, 5.1, BASE_TOP, 8), "ground"),
      0,
      BASE_TOP / 2,
      0,
    );
    const paving = at(
      kit.solid(
        new BoxGeometry(
          COURT.halfWidth * 2 + 1.6,
          PAVING,
          COURT.halfDepth * 2 + 1.4,
        ),
        "tile",
      ),
      COURT.x,
      BASE_TOP + PAVING / 2,
      COURT.z,
    );
    return group(ground, paving);
  },

  props: {
    /* The Chamber of Commerce's belfry, 76 m of brick and stone beside the
       Bourse; it stands to the courtyard's left, taller than everything. */
    belfry: (kit) => at(kit.model("belfry", "prop", 5.2), -2.9, TOP, -1.6),

    /* The Vieille Bourse: its street front, from Hunyuan3D, closes the back
       of the courtyard; two arcaded ranges in code make its sides, left open
       to the camera so the courtyard shows. */
    courtyard: (kit) => {
      const front = at(
        kit.model("bourse", "prop", 1.6),
        0,
        0,
        -COURT.halfDepth - 0.45,
      );
      const left = at(
        range(kit, COURT.halfDepth * 2, 1),
        -COURT.halfWidth - 0.35,
        0,
        0,
      );
      const right = at(
        range(kit, COURT.halfDepth * 2, -1),
        COURT.halfWidth + 0.35,
        0,
        0,
      );
      return at(group(front, left, right), COURT.x, TOP, COURT.z);
    },

    /* The plant's water loop, run round the courtyard on low stands, with a
       valve wheel at the front where the visitor stands. */
    "pipe-loop": (kit) => {
      const halfWidth = COURT.halfWidth + 0.95;
      const halfDepth = COURT.halfDepth + 0.6;
      const pipe = kit.solid(
        new TubeGeometry(
          loopPath(halfWidth, halfDepth, 0.45),
          120,
          0.07,
          8,
          true,
        ),
        "accent",
      );
      const stands = [-1, 1].flatMap((side) =>
        [-0.6, 0.6].map((along) =>
          at(
            kit.solid(new BoxGeometry(0.1, 0.18, 0.1), "prop"),
            along * halfWidth,
            0.09,
            side * halfDepth,
          ),
        ),
      );
      const valve = new TorusGeometry(0.17, 0.035, 6, 16);
      const wheel = at(kit.solid(valve, "accent"), 0, 0.46, halfDepth);
      const stem = at(
        kit.solid(new CylinderGeometry(0.03, 0.03, 0.2, 6), "prop"),
        0,
        0.32,
        halfDepth,
      );
      return at(group(pipe, ...stands, stem, wheel), COURT.x, TOP, COURT.z);
    },

    /* The clock in the courtyard: its hand sweeps to the mark for the
       saving, and the figure is set under it. Its marks are in the accent,
       which reads on the ground in both modes; the outline does not in dark. */
    "clock-face": (kit) => {
      const post = at(
        kit.solid(new BoxGeometry(0.14, DIAL_HEIGHT, 0.14), "prop"),
        0,
        DIAL_HEIGHT / 2,
        -0.1,
      );
      const disc = new CylinderGeometry(DIAL_RADIUS, DIAL_RADIUS, 0.1, 32);
      disc.rotateX(Math.PI / 2);
      const dial = at(kit.solid(disc, "ground"), 0, DIAL_HEIGHT, 0);
      const ticks = Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * 2 * Math.PI;
        const tick = kit.pane(new BoxGeometry(0.03, 0.1, 0.01), "accent", 0.5);
        tick.rotation.z = -angle;
        return at(
          tick,
          Math.sin(angle) * DIAL_RADIUS * 0.82,
          DIAL_HEIGHT + Math.cos(angle) * DIAL_RADIUS * 0.82,
          0.06,
        );
      });
      const markAngle = -HAND_END_ANGLE;
      const mark = kit.pane(new BoxGeometry(0.08, 0.16, 0.01), "accent");
      mark.rotation.z = -markAngle;
      at(
        mark,
        Math.sin(markAngle) * DIAL_RADIUS * 0.8,
        DIAL_HEIGHT + Math.cos(markAngle) * DIAL_RADIUS * 0.8,
        0.065,
      );
      /* The hand turns about the dial's centre: its geometry starts there
         and points up, at noon. */
      const blade = new BoxGeometry(0.06, DIAL_RADIUS * 0.78, 0.03);
      blade.translate(0, (DIAL_RADIUS * 0.78) / 2 - 0.06, 0);
      const hand = at(kit.solid(blade, "accent"), 0, DIAL_HEIGHT, 0.09);
      hand.name = "hand";
      const plaque = at(
        kit.solid(new BoxGeometry(1.55, 0.44, 0.06), "ground"),
        0,
        0.45,
        0,
      );
      const figure = at(
        kit.text(LILLE_FIGURE_LINES, "accent", 0.15),
        0,
        0.45,
        0.035,
      );
      return at(
        group(post, dial, ...ticks, mark, hand, plaque, figure),
        COURT.x + 1,
        TOP,
        COURT.z + 0.75,
      );
    },
  },

  motions: {
    "clock-face": (prop, progress) => {
      const hand = prop.getObjectByName("hand");
      if (hand) hand.rotation.z = handAngle(progress);
    },
  },
};
