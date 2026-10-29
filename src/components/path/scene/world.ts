import {
  CircleGeometry,
  DataTexture,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  RGBAFormat,
  RingGeometry,
  Shape,
  Vector2,
  Vector3,
  type IUniform,
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
import type { MaterialOptions, Paint, ToneName } from "./paint";
import { pathSpline } from "./path-spline";
import { MARKER, SIDE_MODELS } from "./scene-assets";
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
  options: MaterialOptions = {},
) {
  const mesh = new Mesh(geometry, paint.shared(tone, options));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Each tile's colour band, in the loop's order, as a game board's
 *  property colours: the three inks and the felt's green, each step a hue
 *  or a shade of its own, no two neighbours alike. */
const BANDS: Readonly<Record<PathStepSlug, ToneName>> = {
  home: "warm",
  turin: "sun",
  switzerland: "cool",
  "cuneo-2022": "leaf",
  lille: "warmDeep",
  now: "sunDeep",
  next: "coolLight",
};

/** How deep a tile's band runs in from its front edge, and its inset. */
const BAND = { from: 0.4, to: 0.1, inset: 0.12, height: 0.05 } as const;

/** The board: a thick slab under everything, its top at y = 0, with a
 *  raised frame round its edge, grass across its middle and the two side
 *  props. */
/** A phone draws half the grass (§4(f)); the clouds' shadows stay. */
export const PHONE_GRASS_SHARE = 0.5;

/** How many tufts a field of `count` plants on a device drawing `share` of
 *  them. */
export function grassCount(count: number, share: number): number {
  return Math.round(count * share);
}

/** The board's own grass, its side props, its frame and felt; `grassShare`
 *  of the grass a desktop plants. */
export function makeBoard(paint: Paint, grassShare = 1): Group {
  const group = new Group();
  const top = solid(
    slab(
      roundedRect(BOARD.halfWidth, BOARD.halfDepth, BOARD.corner),
      BOARD.thickness,
      0.12,
    ),
    paint,
    "boardTop",
    { felt: true, roughness: 0.96 },
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
      paint.grass,
      [
        -BOARD.halfWidth + margin,
        -BOARD.halfDepth + margin,
        BOARD.halfWidth - margin,
        BOARD.halfDepth - margin,
      ],
      grassCount(200, grassShare),
      keepOut,
      3,
    ),
  );

  const side = [
    [quadrell(paint), SIDE_PROPS.quadrell, SIDE_MODELS.quadrell.model],
    [oracolo(paint), SIDE_PROPS.oracolo, SIDE_MODELS.oracolo.model],
  ] as const;
  for (const [object, spot, name] of side) {
    /* Its holder, named for its model, which takes the model's place once
       it arrives (`toys.ts`). */
    const holder = new Group();
    holder.name = name;
    holder.add(object);
    holder.position.set(spot.x, 0, spot.z);
    holder.rotation.y = spot.x < 0 ? 0.35 : -0.35;
    /* Beside the path: it hops as the pawn passes (`beats.ts`). */
    holder.userData.hopper = true;
    group.add(holder);
  }
  return group;
}

/** A tile's slab and colour band, and the grass on its free ground, in the
 *  tile's own frame. */
/** A tile's slab, band and grass; the grass grows out from `grow` (x, z in
 *  the tile's frame, and its radius) as the tile's landmark rises. */
export function makeTileBase(
  paint: Paint,
  slug: PathStepSlug,
  grow: IUniform<Vector3>,
  grassShare = 1,
): Group {
  const group = new Group();
  group.add(
    solid(slab(tileShape(), TILE.thickness, TILE.bevel), paint, "paper", {
      grain: true,
    }),
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
  /* A band is printed lacquer: a little glossier than the stock. */
  const strip = solid(slab(band, BAND.height, 0.02, 2), paint, BANDS[slug], {
    roughness: 0.55,
  });
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
    paint.tileGrass(grow),
    [-TILE.width / 2, -TILE.depth / 2, TILE.width / 2, TILE.depth / 2],
    grassCount(46, grassShare),
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
  /* The body hops and squashes; its foot's ring and soft contact shadow
     stay on the tile under it, so the pawn is found at a glance, even in
     the air. */
  const body = new Group();
  /* The figure inside the body: what a click or a gesture moves, and what
     the generated figurine replaces. */
  const figure = new Group();
  figure.name = MARKER.figure;
  figure.add(pawn);
  body.add(figure);
  const contact = new Mesh(
    new CircleGeometry(r * 1.5, 40),
    paint.material({ base: "ink-cool", shade: 0.25 }),
  );
  contact.material.alphaMap = softDisc();
  const ring = new Mesh(
    new RingGeometry(r * 1.32, r * 1.58, 48),
    paint.material({ base: "ink-warm" }),
  );
  for (const [index, flat] of [contact, ring].entries()) {
    flat.material.transparent = true;
    flat.material.depthWrite = false;
    flat.material.opacity = index === 0 ? 0.42 : 0.7;
    flat.userData.opacity = flat.material.opacity;
    flat.rotation.x = -Math.PI / 2;
    flat.position.y = 0.012 + index * 0.004;
    flat.renderOrder = 1 + index;
  }
  const group = new Group();
  group.add(contact, ring, body);
  group.userData.pawn = { body, contact, ring } satisfies PawnParts;
  return group;
}

export { MARKER };

/** The buddy's height, against the figure's `PAWN_HEIGHT`. */
export const BUDDY_HEIGHT = 0.62;

/** The figure's buddy, standing in until its model exists: a small robot
 *  of rounded blocks, a head with two eyes and an antenna, travelling
 *  beside the pawn. Its foot at the origin; `body` hops, and the handle
 *  inside it reacts. */
export function makeBuddy(paint: Paint): Object3D {
  const shell = paint.material(
    { base: "paper", toward: "ink-cool", amount: 0.18 },
    { roughness: 0.4 },
  );
  const trim = paint.material({ base: "ink-cool", shade: 0.85 });
  const eye = paint.material({ base: "ink-sun" }, { glow: 0.6 });
  const buddy = new Group();
  buddy.name = MARKER.buddy;
  const round = (
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    material: MeshStandardMaterial,
    radius: number,
  ) => {
    const mesh = new Mesh(
      new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius),
      material,
    );
    mesh.position.set(at[0], at[1] + size[1] / 2, at[2]);
    mesh.castShadow = true;
    return mesh;
  };
  const h = BUDDY_HEIGHT;
  buddy.add(
    /* Two stubby feet, a body, and a head wider than the body. */
    round([0.1, 0.07, 0.14], [-0.07, 0, 0.01], trim, 0.03),
    round([0.1, 0.07, 0.14], [0.07, 0, 0.01], trim, 0.03),
    round([0.28, h * 0.36, 0.22], [0, 0.06, 0], shell, 0.07),
    round([0.36, h * 0.34, 0.28], [0, 0.06 + h * 0.36, 0], shell, 0.09),
    round([0.07, 0.07, 0.02], [-0.08, 0.06 + h * 0.48, 0.14], eye, 0.02),
    round([0.07, 0.07, 0.02], [0.08, 0.06 + h * 0.48, 0.14], eye, 0.02),
    round([0.025, 0.12, 0.025], [0, 0.06 + h * 0.7, 0], trim, 0.01),
    round([0.06, 0.06, 0.06], [0, 0.06 + h * 0.7 + 0.11, 0], eye, 0.03),
  );
  /* Drawn small, then sized up to read beside the figure from the whole
     board's view. */
  buddy.scale.setScalar(1.35);
  const body = new Group();
  body.add(buddy);
  const contact = new Mesh(
    new CircleGeometry(0.34, 32),
    paint.material({ base: "ink-cool", shade: 0.25 }),
  );
  contact.material.alphaMap = softDisc();
  contact.material.transparent = true;
  contact.material.depthWrite = false;
  contact.material.opacity = 0.38;
  contact.userData.opacity = contact.material.opacity;
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.012;
  contact.renderOrder = 1;
  const group = new Group();
  group.add(contact, body);
  group.userData.buddy = { body, contact } satisfies BuddyParts;
  return group;
}

/** The buddy's parts the runtime moves: its body, which hops, and its
 *  contact shadow, which stays on the tile. */
export type BuddyParts = {
  body: Group;
  contact: Mesh<CircleGeometry, MeshStandardMaterial>;
};

/** The pawn's parts the runtime moves: the body, which hops, and the
 *  contact shadow and ring, which stay on the tile and fade as it rises. */
export type PawnParts = {
  body: Object3D;
  contact: Mesh<CircleGeometry, MeshStandardMaterial>;
  ring: Mesh<RingGeometry, MeshStandardMaterial>;
};

/** A disc's alpha, opaque at its centre and gone at its rim: a contact
 *  shadow's softness, with no light to bake it. */
export function softDisc() {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
      const alpha = Math.max(0, 1 - d) ** 1.6;
      data.fill(
        Math.round(alpha * 255),
        (y * size + x) * 4,
        (y * size + x) * 4 + 4,
      );
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
