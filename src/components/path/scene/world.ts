import {
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
  type Object3D,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import type { PathStepSlug } from "@/data/path.types";

import {
  BOARD,
  LOOP,
  PAWN_HEIGHT,
  PAWN_RADIUS,
  piecesOf,
  pawnSpotOnTile,
  SIDE_PROPS,
  TILE,
  tileCentre,
  tileScale,
} from "./board";
import type { Paint, ToneName } from "./paint";
import { pathSpline } from "./path-spline";
import {
  grassField,
  HOME_RIVERS,
  oracolo,
  quadrell,
  RIVER_WIDTH,
} from "./props";

/* The board itself (v3; the benchmark's §4(b) item 2): the thick board with
   its frame, the tiles' slabs and colour bands, the stepping stones of the
   path between them, the grass, and the pawn. The pieces standing on the
   tiles are `props.ts`'s. */

/** A rounded rectangle, centred. */
function roundedRect(halfWidth: number, halfDepth: number, radius: number) {
  const shape = new Shape();
  const w = halfWidth;
  const d = halfDepth;
  const r = radius;
  shape.moveTo(-w + r, -d);
  shape.lineTo(w - r, -d);
  shape.quadraticCurveTo(w, -d, w, -d + r);
  shape.lineTo(w, d - r);
  shape.quadraticCurveTo(w, d, w - r, d);
  shape.lineTo(-w + r, d);
  shape.quadraticCurveTo(-w, d, -w, d - r);
  shape.lineTo(-w, -d + r);
  shape.quadraticCurveTo(-w, -d, -w + r, -d);
  return shape;
}

/** The chamfered octagon every tile is cut to, centred on its origin. */
function tileShape() {
  const w = TILE.width / 2;
  const d = TILE.depth / 2;
  const c = TILE.chamfer;
  const shape = new Shape();
  shape.moveTo(-w + c, -d);
  shape.lineTo(w - c, -d);
  shape.lineTo(w, -d + c);
  shape.lineTo(w, d - c);
  shape.lineTo(w - c, d);
  shape.lineTo(-w + c, d);
  shape.lineTo(-w, d - c);
  shape.lineTo(-w, -d + c);
  shape.closePath();
  return shape;
}

/** Whether a point in a tile's frame is on its top, `margin` in from its
 *  edge. */
function onTile(x: number, z: number, margin: number) {
  const w = TILE.width / 2 - margin;
  const d = TILE.depth / 2 - margin;
  const c = TILE.chamfer + margin * 0.4;
  return (
    Math.abs(x) <= w &&
    Math.abs(z) <= d &&
    Math.abs(x) + Math.abs(z) <= w + d - c
  );
}

/** A slab `height` tall from a flat shape, its edges bevelled by `bevel`
 *  and its footprint the shape's own; its foot on y = 0. */
function slab(shape: Shape, height: number, bevel: number, segments = 3) {
  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(height - bevel * 2, 0.001),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: segments,
    curveSegments: 10,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  return geometry;
}

/** A mesh that casts and takes shadows. */
function solid(
  geometry: ExtrudeGeometry | RoundedBoxGeometry,
  paint: Paint,
  tone: ToneName,
  grain = false,
) {
  const mesh = new Mesh(geometry, paint.shared(tone, { grain }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Each tile's colour band, in the loop's order: the two inks and their
 *  lighter and deeper shades, alternating warm and cool round the loop. */
const BANDS: Readonly<Record<PathStepSlug, ToneName>> = {
  home: "warm",
  turin: "cool",
  switzerland: "coolLight",
  "cuneo-2022": "warmLight",
  lille: "warmDeep",
  now: "coolDeep",
  next: "warm",
};

/** How deep a tile's band runs in from its front edge, and its inset. */
const BAND = { from: 0.4, to: 0.1, inset: 0.12, height: 0.05 } as const;

/** The board: a thick slab under everything, its top at y = 0, with a
 *  raised frame round its edge, grass across its middle and the two side
 *  props. */
export function makeBoard(paint: Paint): Group {
  const group = new Group();
  const top = solid(
    slab(
      roundedRect(BOARD.halfWidth, BOARD.halfDepth, BOARD.corner),
      BOARD.thickness,
      0.12,
    ),
    paint,
    "boardTop",
    true,
  );
  top.position.y = -BOARD.thickness;
  const outline = roundedRect(BOARD.halfWidth, BOARD.halfDepth, BOARD.corner);
  const inner = roundedRect(
    BOARD.halfWidth - BOARD.frameWidth,
    BOARD.halfDepth - BOARD.frameWidth,
    BOARD.corner - BOARD.frameWidth * 0.6,
  );
  outline.holes.push(inner);
  const frame = solid(slab(outline, BOARD.frameHeight, 0.04), paint, "frame");
  group.add(top, frame);

  /* Grass between the tiles and round the path, not under either. */
  const anchors = LOOP.map((slug) => ({
    centre: tileCentre(slug),
    scale: tileScale(slug),
  }));
  const stones = stonePoints();
  const keepOut = (x: number, z: number) =>
    anchors.some(
      ({ centre: [cx, cz], scale }) =>
        Math.abs(x - cx) < (TILE.width / 2) * scale + 0.1 &&
        Math.abs(z - cz) < (TILE.depth / 2) * scale + 0.1,
    ) ||
    stones.some(({ at }) => Math.hypot(at.x - x, at.z - z) < 0.42) ||
    Object.values(SIDE_PROPS).some(
      (spot) => Math.hypot(spot.x - x, spot.z - z) < 0.75,
    );
  const margin = BOARD.frameWidth + 0.25;
  group.add(
    grassField(
      paint,
      [
        -BOARD.halfWidth + margin,
        -BOARD.halfDepth + margin,
        BOARD.halfWidth - margin,
        BOARD.halfDepth - margin,
      ],
      200,
      keepOut,
      3,
    ),
  );

  const side = [
    [quadrell(paint), SIDE_PROPS.quadrell],
    [oracolo(paint), SIDE_PROPS.oracolo],
  ] as const;
  for (const [object, spot] of side) {
    object.position.set(spot.x, 0, spot.z);
    object.rotation.y = spot.x < 0 ? 0.35 : -0.35;
    group.add(object);
  }
  return group;
}

/** A tile's slab and colour band, and the grass on its free ground, in the
 *  tile's own frame. */
export function makeTileBase(paint: Paint, slug: PathStepSlug): Group {
  const group = new Group();
  group.add(
    solid(slab(tileShape(), TILE.thickness, TILE.bevel), paint, "paper", true),
  );

  const w = TILE.width / 2 - TILE.chamfer - BAND.inset;
  const band = new Shape();
  band.moveTo(-w, -(TILE.depth / 2 - BAND.to));
  band.lineTo(w, -(TILE.depth / 2 - BAND.to));
  band.lineTo(w, -(TILE.depth / 2 - BAND.from));
  band.lineTo(-w, -(TILE.depth / 2 - BAND.from));
  band.closePath();
  /* The shape's y is the board's -z once laid flat: the band runs along
     the front edge. */
  const strip = solid(slab(band, BAND.height, 0.02, 2), paint, BANDS[slug]);
  strip.position.y = TILE.thickness - 0.01;
  group.add(strip);

  const pieces = piecesOf(slug);
  const spot = pawnSpotOnTile(slug);
  const rivers = slug === "home" ? HOME_RIVERS : [];
  const nearRiver = (x: number, z: number) =>
    rivers.some((points) =>
      points.some(([px, pz], i) => {
        const [qx, qz] = points[i + 1] ?? points[i];
        const length = Math.hypot(qx - px, qz - pz) || 1;
        const t = Math.max(
          0,
          Math.min(
            1,
            ((x - px) * (qx - px) + (z - pz) * (qz - pz)) / length ** 2,
          ),
        );
        return (
          Math.hypot(x - (px + (qx - px) * t), z - (pz + (qz - pz) * t)) <
          RIVER_WIDTH * 0.75
        );
      }),
    );
  const keepOut = (x: number, z: number) =>
    !onTile(x, z, 0.18) ||
    z > TILE.depth / 2 - BAND.from - 0.05 ||
    Math.hypot(x - spot.x, z - spot.z) < PAWN_RADIUS + 0.12 ||
    nearRiver(x, z) ||
    pieces.some(
      (piece) =>
        Math.abs(x - piece.x) < piece.w / 2 + 0.06 &&
        Math.abs(z - piece.z) < piece.d / 2 + 0.06,
    );
  const field = grassField(
    paint,
    [-TILE.width / 2, -TILE.depth / 2, TILE.width / 2, TILE.depth / 2],
    46,
    keepOut,
    LOOP.indexOf(slug) + 11,
  );
  field.position.y = TILE.thickness;
  group.add(field);
  return group;
}

let laidStones: readonly { at: Vector3; tangent: Vector3 }[] | undefined;

/** Where the path's stepping stones lie: evenly along the spline, wherever
 *  it is off the tiles, each with the way it runs. Worked out once: the
 *  board's grass keeps off them, and the path lays them. */
function stonePoints() {
  return (laidStones ??= layStones());
}

function layStones() {
  const spline = pathSpline();
  const count = Math.round(spline.getLength() / 0.78);
  const points: { at: Vector3; tangent: Vector3 }[] = [];
  for (let i = 0; i < count; i++) {
    const u = i / count;
    const at = spline.getPointAt(u);
    const onATile = LOOP.some((slug) => {
      const [cx, cz] = tileCentre(slug);
      const scale = tileScale(slug);
      return onTile((at.x - cx) / scale, (at.z - cz) / scale, -0.25);
    });
    if (!onATile) points.push({ at, tangent: spline.getTangentAt(u) });
  }
  return points;
}

/** The path between the tiles: chunky stepping stones along the spline, in
 *  the two inks' light shades by turns. */
export function makePath(paint: Paint): Group {
  const group = new Group();
  const points = stonePoints();
  const geometry = new RoundedBoxGeometry(0.62, 0.16, 0.46, 2, 0.06);
  const tones = ["warmLight", "coolLight"] as const;
  const meshes = tones.map(
    (tone) =>
      new InstancedMesh(
        geometry,
        paint.shared(tone),
        Math.ceil(points.length / 2),
      ),
  );
  const counts = [0, 0];
  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const up = new Vector3(0, 1, 0);
  points.forEach(({ at, tangent }, i) => {
    const which = i % 2;
    rotation.setFromAxisAngle(
      up,
      -Math.atan2(tangent.z, tangent.x) + Math.PI / 2,
    );
    matrix.compose(
      new Vector3(at.x, 0.08, at.z),
      rotation,
      new Vector3(1, 1, 1),
    );
    meshes[which].setMatrixAt(counts[which], matrix);
    counts[which] += 1;
  });
  meshes.forEach((mesh, i) => {
    mesh.count = counts[i];
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  return group;
}

/** The pawn: a turned game piece, lacquered terracotta, with a bevelled
 *  foot, a waist, a collar and a round head. Its foot at the origin. */
export function makePawn(paint: Paint): Object3D {
  const r = PAWN_RADIUS;
  const h = PAWN_HEIGHT;
  const profile = [
    [0, 0],
    [r * 0.96, 0],
    [r, 0.03],
    [r, 0.08],
    [r * 0.93, 0.12],
    [r * 0.72, 0.16],
    [r * 0.5, 0.3],
    [r * 0.36, 0.55],
    [r * 0.3, 0.74],
    [r * 0.55, 0.78],
    [r * 0.56, 0.82],
    [r * 0.3, 0.86],
    [r * 0.3, 0.9],
  ].map(([x, y]) => new Vector2(x, (y / 1) * h));
  /* The head: a ball sitting on the collar. */
  const headCentre = h * 0.9 + r * 0.42;
  for (let i = 1; i <= 10; i++) {
    const angle = -Math.PI / 2 + (Math.PI * i) / 10;
    profile.push(
      new Vector2(
        Math.max(Math.cos(angle) * r * 0.48, i === 10 ? 0 : 0.0001),
        headCentre + Math.sin(angle) * r * 0.48 + (i === 1 ? 0.02 : 0),
      ),
    );
  }
  const pawn = new Mesh(
    new LatheGeometry(profile, 40),
    paint.material({ base: "ink-warm", shade: 0.92 }, { roughness: 0.42 }),
  );
  pawn.castShadow = true;
  pawn.receiveShadow = true;
  /* Scaled so its whole height is `PAWN_HEIGHT`. */
  const top = headCentre + r * 0.48;
  pawn.scale.setScalar(h / top);
  const group = new Group();
  group.add(pawn);
  return group;
}
