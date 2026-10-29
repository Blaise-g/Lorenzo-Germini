import {
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  Object3D,
  Path,
  PlaneGeometry,
  Quaternion,
  Shape,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type Material,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import type { Piece } from "./board";
import { handAngle } from "./lille";
import { BEAT_NODE } from "./piece-beats";
import { easeInOut } from "./motion";
import type { Paint } from "./paint";

/* Every code-modelled piece on the board (v3; the benchmark's §4(b) table):
   solid, low-poly and toy-like, with rounded edges, built from three's
   primitives. Each builder returns a group whose origin is the piece's foot,
   centred in its box (`board.ts`), and fills about that box. The landmarks
   here are stand-ins: blocks with each landmark's silhouette, which the
   generated models in `scene-assets.ts` replace where their files are
   there. Nothing here is text. */

export type Built = {
  object: Object3D;
  /** Moves the piece's parts as it rises, `progress` 0 to 1. */
  motion?: (progress: number) => void;
};

type Builder = (paint: Paint, piece: Piece) => Built;

/** `object`, named as a beat finds it (`piece-beats.ts`). */
export function named<T extends Object3D>(name: string, object: T): T {
  object.name = name;
  return object;
}

/** A mesh that casts and takes shadows. */
export function solid(
  geometry: BufferGeometry,
  material: Material,
  at: readonly [number, number, number] = [0, 0, 0],
): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...at);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A rounded block standing on `y`, centred on `x` and `z`. */
export function block(
  material: Material,
  size: readonly [number, number, number],
  at: readonly [number, number, number] = [0, 0, 0],
  radius = 0.04,
): Mesh {
  const [w, h, d] = size;
  const r = Math.min(radius, w / 2.2, h / 2.2, d / 2.2);
  return solid(new RoundedBoxGeometry(w, h, d, 2, r), material, [
    at[0],
    at[1] + h / 2,
    at[2],
  ]);
}

/** A peak: a low-poly cone, with a cap of snow on its top third. */
function peak(
  paint: Paint,
  radius: number,
  height: number,
  at: readonly [number, number, number],
  turn = 0,
): Group {
  const group = new Group();
  const rock = solid(
    new ConeGeometry(radius, height, 6, 1),
    paint.shared("cool", { flat: true }),
    [0, height / 2, 0],
  );
  const capHeight = height * 0.32;
  const cap = solid(
    new ConeGeometry(radius * 0.34, capHeight, 6, 1),
    paint.shared("paper", { flat: true }),
    [0, height - capHeight / 2 + 0.005, 0],
  );
  cap.scale.setScalar(1.02);
  group.add(rock, cap);
  group.position.set(...at);
  group.rotation.y = turn;
  return group;
}

/** A gable roof: a triangular prism `w` long and `d` deep, `h` tall. */
function gable(
  material: Material,
  w: number,
  d: number,
  h: number,
  at: readonly [number, number, number],
): Mesh {
  const shape = new Shape();
  shape.moveTo(-d / 2, 0);
  shape.lineTo(d / 2, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: w,
    bevelEnabled: false,
  });
  /* The profile across z, extruded along x. */
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(w / 2, 0, 0);
  return solid(geometry, material, at);
}

/** A row of windows on a front face at `z`, as small dark panes; given
 *  several materials, the panes take them by turns, so some light by
 *  night and some stay dark. */
function windows(
  material: Material | readonly Material[],
  rows: number,
  columns: number,
  span: readonly [number, number],
  heights: readonly [number, number],
  z: number,
  size: readonly [number, number] = [0.1, 0.14],
): Group {
  const group = new Group();
  const materials = [material].flat();
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x =
        columns === 1
          ? (span[0] + span[1]) / 2
          : span[0] + ((span[1] - span[0]) * column) / (columns - 1);
      const y =
        rows === 1
          ? heights[0]
          : heights[0] + ((heights[1] - heights[0]) * row) / (rows - 1);
      /* Each row cycles through the materials, offset row by row, so a
         lit building is not lit by column: every row of three or more
         panes has one of each. */
      const pick = materials[(column * 2 + row * (row + 1)) % materials.length];
      group.add(block(pick, [size[0], size[1], 0.03], [x, y, z], 0.01));
    }
  }
  return group;
}

/* ─── Trees and grass ─── */

/** A repeatable sequence in [0, 1) from `seed`: a cluster scatters the
 *  same way every time it is built. */
export function seededRandom(seed: number) {
  let state = seed * 9301 + 49297;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/** A tree cluster, instanced: round crowns of a few icospheres on short
 *  trunks, scattered across the piece's box. */
export function treeCluster(paint: Paint, piece: Piece, seed = 1): Built {
  const random = seededRandom(seed);
  const count = 3;
  const crownsPerTree = 3;
  const trunks = new InstancedMesh(
    new CylinderGeometry(0.035, 0.05, 1, 6),
    paint.shared("warmDeep"),
    count,
  );
  const crowns = new InstancedMesh(
    new IcosahedronGeometry(1, 0),
    paint.shared("leaf", { flat: true, sway: true }),
    count * crownsPerTree,
  );
  const darker = new InstancedMesh(
    new IcosahedronGeometry(1, 0),
    paint.shared("leafDark", { flat: true, sway: true }),
    count,
  );
  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const scale = new Vector3();
  const place = new Vector3();
  for (let tree = 0; tree < count; tree++) {
    const angle = (tree / count) * Math.PI * 2 + random();
    const x = Math.cos(angle) * piece.w * 0.13;
    const z = Math.sin(angle) * piece.d * 0.13;
    const height = piece.h * (0.75 + random() * 0.25);
    const trunk = height * 0.38;
    matrix.compose(
      place.set(x, trunk / 2, z),
      rotation.identity(),
      scale.set(1, trunk, 1),
    );
    trunks.setMatrixAt(tree, matrix);
    const crown = (height - trunk) * 0.48;
    for (let i = 0; i < crownsPerTree; i++) {
      const r = crown * (i === 0 ? 1 : 0.72);
      const dx = i === 0 ? 0 : (i === 1 ? -1 : 1) * crown * 0.45;
      const dy = trunk + crown * (i === 0 ? 1 : 0.7);
      rotation.setFromAxisAngle(new Vector3(0, 1, 0), random() * Math.PI);
      matrix.compose(
        place.set(x + dx, dy, z + (random() - 0.5) * crown * 0.4),
        rotation,
        scale.set(r, r * 1.08, r),
      );
      crowns.setMatrixAt(tree * crownsPerTree + i, matrix);
    }
    matrix.compose(
      place.set(x, trunk + crown * 1.75, z),
      rotation,
      scale.setScalar(crown * 0.5),
    );
    darker.setMatrixAt(tree, matrix);
  }
  const group = new Group();
  for (const mesh of [trunks, crowns, darker]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return { object: group };
}

/** One tuft of toy grass: three soft rounded blobs in a clump, about 0.07
 *  tall, its foot at the origin, so it reads as the moulded grass of a
 *  play set, not as dark blades or specks at the wide shot. */
function tuftGeometry(): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const blob = (x: number, z: number, radius: number) => {
    const sphere = new IcosahedronGeometry(1, 1);
    const position = sphere.getAttribute("position");
    const normal = sphere.getAttribute("normal");
    for (let i = 0; i < position.count; i++) {
      /* Squashed to a dome and sunk a little, so it sits on the ground. */
      positions.push(
        x + position.getX(i) * radius,
        Math.max(position.getY(i), -0.3) * radius * 0.8 + radius * 0.3,
        z + position.getZ(i) * radius,
      );
      normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
    }
    sphere.dispose();
  };
  blob(0, 0, 0.05);
  blob(0.045, 0.02, 0.036);
  blob(-0.03, 0.04, 0.032);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  return geometry;
}

/** Tufts of grass scattered over `area` (its own frame, `[x0, z0, x1,
 *  z1]`), keeping out of `keepOut` boxes; instanced, swaying in the vertex
 *  shader, and casting no shadow. */
export function grassField(
  material: Material,
  area: readonly [number, number, number, number],
  count: number,
  keepOut: (x: number, z: number) => boolean,
  seed = 1,
): InstancedMesh {
  let state = seed * 7919 + 104729;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  const mesh = new InstancedMesh(tuftGeometry(), material, count);
  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const place = new Vector3();
  const size = new Vector3();
  let placed = 0;
  /* In clumps, as grass grows: a clump's centre, then tufts close round
     it, the middle ones tallest. */
  for (let tries = 0; placed < count && tries < count * 4; tries++) {
    const cx = area[0] + random() * (area[2] - area[0]);
    const cz = area[1] + random() * (area[3] - area[1]);
    if (keepOut(cx, cz)) continue;
    const tufts = 4 + Math.floor(random() * 5);
    for (let i = 0; i < tufts && placed < count; i++) {
      const angle = random() * Math.PI * 2;
      const reach = Math.sqrt(random()) * 0.22;
      const x = cx + Math.cos(angle) * reach;
      const z = cz + Math.sin(angle) * reach;
      if (keepOut(x, z)) continue;
      const scale = (1.5 - reach * 2.5) * (0.8 + random() * 0.4);
      rotation.setFromAxisAngle(up, random() * Math.PI * 2);
      matrix.compose(place.set(x, 0, z), rotation, size.setScalar(scale));
      mesh.setMatrixAt(placed, matrix);
      placed += 1;
    }
  }
  mesh.count = placed;
  mesh.receiveShadow = true;
  return mesh;
}

/* ─── Water ─── */

/** A ribbon of water along `points` (in the piece's frame, on the tile),
 *  `width` across: UVs run 0–1 along it in x and 0–1 across it in y, for
 *  the water's foam. */
function river(
  paint: Paint,
  points: readonly (readonly [number, number])[],
  width: number,
) {
  const curve = new CatmullRomCurve3(
    points.map(([x, z]) => new Vector3(x, 0, z)),
  );
  const segments = 40;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const at = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const across = new Vector3(-tangent.z, 0, tangent.x).normalize();
    /* Narrower at its source. */
    const half = (width / 2) * (0.6 + 0.4 * t);
    positions.push(
      at.x + across.x * half,
      0,
      at.z + across.z * half,
      at.x - across.x * half,
      0,
      at.z - across.z * half,
    );
    uvs.push(t, 0, t, 1);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  /* Facing up, whichever way the ribbon was wound. */
  geometry.setAttribute(
    "normal",
    new Float32BufferAttribute(
      positions.flatMap((_, i) => (i % 3 === 1 ? [1] : [0])),
      3,
    ),
  );
  geometry.setIndex(indices);
  const mesh = new Mesh(geometry, paint.water);
  mesh.receiveShadow = true;
  return mesh;
}

/* ─── The pieces, tile by tile ─── */

/** Home's two rivers, in the tile's frame: down either flank of the
 *  plateau, meeting in front of it at the tile's front edge. */
export const HOME_RIVERS: readonly (readonly [number, number][])[] = [
  [
    [-1.75, -1.3],
    [-1.45, -0.2],
    [-1.05, 0.75],
    [-0.25, 1.35],
    [0.05, 2.05],
  ],
  [
    [1.75, -1.3],
    [1.5, -0.2],
    [1.0, 0.75],
    [0.25, 1.35],
    [0.05, 2.05],
  ],
];
export const RIVER_WIDTH = 0.32;

const home: Record<string, Builder> = {
  /* The plateau between the two rivers: a wedge, high at the back, the
     rivers running down either flank and meeting in front of it. */
  plateau(paint, piece) {
    const group = new Group();
    const d = piece.d;
    const shape = new Shape();
    shape.moveTo(-d / 2, 0);
    shape.lineTo(d / 2, 0);
    shape.lineTo(d / 2, 0.14);
    shape.lineTo(-d / 2 + 0.1, piece.h - 0.06);
    shape.lineTo(-d / 2, piece.h - 0.06);
    shape.closePath();
    const width = piece.w - 0.5;
    const geometry = new ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelOffset: -0.06,
      bevelSegments: 2,
    });
    /* The profile runs front to back; turned, along z, its high side at
       the back. */
    geometry.rotateY(-Math.PI / 2);
    geometry.translate(width / 2, 0, 0);
    const earth = solid(geometry, paint.shared("warmLight", { flat: true }));
    group.add(earth);
    /* The two rivers, in the tile's frame shifted to the piece's. */
    const shift = (points: readonly (readonly [number, number])[]) =>
      points.map(([x, z]) => [x - piece.x, z - piece.z] as [number, number]);
    const [left, right] = HOME_RIVERS.map((points) =>
      river(paint, shift(points), RIVER_WIDTH),
    );
    left.position.y = right.position.y = 0.012;
    group.add(left, right);
    return { object: group };
  },
  /* The Bisalta: a broad mountain with two summits of about one height. */
  bisalta(paint, piece) {
    const group = new Group();
    const h = piece.h;
    group.add(
      peak(paint, 1.0, h, [-0.5, 0, 0.05], 0.3),
      peak(paint, 0.95, h * 0.93, [0.55, 0, -0.05], 0.8),
      peak(paint, 0.65, h * 0.55, [-1.35, 0, 0.1], 0.1),
      peak(paint, 0.6, h * 0.5, [1.35, 0, 0.12], 0.5),
    );
    group.scale.z = 0.55;
    return { object: group };
  },
  /* The high school, standing in: a two-storey block with a hipped roof,
     rows of windows and an arched door. */
  school(paint, piece) {
    const group = new Group();
    const w = piece.w;
    const d = piece.d * 0.8;
    const wall = 0.58;
    group.add(block(paint.shared("stone"), [w, wall, d], [0, 0, 0], 0.03));
    const roof = solid(
      new ConeGeometry(Math.SQRT1_2, 1, 4, 1),
      paint.shared("warm", { flat: true }),
      [0, wall + 0.17, 0],
    );
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(
      (w + 0.12) * Math.SQRT1_2 * 1.0,
      0.34,
      (d + 0.12) * Math.SQRT1_2,
    );
    group.add(roof);
    group.add(
      windows(
        paint.panes,
        2,
        6,
        [-w / 2 + 0.14, w / 2 - 0.14],
        [0.12, 0.36],
        d / 2,
        [0.09, 0.13],
      ),
    );
    const door = new Shape();
    door.moveTo(-0.09, 0);
    door.lineTo(0.09, 0);
    door.lineTo(0.09, 0.18);
    door.absarc(0, 0.18, 0.09, 0, Math.PI, false);
    door.closePath();
    const doorMesh = solid(
      new ExtrudeGeometry(door, { depth: 0.03, bevelEnabled: false }),
      paint.shared("warmDeep"),
      [0, 0, d / 2 - 0.005],
    );
    group.add(doorMesh);
    return { object: group };
  },
};

const turin: Record<string, Builder> = {
  /* The Mole Antonelliana, standing in: a colonnaded base, a tall square
     dome curving in, a colonnaded lantern and a very tall spire with a
     star. */
  mole(paint, piece) {
    const group = new Group();
    const base = piece.w * 0.78;
    group.add(
      block(paint.shared("stone"), [base, 0.62, base], [0, 0, 0], 0.03),
    );
    const columns = paint.shared("paper");
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const x = -base / 2 + 0.1 + ((base - 0.2) * i) / 4;
        group.add(
          solid(new CylinderGeometry(0.03, 0.03, 0.3, 6), columns, [
            x,
            0.48,
            side * (base / 2 + 0.02),
          ]),
        );
      }
    }
    group.add(
      block(
        paint.shared("warmLight"),
        [base + 0.08, 0.06, base + 0.08],
        [0, 0.62, 0],
        0.02,
      ),
    );
    /* The dome: four sides, concave as they rise. */
    const profile = [
      new Vector2(0.001, 1.25),
      new Vector2(0.12, 1.2),
      new Vector2(0.2, 0.95),
      new Vector2(0.3, 0.6),
      new Vector2(0.42, 0.25),
      new Vector2(0.5, 0),
    ].reverse();
    const dome = solid(
      new LatheGeometry(profile, 4),
      paint.shared("cool", { flat: true }),
      [0, 0.68, 0],
    );
    dome.rotation.y = Math.PI / 4;
    dome.scale.set(Math.SQRT2 * 0.92, 1, Math.SQRT2 * 0.92);
    group.add(dome);
    /* The lantern and its little dome. */
    group.add(
      solid(
        new CylinderGeometry(0.13, 0.15, 0.32, 8),
        paint.shared("paper"),
        [0, 1.98, 0],
      ),
      solid(
        new ConeGeometry(0.16, 0.18, 8),
        paint.shared("cool"),
        [0, 2.23, 0],
      ),
    );
    /* The spire and its star. */
    group.add(
      solid(
        new ConeGeometry(0.05, 0.85, 8),
        paint.shared("paper"),
        [0, 2.74, 0],
      ),
      solid(
        new IcosahedronGeometry(0.07, 0),
        paint.shared("warm", { flat: true }),
        [0, piece.h - 0.07, 0],
      ),
    );
    return { object: group };
  },
  /* Ferraris' coils: three coils stood round a rotor, set 120° apart, as
     his rotating field was made; the rotor spins up as they rise. */
  coils(paint, piece) {
    const group = new Group();
    group.add(
      block(
        paint.shared("stone"),
        [piece.w * 0.9, 0.1, piece.d * 0.9],
        [0, 0, 0],
        0.04,
      ),
    );
    const copper = paint.shared("warm", { roughness: 0.55 });
    const coils: Group[] = [];
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const coil = new Group();
      for (let turn = 0; turn < 3; turn++) {
        const ring = solid(new TorusGeometry(0.17, 0.035, 8, 20), copper, [
          0,
          0,
          (turn - 1) * 0.07,
        ]);
        coil.add(ring);
      }
      coil.position.set(Math.cos(angle) * 0.32, 0.36, Math.sin(angle) * 0.32);
      coil.lookAt(0, 0.36, 0);
      coil.name = BEAT_NODE.coil;
      coils.push(coil);
      group.add(coil);
    }
    const rotor = new Group();
    rotor.add(
      solid(
        new CylinderGeometry(0.09, 0.09, 0.42, 12),
        paint.shared("cool"),
        [0, 0.31, 0],
      ),
      block(paint.shared("coolLight"), [0.3, 0.05, 0.06], [0, 0.42, 0], 0.02),
    );
    rotor.name = BEAT_NODE.rotor;
    group.add(rotor);
    return {
      object: group,
      motion(progress) {
        rotor.rotation.y = easeInOut(progress) * Math.PI * 4;
      },
    };
  },
};

/** The Jet d'Eau's plume: a column of water, thickest at its foot and
 *  widening a little where it breaks at the top. Its foot at the origin.
 *  The generated jetty has none, so the board stands this one off it. */
export function jetPlume(paint: Paint): Mesh {
  const plume = [
    new Vector2(0.001, 0),
    new Vector2(0.07, 0.02),
    new Vector2(0.045, 0.6),
    new Vector2(0.03, 1.6),
    new Vector2(0.05, 2.05),
    new Vector2(0.08, 2.2),
    new Vector2(0.06, 2.3),
    new Vector2(0.001, 2.34),
  ];
  const jet = solid(
    new LatheGeometry(plume, 14),
    paint.material(
      { base: "paper", toward: "ink-cool", amount: 0.08 },
      { roughness: 0.35 },
    ),
  );
  jet.rotation.z = -0.04;
  jet.name = BEAT_NODE.plume;
  return jet;
}

const switzerland: Record<string, Builder> = {
  /* The lake from above Lausanne: still water most of the tile wide. */
  lake(paint, piece) {
    const geometry = new PlaneGeometry(piece.w, piece.d);
    geometry.rotateX(-Math.PI / 2);
    const lake = new Mesh(geometry, paint.water);
    lake.position.y = 0.012;
    lake.receiveShadow = true;
    return { object: lake };
  },
  /* The Chablais across the water: a row of peaks. */
  chablais(paint, piece) {
    const group = new Group();
    const h = piece.h;
    const peaks: [number, number, number][] = [
      [-1.6, 0.6, 0.62],
      [-0.85, 0.75, 0.86],
      [0, 0.7, 1],
      [0.8, 0.8, 0.8],
      [1.6, 0.6, 0.66],
    ];
    peaks.forEach(([x, r, share], i) =>
      group.add(peak(paint, r, h * share, [x, 0, (i % 2) * 0.08], i * 0.7)),
    );
    group.scale.z = 0.5;
    return { object: group };
  },
  sailboat(paint) {
    const group = new Group();
    const hull = new Shape();
    hull.moveTo(-0.24, 0.08);
    hull.lineTo(0.24, 0.08);
    hull.quadraticCurveTo(0.2, 0, 0.12, 0);
    hull.lineTo(-0.16, 0);
    hull.closePath();
    const hullGeometry = new ExtrudeGeometry(hull, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    hullGeometry.translate(0, 0, -0.06);
    group.add(solid(hullGeometry, paint.shared("warm")));
    group.add(
      solid(
        new CylinderGeometry(0.012, 0.012, 0.6, 6),
        paint.shared("warmDeep"),
        [0, 0.38, 0],
      ),
    );
    const sail = new Shape();
    sail.moveTo(0.02, 0.12);
    sail.lineTo(0.24, 0.12);
    sail.lineTo(0.02, 0.66);
    sail.closePath();
    group.add(
      solid(
        new ExtrudeGeometry(sail, { depth: 0.012, bevelEnabled: false }),
        paint.shared("paper"),
        [0, 0, -0.006],
      ),
    );
    group.position.y = 0.02;
    group.rotation.y = -0.4;
    return { object: group };
  },
  /* The Jet d'Eau's jetty, standing in: a stone jetty out into the lake, a
     small light at its end, and the plume standing tall off it. */
  "jet-d-eau"(paint, piece) {
    const group = new Group();
    group.add(
      block(paint.shared("stone"), [0.2, 0.08, piece.d], [0, 0, 0.05], 0.02),
      solid(new CylinderGeometry(0.06, 0.07, 0.28, 10), paint.shared("paper"), [
        0,
        0.22,
        -piece.d / 2 + 0.15,
      ]),
      solid(new ConeGeometry(0.075, 0.1, 10), paint.shared("warm"), [
        0,
        0.41,
        -piece.d / 2 + 0.15,
      ]),
    );
    const jet = jetPlume(paint);
    jet.position.set(0.18, 0.02, 0.1);
    group.add(jet);
    return { object: group };
  },
  /* Roche's dial: a gauge on a post, its needle sweeping as it rises. */
  "roche-dial"(paint, piece) {
    const group = new Group();
    group.add(
      block(paint.shared("stone"), [0.42, 0.08, 0.26], [0, 0, 0], 0.03),
      solid(
        new CylinderGeometry(0.035, 0.04, 0.5, 8),
        paint.shared("cool"),
        [0, 0.32, 0],
      ),
    );
    const face = new Group();
    face.position.set(0, piece.h - 0.3, 0);
    const disc = solid(
      new CylinderGeometry(0.26, 0.26, 0.06, 28),
      paint.shared("paper"),
    );
    disc.rotation.x = Math.PI / 2;
    const rim = solid(
      new TorusGeometry(0.26, 0.035, 8, 28),
      paint.shared("warm", { roughness: 0.6 }),
    );
    face.add(disc, rim);
    for (let i = 0; i <= 6; i++) {
      const angle = Math.PI * (1.2 - (i / 6) * 1.4);
      const tick = block(
        paint.shared("cool"),
        [0.018, 0.06, 0.01],
        [0, 0, 0],
        0.004,
      );
      tick.position.set(
        Math.cos(angle) * 0.19,
        Math.sin(angle) * 0.19 - 0.03,
        0.035,
      );
      tick.rotation.z = angle - Math.PI / 2;
      face.add(tick);
    }
    const needle = new Group();
    needle.name = BEAT_NODE.needle;
    needle.position.z = 0.04;
    needle.add(
      block(paint.shared("warmDeep"), [0.02, 0.2, 0.012], [0, 0, 0], 0.005),
    );
    needle.add(
      solid(
        new CylinderGeometry(0.03, 0.03, 0.02, 12),
        paint.shared("cool"),
        [0, 0, 0],
      ),
    );
    (needle.children[1] as Mesh).rotation.x = Math.PI / 2;
    face.add(needle);
    group.add(face);
    const from = Math.PI * 0.62;
    const to = -Math.PI * 0.45;
    return {
      object: group,
      motion(progress) {
        needle.rotation.z = from + (to - from) * easeInOut(progress);
      },
    };
  },
};

const cuneo2022: Record<string, Builder> = {
  /* The schoolroom, standing in: a room with its front wall cut away, a
     blackboard with nothing on it, the teacher's desk and rows of desks. */
  schoolroom(paint, piece) {
    const group = new Group();
    const { w, d } = piece;
    const wallHeight = 1.0;
    const wall = paint.shared("stone");
    group.add(
      block(paint.shared("warmLight"), [w, 0.06, d], [0, 0, 0], 0.02),
      block(wall, [w, wallHeight, 0.12], [0, 0, -d / 2 + 0.06], 0.03),
      block(wall, [0.12, wallHeight, d], [-w / 2 + 0.06, 0, 0], 0.03),
      block(wall, [0.12, wallHeight, d], [w / 2 - 0.06, 0, 0], 0.03),
    );
    /* Windows down the side walls, cut as dark panes, lit by night. */
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const pane = block(
          paint.panes[(i + (side > 0 ? 1 : 0)) % paint.panes.length],
          [0.03, 0.42, 0.28],
          [side * (w / 2 + 0.005), 0.38, -d / 2 + 0.4 + i * 0.5],
          0.01,
        );
        group.add(pane);
      }
    }
    /* The roof over the back half only, so the room shows. */
    const roof = gable(
      paint.shared("warm", { flat: true }),
      w + 0.1,
      d * 0.62,
      0.55,
      [0, wallHeight, -d * 0.19],
    );
    group.add(roof);
    group.add(
      block(
        paint.shared("coolDeep"),
        [w * 0.5, 0.42, 0.04],
        [0, 0.38, -d / 2 + 0.14],
        0.01,
      ),
      block(
        paint.shared("warmDeep"),
        [w * 0.54, 0.04, 0.05],
        [0, 0.34, -d / 2 + 0.17],
        0.01,
      ),
      block(
        paint.shared("warm"),
        [0.55, 0.3, 0.3],
        [-0.6, 0.06, -d / 2 + 0.5],
        0.03,
      ),
    );
    const desk = paint.shared("warmLight");
    for (let row = 0; row < 2; row++) {
      for (let column = 0; column < 3; column++) {
        group.add(
          block(
            desk,
            [0.36, 0.2, 0.22],
            [-0.7 + column * 0.7, 0.06, 0.05 + row * 0.42],
            0.02,
          ),
        );
      }
    }
    return { object: group };
  },
  /* The MVP window: a frame, two shutters and glass, standing on a stub of
     wall. Unlit, and with nothing written on it. */
  "mvp-window"(paint, piece) {
    const group = new Group();
    const { w, h } = piece;
    group.add(
      block(paint.shared("stone"), [w, h * 0.92, 0.16], [0, 0, -0.04], 0.03),
    );
    const frame = paint.shared("warm");
    const fw = 0.4;
    const fh = 0.58;
    const y0 = 0.22;
    group.add(
      block(frame, [fw + 0.08, 0.05, 0.08], [0, y0 - 0.05, 0.05], 0.015),
      block(frame, [fw + 0.08, 0.05, 0.08], [0, y0 + fh, 0.05], 0.015),
      block(frame, [0.05, fh, 0.08], [-fw / 2, y0, 0.05], 0.015),
      block(frame, [0.05, fh, 0.08], [fw / 2, y0, 0.05], 0.015),
      block(frame, [0.025, fh, 0.05], [0, y0, 0.05], 0.01),
    );
    const glass = paint.material(
      { base: "ink-cool", toward: "paper", amount: 0.2, shade: 0.7 },
      { roughness: 0.2, glow: 0.05 },
    );
    const pane = block(glass, [fw, fh, 0.02], [0, y0, 0.03], 0.005);
    pane.name = BEAT_NODE.glass;
    group.add(pane);
    const shutter = paint.shared("coolLight");
    const OPEN = 1.95;
    for (const side of [-1, 1]) {
      const hinge = new Group();
      hinge.position.set(side * (fw / 2 + 0.03), y0, 0.09);
      const leaf = block(
        shutter,
        [fw / 2, fh, 0.03],
        [side * (fw / 4), 0, 0],
        0.012,
      );
      for (let slat = 0; slat < 5; slat++) {
        leaf.add(
          block(
            paint.shared("cool"),
            [fw / 2 - 0.04, 0.015, 0.015],
            [0, -fh / 2 + 0.08 + slat * 0.1, 0.02],
            0.004,
          ),
        );
      }
      hinge.add(leaf);
      hinge.rotation.y = side * OPEN;
      hinge.name = BEAT_NODE.shutter;
      group.add(hinge);
    }
    return { object: group };
  },
};

const lille: Record<string, Builder> = {
  /* The Chamber of Commerce belfry, standing in: a slender square brick
     tower banded in stone, a clock near the top, then the tiered lantern
     and its spire. */
  belfry(paint, piece) {
    const group = new Group();
    const s = piece.w * 0.72;
    const brick = paint.shared("warm");
    const stone = paint.shared("stone");
    group.add(block(stone, [s + 0.1, 0.18, s + 0.1], [0, 0, 0], 0.03));
    group.add(block(brick, [s, 2.0, s], [0, 0.18, 0], 0.03));
    for (const y of [0.7, 1.3, 1.95]) {
      group.add(block(stone, [s + 0.05, 0.05, s + 0.05], [0, y, 0], 0.015));
    }
    /* Tall slit windows. */
    group.add(
      windows(
        paint.panes,
        2,
        2,
        [-0.12, 0.12],
        [0.45, 1.05],
        s / 2,
        [0.07, 0.26],
      ),
    );
    /* The clock, on the two faces that show: its disc's axis out of each. */
    const front = solid(new CylinderGeometry(0.16, 0.16, 0.03, 24), stone, [
      0,
      1.65,
      s / 2 + 0.01,
    ]);
    front.rotation.x = Math.PI / 2;
    const side = solid(new CylinderGeometry(0.16, 0.16, 0.03, 24), stone, [
      s / 2 + 0.01,
      1.65,
      0,
    ]);
    side.rotation.z = Math.PI / 2;
    group.add(front, side);
    group.add(block(brick, [s * 0.82, 0.45, s * 0.82], [0, 2.18, 0], 0.03));
    group.add(block(stone, [s * 0.9, 0.05, s * 0.9], [0, 2.6, 0], 0.015));
    group.add(
      solid(new CylinderGeometry(0.17, 0.2, 0.3, 8), stone, [0, 2.8, 0]),
      solid(
        new CylinderGeometry(0.11, 0.15, 0.16, 8),
        paint.shared("cool"),
        [0, 3.03, 0],
      ),
      solid(
        new ConeGeometry(0.11, piece.h - 3.11, 8),
        paint.shared("cool", { flat: true }),
        [0, 3.11 + (piece.h - 3.11) / 2, 0],
      ),
    );
    return { object: group };
  },
  /* The Vieille Bourse, standing in: a row of brick house fronts with steep
     slate roofs and dormers, an arcade of round arches along the court in
     front, and a small campanile in the middle. */
  courtyard(paint, piece) {
    const group = new Group();
    const { w, d } = piece;
    const brick = paint.shared("warm");
    const slate = paint.shared("cool", { flat: true });
    const stone = paint.shared("stone");
    const houseDepth = d * 0.55;
    group.add(
      block(
        brick,
        [w, 0.72, houseDepth],
        [0, 0, -d / 2 + houseDepth / 2],
        0.03,
      ),
    );
    group.add(
      gable(slate, w, houseDepth + 0.06, 0.42, [
        0,
        0.72,
        -d / 2 + houseDepth / 2,
      ]),
    );
    for (let i = 0; i < 4; i++) {
      const x = -w / 2 + 0.35 + i * ((w - 0.7) / 3);
      group.add(
        block(
          stone,
          [0.16, 0.14, 0.12],
          [x, 0.82, -d / 2 + houseDepth - 0.05],
          0.02,
        ),
      );
      group.add(
        gable(slate, 0.18, 0.14, 0.09, [x, 0.96, -d / 2 + houseDepth - 0.05]),
      );
    }
    group.add(
      windows(
        paint.panes,
        2,
        8,
        [-w / 2 + 0.18, w / 2 - 0.18],
        [0.12, 0.42],
        -d / 2 + houseDepth,
        [0.1, 0.16],
      ),
    );
    /* The arcade: a stone front with round arches cut through it. */
    const arcade = new Shape();
    const ah = 0.52;
    arcade.moveTo(-w / 2, 0);
    arcade.lineTo(w / 2, 0);
    arcade.lineTo(w / 2, ah);
    arcade.lineTo(-w / 2, ah);
    arcade.closePath();
    const arches = 7;
    const span = w / arches;
    for (let i = 0; i < arches; i++) {
      const cx = -w / 2 + span * (i + 0.5);
      const r = span * 0.32;
      const hole = new Path();
      hole.moveTo(cx - r, 0.0001);
      hole.lineTo(cx + r, 0.0001);
      hole.lineTo(cx + r, 0.24);
      hole.absarc(cx, 0.24, r, 0, Math.PI, false);
      hole.closePath();
      arcade.holes.push(hole);
    }
    const front = solid(
      new ExtrudeGeometry(arcade, {
        depth: 0.14,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.015,
        bevelSegments: 1,
      }),
      stone,
      [0, 0, d / 2 - 0.16],
    );
    group.add(front);
    group.add(block(brick, [w, 0.14, 0.18], [0, ah, d / 2 - 0.1], 0.02));
    /* The court between them, paved. */
    group.add(
      block(
        paint.shared("warmLight"),
        [w - 0.1, 0.03, d - houseDepth],
        [0, 0, d / 2 - (d - houseDepth) / 2],
        0.01,
      ),
    );
    /* The campanile. */
    group.add(
      block(brick, [0.26, 0.5, 0.26], [0, 1.0, -d / 2 + houseDepth / 2], 0.02),
    );
    group.add(
      solid(new ConeGeometry(0.2, 0.22, 4), slate, [
        0,
        1.61,
        -d / 2 + houseDepth / 2,
      ]),
    );
    (group.children.at(-1) as Mesh).rotation.y = Math.PI / 4;
    return { object: group };
  },
  /* The pipe loop: one run of pipe round a closed circuit, on supports,
     with flanged joints and a valve wheel. */
  "pipe-loop"(paint, piece) {
    const group = new Group();
    const hw = piece.w / 2 - 0.1;
    const hd = piece.d / 2 - 0.12;
    const y = 0.26;
    const path = new CatmullRomCurve3(
      [
        [-hw, -hd],
        [0, -hd - 0.04],
        [hw, -hd],
        [hw + 0.06, 0],
        [hw, hd],
        [0, hd + 0.04],
        [-hw, hd],
        [-hw - 0.06, 0],
      ].map(([x, z]) => new Vector3(x, y, z)),
      true,
      "centripetal",
    );
    const tube = solid(
      new TubeGeometry(path, 96, 0.055, 12, true),
      paint.pipeFlow,
    );
    tube.name = BEAT_NODE.pipe;
    group.add(tube);
    const flange = paint.shared("warmDeep", { roughness: 0.55 });
    const support = paint.shared("cool");
    for (let i = 0; i < 8; i++) {
      const t = (i + 0.5) / 8;
      const at = path.getPoint(t);
      const tangent = path.getTangent(t);
      const ring = solid(new TorusGeometry(0.065, 0.022, 6, 16), flange, [
        at.x,
        at.y,
        at.z,
      ]);
      ring.lookAt(at.clone().add(tangent));
      group.add(ring);
      if (i % 2 === 0) {
        group.add(
          block(support, [0.06, y - 0.05, 0.12], [at.x, 0, at.z], 0.015),
        );
      }
    }
    const valve = path.getPoint(0.125);
    const wheel = solid(
      new TorusGeometry(0.09, 0.016, 6, 20),
      paint.shared("cool"),
      [valve.x, y + 0.2, valve.z],
    );
    wheel.rotation.x = Math.PI / 2;
    group.add(
      solid(new CylinderGeometry(0.018, 0.018, 0.2, 6), support, [
        valve.x,
        y + 0.1,
        valve.z,
      ]),
      wheel,
    );
    return { object: group };
  },
  /* The clock face on its post: ticks and no numerals, its hand sweeping to
     its mark as it rises. */
  "clock-face"(paint, piece) {
    const group = new Group();
    group.add(
      block(paint.shared("stone"), [0.34, 0.07, 0.24], [0, 0, 0], 0.03),
      solid(
        new CylinderGeometry(0.035, 0.04, 0.6, 8),
        paint.shared("cool"),
        [0, 0.37, 0],
      ),
    );
    const face = new Group();
    face.position.set(0, piece.h - 0.3, 0);
    const disc = solid(
      new CylinderGeometry(0.27, 0.27, 0.07, 32),
      paint.shared("paper"),
    );
    disc.rotation.x = Math.PI / 2;
    const rim = solid(
      new TorusGeometry(0.27, 0.035, 8, 32),
      paint.shared("warm", { roughness: 0.6 }),
    );
    face.add(disc, rim);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const long = i % 3 === 0;
      const tick = block(
        paint.shared("cool"),
        [0.02, long ? 0.07 : 0.04, 0.01],
        [0, 0, 0],
        0.004,
      );
      tick.position.set(
        Math.sin(angle) * 0.2,
        Math.cos(angle) * 0.2 - (long ? 0.035 : 0.02),
        0.04,
      );
      tick.rotation.z = -angle;
      face.add(tick);
    }
    const hand = new Group();
    hand.name = BEAT_NODE.hand;
    hand.position.z = 0.045;
    hand.add(
      block(
        paint.shared("warmDeep"),
        [0.024, 0.19, 0.012],
        [0, -0.02, 0],
        0.006,
      ),
    );
    face.add(hand);
    group.add(face);
    return {
      object: group,
      motion(progress) {
        hand.rotation.z = handAngle(progress);
      },
    };
  },
};

const now: Record<string, Builder> = {
  /* The office, standing in: a low modern block with a grid of glass and a
     flat roof. */
  office(paint, piece) {
    const group = new Group();
    const { w, d } = piece;
    const walls = paint.shared("stone");
    const glass = paint.material(
      { base: "ink-cool", toward: "paper", amount: 0.3 },
      { roughness: 0.25, lamp: 2.4 },
    );
    group.add(block(walls, [w, 1.18, d * 0.8], [0, 0, -d * 0.1], 0.04));
    group.add(
      block(
        paint.shared("coolLight"),
        [w + 0.08, 0.08, d * 0.8 + 0.08],
        [0, 1.18, -d * 0.1],
        0.03,
      ),
    );
    group.add(
      block(walls, [w * 0.3, 0.3, d * 0.4], [w * 0.22, 1.26, -d * 0.2], 0.03),
    );
    for (let row = 0; row < 3; row++) {
      group.add(
        block(
          glass,
          [w - 0.2, 0.24, 0.03],
          [0, 0.12 + row * 0.34, d * 0.3 + 0.005],
          0.01,
        ),
      );
      for (let column = 0; column < 7; column++) {
        group.add(
          block(
            walls,
            [0.03, 0.26, 0.04],
            [
              -w / 2 + 0.1 + ((w - 0.2) * column) / 6,
              0.11 + row * 0.34,
              d * 0.3 + 0.01,
            ],
            0.008,
          ),
        );
      }
    }
    group.add(
      block(
        paint.shared("warm"),
        [0.6, 0.05, 0.3],
        [-w * 0.25, 0.3, d * 0.3 + 0.15],
        0.02,
      ),
    );
    return { object: group };
  },
  /* The startup's desk: a desk, its monitor, a lamp. */
  "startup-desk"(paint, piece) {
    const group = new Group();
    const { w, d } = piece;
    const wood = paint.shared("warmLight");
    const legs = paint.shared("cool");
    const top = 0.5;
    group.add(block(wood, [w * 0.9, 0.06, d * 0.7], [0, top, 0], 0.025));
    for (const [x, z] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      group.add(
        solid(new CylinderGeometry(0.025, 0.025, top, 8), legs, [
          x * (w * 0.42),
          top / 2,
          z * (d * 0.3),
        ]),
      );
    }
    const screen = paint.material(
      { base: "ink-cool", toward: "paper", amount: 0.55 },
      { roughness: 0.3, glow: 0.35, lamp: 2.6 },
    );
    group.add(
      block(
        paint.shared("coolDeep"),
        [0.12, 0.02, 0.1],
        [0.05, top + 0.06, -0.1],
        0.01,
      ),
      solid(
        new CylinderGeometry(0.015, 0.015, 0.14, 6),
        paint.shared("coolDeep"),
        [0.05, top + 0.14, -0.12],
      ),
      block(
        paint.shared("coolDeep"),
        [0.62, 0.38, 0.04],
        [0.05, top + 0.18, -0.13],
        0.015,
      ),
      named(
        BEAT_NODE.screen,
        block(screen, [0.56, 0.32, 0.01], [0.05, top + 0.21, -0.105], 0.004),
      ),
    );
    /* The lamp: a foot, two arms and a shade. */
    const lamp = paint.shared("warm", { roughness: 0.6 });
    const lampFoot = new Vector3(-w * 0.34, top + 0.06, -0.08);
    group.add(
      solid(
        new CylinderGeometry(0.07, 0.08, 0.025, 16),
        lamp,
        lampFoot.toArray(),
      ),
    );
    const lower = solid(new CylinderGeometry(0.012, 0.012, 0.3, 6), lamp, [
      lampFoot.x + 0.04,
      top + 0.2,
      lampFoot.z,
    ]);
    lower.rotation.z = -0.3;
    const upper = solid(new CylinderGeometry(0.012, 0.012, 0.24, 6), lamp, [
      lampFoot.x + 0.15,
      top + 0.38,
      lampFoot.z,
    ]);
    upper.rotation.z = 1.1;
    const shade = solid(
      new ConeGeometry(0.08, 0.12, 14, 1, true),
      paint.shared("warm", { roughness: 0.6, doubleSided: true }),
      [lampFoot.x + 0.26, top + 0.38, lampFoot.z],
    );
    shade.rotation.z = 0.5;
    group.add(lower, upper, shade);
    /* A chair, pushed in. */
    group.add(
      block(
        paint.shared("cool"),
        [0.34, 0.05, 0.3],
        [0.05, 0.3, d * 0.42],
        0.02,
      ),
      block(
        paint.shared("cool"),
        [0.34, 0.32, 0.05],
        [0.05, 0.33, d * 0.56],
        0.02,
      ),
      solid(new CylinderGeometry(0.02, 0.02, 0.3, 6), legs, [
        0.05,
        0.15,
        d * 0.42,
      ]),
    );
    return { object: group };
  },
};

const next: Record<string, Builder> = {
  /* The blank prop: a plinth with five empty clue slots along its top. */
  blank(paint, piece) {
    const group = new Group();
    const { w, d } = piece;
    group.add(block(paint.shared("coolLight"), [w, 0.12, d], [0, 0, 0], 0.04));
    group.add(
      block(
        paint.shared("paper"),
        [w - 0.2, 0.5, d - 0.25],
        [0, 0.12, 0],
        0.06,
      ),
    );
    const slot = paint.shared("coolDeep");
    const rim = paint.shared("warm");
    const pitch = (w - 0.5) / 4;
    for (let i = 0; i < 5; i++) {
      const x = -(w - 0.5) / 2 + i * pitch;
      const each = new Group();
      each.name = BEAT_NODE.slot;
      each.position.set(x, 0, 0);
      each.add(block(rim, [0.36, 0.035, 0.36], [0, 0.62, 0], 0.012));
      each.add(block(slot, [0.28, 0.03, 0.28], [0, 0.635, 0], 0.01));
      group.add(each);
    }
    return { object: group };
  },
};

const BUILDERS: Record<string, Record<string, Builder>> = {
  home,
  turin,
  switzerland,
  "cuneo-2022": cuneo2022,
  lille,
  now,
  next,
};

/** Builds `piece` on `step`'s tile: trees from the cluster, the rest by
 *  their builder. */
export function buildPiece(
  paint: Paint,
  step: string,
  piece: Piece,
  seed: number,
): Built {
  if (piece.id.startsWith("trees")) return treeCluster(paint, piece, seed);
  const builder = BUILDERS[step]?.[piece.id];
  if (!builder) throw new Error(`No builder for ${step}'s ${piece.id}`);
  return builder(paint, piece);
}

/* ─── The side props ─── */

/** Quadrell: four rounded blocks set as a square, a studio's building
 *  bricks, on a low base. */
export function quadrell(paint: Paint): Object3D {
  const group = new Group();
  group.add(block(paint.shared("paper"), [0.95, 0.1, 0.95], [0, 0, 0], 0.04));
  const tones = ["warm", "cool", "cool", "warm"] as const;
  tones.forEach((tone, i) => {
    const x = (i % 2) - 0.5;
    const z = Math.floor(i / 2) - 0.5;
    group.add(
      block(
        paint.shared(tone),
        [0.36, 0.36, 0.36],
        [x * 0.4, 0.1, z * 0.4],
        0.07,
      ),
    );
  });
  return group;
}

/** L'Oracolo della Ghigliottina: a small guillotine frame, two uprights, a
 *  crossbar and its slanted blade, on a base. */
export function oracolo(paint: Paint): Object3D {
  const group = new Group();
  const wood = paint.shared("warm");
  group.add(block(paint.shared("warmDeep"), [0.8, 0.1, 0.4], [0, 0, 0], 0.03));
  group.add(
    block(wood, [0.09, 1.0, 0.11], [-0.24, 0.1, 0], 0.02),
    block(wood, [0.09, 1.0, 0.11], [0.24, 0.1, 0], 0.02),
    block(wood, [0.62, 0.09, 0.14], [0, 1.08, 0], 0.02),
  );
  const blade = new Shape();
  blade.moveTo(-0.19, 0);
  blade.lineTo(0.19, 0.12);
  blade.lineTo(0.19, 0.28);
  blade.lineTo(-0.19, 0.28);
  blade.closePath();
  group.add(
    solid(
      new ExtrudeGeometry(blade, { depth: 0.025, bevelEnabled: false }),
      paint.shared("coolLight", { roughness: 0.4, metalness: 0.2 }),
      [0, 0.68, -0.012],
    ),
  );
  group.add(block(paint.shared("cool"), [0.4, 0.06, 0.05], [0, 0.3, 0], 0.015));
  return group;
}
