import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  PlaneGeometry,
  Shape,
  Vector2,
  type Group,
} from "three";

import { MVP_WINDOW_LABEL } from "@/data/path";

import type { SceneDefinition, SceneKit } from "./definition";
import { at, gable, group } from "./parts";

/* Home, rough (GH-148): grey-box props built in code, standing on the plateau
   between Cuneo's two rivers with the Bisalta behind. It is the tracer scene —
   its job is to prove the build, the camera and the fallback, not the look,
   which GH-149's pipeline and the owner's verdict decide. Units are metres
   of nothing in particular; the plateau is about 7 across, on a base about 10 across. */

const BASE_TOP = 0.3;
const PLATEAU_DEPTH = 0.35;
const PLATEAU_BEVEL = 0.08;
/** Where props stand: the plateau's top face. */
const TOP = BASE_TOP + PLATEAU_DEPTH + PLATEAU_BEVEL * 2;

/** The MVP window's label as it is set over the window, in two lines, as
 *  Lille's figure is: decision 3's words, from the step's own line. */
export const MVP_WINDOW_LINES = MVP_WINDOW_LABEL.replace(" — ", " —\n").split(
  "\n",
);
/** Dimmed, like the window it names. In the accent, as Lille's figure is:
 *  the outline's near-black does not read over dark mode's peaks. */
export const MVP_WINDOW_LABEL_OPACITY = 0.6;

/** A building: a box with a gabled roof, standing on `TOP`. */
function building(
  kit: SceneKit,
  width: number,
  height: number,
  depth: number,
  roof: number,
): Group {
  return group(
    at(
      kit.solid(new BoxGeometry(width, height, depth), "prop"),
      0,
      height / 2,
      0,
    ),
    at(
      kit.solid(gable(width + 0.12, roof, depth + 0.12), "prop"),
      0,
      height,
      0,
    ),
  );
}

/** A Bisalta peak, turned on a lathe from its profile. */
function peak(radius: number, height: number) {
  /* Bottom to top: a lathe's faces face outward only in this order. */
  const profile = [
    new Vector2(radius, 0),
    new Vector2(radius * 0.55, height * 0.42),
    new Vector2(radius * 0.18, height * 0.86),
    new Vector2(0, height),
  ];
  return new LatheGeometry(profile, 7);
}

export const HOME_SCENE: SceneDefinition = {
  id: "home",
  target: [0, 1, 0],
  frameRadius: 4.6,

  base: (kit) => {
    const ground = kit.solid(
      new CylinderGeometry(4.9, 5.1, BASE_TOP, 8),
      "ground",
    );
    return at(ground, 0, BASE_TOP / 2, 0);
  },

  props: {
    /* The wedge between the Stura and the Gesso, pointing downstream. */
    plateau: (kit) => {
      const shape = new Shape();
      shape.moveTo(-3.4, -1.6);
      shape.lineTo(-1.2, 2.6);
      shape.lineTo(1.2, 2.6);
      shape.lineTo(3.4, -1.6);
      shape.closePath();
      const geometry = new ExtrudeGeometry(shape, {
        depth: PLATEAU_DEPTH,
        bevelEnabled: true,
        bevelSize: PLATEAU_BEVEL,
        bevelThickness: PLATEAU_BEVEL,
        bevelSegments: 1,
      });
      geometry.rotateX(Math.PI / 2);
      geometry.translate(0, PLATEAU_DEPTH + PLATEAU_BEVEL, 0);
      return at(kit.solid(geometry, "tile"), 0, BASE_TOP, 0.4);
    },

    bisalta: (kit) =>
      group(
        at(kit.solid(peak(2.3, 3.6), "prop"), -1.5, BASE_TOP, -3.4),
        at(kit.solid(peak(2, 3.1), "prop"), 1.7, BASE_TOP, -3.7),
      ),

    school: (kit) => {
      const school = building(kit, 2, 1.1, 1.2, 0.55);
      const door = at(
        kit.pane(new PlaneGeometry(0.32, 0.5), "accent"),
        0,
        0.25,
        0.61,
      );
      return at(group(school, door), -1.2, TOP, 0.9);
    },

    /* The classroom he went back to teach in: an annex with a board. */
    schoolroom: (kit) => {
      const room = building(kit, 1.1, 0.8, 1, 0.4);
      const board = at(
        kit.pane(new PlaneGeometry(0.7, 0.36), "outline"),
        0,
        0.45,
        0.51,
      );
      return at(group(room, board), 0.45, TOP, 1.15);
    },

    /* The MVP killed after customer discovery: a window left dimmed, and
       labelled so, in dimmed text. */
    "mvp-window": (kit) => {
      const frame = new Shape();
      frame.moveTo(-0.5, 0);
      frame.lineTo(0.5, 0);
      frame.lineTo(0.5, 1.2);
      frame.lineTo(-0.5, 1.2);
      frame.closePath();
      const hole = new Shape();
      hole.moveTo(-0.38, 0.12);
      hole.lineTo(0.38, 0.12);
      hole.lineTo(0.38, 1.08);
      hole.lineTo(-0.38, 1.08);
      hole.closePath();
      frame.holes.push(hole);
      const geometry = new ExtrudeGeometry(frame, {
        depth: 0.12,
        bevelEnabled: false,
      });
      const pane = at(
        kit.pane(new PlaneGeometry(0.76, 0.96), "fog", 0.55),
        0,
        0.6,
        0.06,
      );
      const label = at(
        kit.text(MVP_WINDOW_LINES, "accent", 0.22, MVP_WINDOW_LABEL_OPACITY),
        0,
        1.62,
        0.06,
      );
      return at(
        group(kit.solid(geometry, "prop"), pane, label),
        1.75,
        TOP,
        0.1,
      );
    },

    "startup-desk": (kit) => {
      const top = at(
        kit.solid(new BoxGeometry(1.1, 0.08, 0.55), "prop"),
        0,
        0.5,
        0,
      );
      const legs = [-0.48, 0.48].map((x) =>
        at(kit.solid(new BoxGeometry(0.06, 0.46, 0.5), "prop"), x, 0.23, 0),
      );
      const screen = at(
        kit.solid(new BoxGeometry(0.5, 0.32, 0.04), "accent"),
        0,
        0.74,
        -0.12,
      );
      return at(group(top, ...legs, screen), 1, TOP, 1.85);
    },

    office: (kit) => {
      const tower = at(
        kit.solid(new BoxGeometry(1.3, 2.1, 1.1), "prop"),
        0,
        1.05,
        0,
      );
      const bands = [0.6, 1.1, 1.6].map((y) =>
        at(kit.pane(new PlaneGeometry(1.02, 0.18), "accent"), 0, y, 0.56),
      );
      return at(group(tower, ...bands), 0, TOP, -0.85);
    },
  },
};
