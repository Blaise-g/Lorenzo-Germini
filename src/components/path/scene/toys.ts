import {
  BufferGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Material,
  type Object3D,
} from "three";

import { fitInto, type FitBox } from "./assets";
import type { Piece } from "./board";
import { handAngle } from "./lille";
import { easeInOut } from "./motion";
import type { Paint } from "./paint";
import { BEAT_NODE } from "./piece-beats";
import { block, named, seededRandom, solid, type Built } from "./props";
import type { PropPlacement } from "./scene-assets";

/* The toy pieces (v3-toys): the generated props, side props and markers
   (`PROP_INDEX`) standing where the code-built pieces stood. A model is one
   fused, textured mesh, so whatever a beat moves stays in code (the
   brief's rule): the dial's needle, the clock's hand, the window's glass
   and shutters, the monitor's screen, the plinth's slots and the coils'
   rotor are built here and parented to the model at the spot measured on
   it, named as `BEAT_NODE` finds them. The coils themselves are in the
   model; `prepareModel` cuts them apart so each can swell in its turn.

   Every spot below is in the model's own frame, as the index ships it: one
   unit tall, its foot on the origin, its front toward +z. They were read
   off each model's vertices (slices by height, the face's widest span, the
   recesses' floors) and checked close up on the board. */

/** Readies a model, once, as it arrives, before any piece is made from it:
 *  the coils are cut into their three windings. */
export function prepareModel(id: string, scene: Object3D) {
  if (id === "ferraris-coils") splitCoils(scene);
}

/** A tile's piece made from its model: fitted to the piece's box, with the
 *  parts its beat moves added in code. Trees are instanced. */
export function toyPiece(
  paint: Paint,
  scene: Object3D,
  placement: PropPlacement,
  piece: Piece,
  seed: number,
): Built {
  if (placement.model.startsWith("tree-")) {
    return toyTrees(paint, scene, piece, seed);
  }
  const model = fitInto(scene, piece, 1, placement.squash);
  const group = new Group();
  group.add(model);
  const accent = ACCENTS[placement.model]?.(paint);
  if (!accent) return { object: group };
  /* The accents stand in the model's frame, scaled with it but never
     squashed: a part turning inside a squashed frame would shear. Their
     depth is placed where the squash put the model's. */
  const parts = new Group();
  parts.position.copy(model.position);
  parts.scale.setScalar(model.scale.x);
  const squash = model.scale.z / model.scale.x;
  for (const part of accent.parts) {
    part.position.z *= squash;
    parts.add(part);
  }
  group.add(parts);
  return { object: group, motion: accent.motion };
}

/** A side prop made from its model, fitted to its box on the board. */
export function toySide(scene: Object3D, box: FitBox): Object3D {
  return fitInto(scene, box);
}

/** A marker made from its model, standing `height` tall, its foot on the
 *  origin and its face toward +z. */
export function toyMarker(scene: Object3D, height: number): Object3D {
  return fitInto(scene, { w: height * 4, d: height * 4, h: height });
}

type Accent = {
  parts: Object3D[];
  motion?: (progress: number) => void;
};

/** The window's glass, lit by its beat, as the code-built window's is. */
function glassMaterial(paint: Paint) {
  return paint.material(
    { base: "ink-cool", toward: "paper", amount: 0.2, shade: 0.7 },
    { roughness: 0.2, glow: 0.05 },
  );
}

const ACCENTS: Readonly<Record<string, (paint: Paint) => Accent>> = {
  /* The rotor, which the model was made without, on the base's middle:
     a drum with a bar across its top, spinning up as the coils rise. */
  "ferraris-coils"(paint) {
    const rotor = named(BEAT_NODE.rotor, new Group());
    rotor.position.set(0, ROTOR_FOOT, 0);
    rotor.add(
      solid(
        new CylinderGeometry(0.17, 0.17, 0.5, 16),
        paint.shared("cool"),
        [0, 0.25, 0],
      ),
      block(paint.shared("coolLight"), [0.62, 0.09, 0.12], [0, 0.42, 0], 0.03),
    );
    return {
      parts: [rotor],
      motion(progress) {
        rotor.rotation.y = easeInOut(progress) * Math.PI * 4;
      },
    };
  },
  /* The needle, which the model was made without, on the dial's centre:
     it sweeps down to its mark as the dial rises. */
  "roche-dial"(paint) {
    const needle = named(BEAT_NODE.needle, new Group());
    needle.position.set(0, 0.69, 0.108);
    needle.add(
      block(paint.shared("warmDeep"), [0.03, 0.24, 0.014], [0, 0, 0], 0.006),
    );
    const hub = solid(
      new CylinderGeometry(0.04, 0.04, 0.024, 14),
      paint.shared("cool"),
    );
    hub.rotation.x = Math.PI / 2;
    needle.add(hub);
    const from = Math.PI * 0.62;
    const to = -Math.PI * 0.45;
    return {
      parts: [needle],
      motion(progress) {
        needle.rotation.z = from + (to - from) * easeInOut(progress);
      },
    };
  },
  /* The hand, which the model was made without, on the clock's centre:
     it sweeps to the saving's mark as the clock rises (`lille.ts`). */
  "clock-face"(paint) {
    const hand = named(BEAT_NODE.hand, new Group());
    hand.position.set(0, 0.705, 0.066);
    hand.add(
      block(
        paint.shared("warmDeep"),
        [0.03, 0.22, 0.014],
        [0, -0.02, 0],
        0.007,
      ),
    );
    return {
      parts: [hand],
      motion(progress) {
        hand.rotation.z = handAngle(progress);
      },
    };
  },
  /* A pane over the model's glass, behind its mullions, which lights, and
     the two shutters it was made without, hinged at the opening's sides:
     built shut across the opening, and stood open flat beside it, so the
     beat's swing back to the built pose closes them in front of the
     glass. */
  "mvp-window"(paint) {
    const glass = named(
      BEAT_NODE.glass,
      block(
        glassMaterial(paint),
        [0.34, 0.47, 0.006],
        [0, 0.275, 0.009],
        0.002,
      ),
    );
    const parts: Object3D[] = [glass];
    const width = 0.18;
    const height = 0.47;
    for (const side of [-1, 1]) {
      const hinge = named(BEAT_NODE.shutter, new Group());
      hinge.position.set(side * 0.19, 0.275, 0.072);
      const leaf = block(
        paint.shared("coolLight"),
        [width, height, 0.018],
        [-side * (width / 2), 0, 0],
        0.008,
      );
      /* Through the leaf, so its slats show open as well as shut. */
      for (let slat = 0; slat < 5; slat++) {
        leaf.add(
          block(
            paint.shared("cool"),
            [width - 0.03, 0.012, 0.03],
            [0, -height / 2 + 0.06 + slat * 0.085, 0],
            0.003,
          ),
        );
      }
      hinge.add(leaf);
      hinge.rotation.y = side * SHUTTERS_OPEN;
      parts.push(hinge);
    }
    return { parts };
  },
  /* A screen on the monitor's face, which glows. */
  "startup-desk"(paint) {
    const screen = paint.material(
      { base: "ink-cool", toward: "paper", amount: 0.55 },
      { roughness: 0.3, glow: 0.35, lamp: 2.6 },
    );
    return {
      parts: [
        named(
          BEAT_NODE.screen,
          block(screen, [0.3, 0.17, 0.006], [-0.225, 0.665, 0.042], 0.004),
        ),
      ],
    };
  },
  /* A floor in each of the plinth's five empty recesses, which pulses up
     in turn and stays empty. */
  "next-plinth"(paint) {
    return {
      parts: SLOTS.map((x) =>
        named(
          BEAT_NODE.slot,
          block(
            paint.shared("coolDeep"),
            [0.46, 0.05, 0.36],
            [x, 0.79, 0],
            0.02,
          ),
        ),
      ),
    };
  },
};

/** Where the rotor stands: on the coils' base. */
const ROTOR_FOOT = 0.3;
/** How far the shutters stand open from shut: all but flat to the wall. */
const SHUTTERS_OPEN = Math.PI - 0.2;
/** The plinth's five recesses, left to right, across its top. */
const SLOTS = [-1.32, -0.69, -0.044, 0.6, 1.21] as const;

/* ─── Trees ─── */

/** A cluster of three toy trees, instanced from the model's own mesh, its
 *  material swaying as the code crowns did: the board's trees stay one
 *  draw call a cluster. Each is sized so the three keep inside the piece's
 *  box. */
export function toyTrees(
  paint: Paint,
  scene: Object3D,
  piece: Piece,
  seed: number,
): Built {
  const random = seededRandom(seed);
  const mesh = firstMesh(scene);
  scene.updateMatrixWorld(true);
  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry
    .boundingBox!.clone()
    .applyMatrix4(mesh.matrixWorld);
  const size = bounds.getSize(new Vector3());
  /* The model's mesh, standing on the origin and one unit tall. */
  const unit = new Matrix4()
    .makeScale(1 / size.y, 1 / size.y, 1 / size.y)
    .multiply(
      new Matrix4().makeTranslation(
        -(bounds.min.x + bounds.max.x) / 2,
        -bounds.min.y,
        -(bounds.min.z + bounds.max.z) / 2,
      ),
    )
    .multiply(mesh.matrixWorld);
  const material = mesh.material as Material;
  if (material instanceof MeshStandardMaterial) {
    paint.landmark(material, { sway: true });
  }
  const count = 3;
  const trees = new InstancedMesh(mesh.geometry, material, count);
  const spread = TREE_SPREAD * Math.min(piece.w, piece.d);
  /* Its footprint's diagonal: each tree is turned at random. */
  const wide = Math.hypot(size.x, size.z) / size.y;
  /* Three crowns side by side, each this wide at most, keep inside the box
     (`TREE_SPREAD` either side). */
  const widest = (Math.min(piece.w, piece.d) - 2 * spread) / wide;
  const matrix = new Matrix4();
  const turn = new Quaternion();
  const up = new Vector3(0, 1, 0);
  for (let tree = 0; tree < count; tree++) {
    const angle = (tree / count) * Math.PI * 2 + random();
    const height = Math.min(piece.h * (0.75 + random() * 0.25), widest);
    turn.setFromAxisAngle(up, random() * Math.PI * 2);
    matrix
      .compose(
        new Vector3(Math.cos(angle) * spread, 0, Math.sin(angle) * spread),
        turn,
        new Vector3(height, height, height),
      )
      .multiply(unit);
    trees.setMatrixAt(tree, matrix);
  }
  trees.castShadow = true;
  trees.receiveShadow = true;
  const group = new Group();
  group.add(trees);
  return { object: group };
}

/** How far each tree stands off the cluster's middle, as a share of its
 *  box's shorter side. */
const TREE_SPREAD = 0.16;

function firstMesh(scene: Object3D): Mesh {
  let found: Mesh | undefined;
  scene.traverse((node) => {
    if (!found && node instanceof Mesh) found = node;
  });
  if (!found) throw new Error("A toy model with no mesh");
  return found;
}

/* ─── The coils ─── */

/** Cuts the coils' fused mesh into its base and its three windings, each
 *  a `coil` node pivoting on its own middle, so the coils' beat swells
 *  them in turn. The windings stand round the base's middle; each is found
 *  as a peak of the mesh's area by angle, above the base. The cut shares
 *  the model's vertex buffers: only the index is split. */
export function splitCoils(scene: Object3D) {
  const mesh = firstMesh(scene);
  const geometry = mesh.geometry;
  const index = geometry.index;
  const position = geometry.getAttribute("position");
  if (!index || !mesh.parent) return;
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox!;
  /* Above the base's top, a fifth of the way up, and off its middle. */
  const above = min.y + (max.y - min.y) * COIL_FLOOR;
  const centre = new Vector3();
  geometry.boundingBox!.getCenter(centre);
  const radius = Math.max(max.x - min.x, max.z - min.z) / 2;
  const triangles = index.count / 3;
  const angles = new Float32Array(triangles).fill(Number.NaN);
  const bins = new Array<number>(COIL_BINS).fill(0);
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (let t = 0; t < triangles; t++) {
    a.fromBufferAttribute(position, index.getX(t * 3));
    b.fromBufferAttribute(position, index.getX(t * 3 + 1));
    c.fromBufferAttribute(position, index.getX(t * 3 + 2));
    a.add(b).add(c).divideScalar(3).sub(centre);
    if (a.y + centre.y < above || Math.hypot(a.x, a.z) < radius * 0.35) {
      continue;
    }
    const angle = Math.atan2(a.z, a.x);
    angles[t] = angle;
    bins[binOf(angle)] += 1;
  }
  /* The three tallest peaks, each at least a third of a turn's half from
     the others. */
  const peaks: number[] = [];
  const free = [...bins];
  for (let k = 0; k < 3; k++) {
    const top = free.indexOf(Math.max(...free));
    peaks.push(((top + 0.5) / COIL_BINS) * Math.PI * 2 - Math.PI);
    for (let d = -COIL_BINS / 6; d <= COIL_BINS / 6; d++) {
      free[(top + d + COIL_BINS) % COIL_BINS] = -1;
    }
  }
  const groups: number[][] = [[], [], [], []];
  for (let t = 0; t < triangles; t++) {
    let owner = 3;
    if (!Number.isNaN(angles[t])) {
      let best = Math.PI / 3;
      peaks.forEach((peak, i) => {
        const apart = Math.abs(
          Math.atan2(Math.sin(angles[t] - peak), Math.cos(angles[t] - peak)),
        );
        if (apart < best) {
          best = apart;
          owner = i;
        }
      });
    }
    groups[owner].push(
      index.getX(t * 3),
      index.getX(t * 3 + 1),
      index.getX(t * 3 + 2),
    );
  }
  const holder = new Group();
  holder.position.copy(mesh.position);
  holder.quaternion.copy(mesh.quaternion);
  holder.scale.copy(mesh.scale);
  groups.forEach((indices, i) => {
    const part = new BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      part.setAttribute(name, attribute);
    }
    part.setIndex(indices);
    const piece = new Mesh(part, mesh.material);
    if (i === 3) {
      holder.add(piece);
      return;
    }
    /* A winding pivots on its own middle. */
    const middle = new Vector3();
    for (const vertex of indices) {
      middle.add(a.fromBufferAttribute(position, vertex));
    }
    middle.divideScalar(indices.length || 1);
    const coil = named(BEAT_NODE.coil, new Group());
    coil.position.copy(middle);
    piece.position.copy(middle).negate();
    coil.add(piece);
    holder.add(coil);
  });
  mesh.parent.add(holder);
  mesh.parent.remove(mesh);
}

/** Where the windings start, as a share of the coils' height. */
const COIL_FLOOR = 0.34;
const COIL_BINS = 24;

function binOf(angle: number) {
  return Math.min(
    Math.floor(((angle + Math.PI) / (Math.PI * 2)) * COIL_BINS),
    COIL_BINS - 1,
  );
}
