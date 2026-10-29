import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";

/* The board's layout (v3, a solid tabletop board): seven thick tiles on a
   closed loop in the data's order, home at the back and Lille, the other
   hero, at the front, with "?" closing the loop beside home. Every piece
   standing on a tile is placed here as a box, so the camera, the pawn's spot
   and a spec all read one layout, without three.js or a browser. Units are
   scene units: a tile is about 4.5 across, and y is up from the tile's top
   face. Everything sits on one board, whose top is the table's y = 0. */

/** The loop, in the data's order. */
export const LOOP: readonly PathStepSlug[] = PATH_STEPS.map(
  (step) => step.slug,
);

/** The hero tiles: a size up, with their full scenes. */
export const HERO_STEPS: readonly PathStepSlug[] = ["home", "lille"];
export const HERO_SCALE = 1.16;

/** A tile's slab, before its scale: a chamfered octagon, thick and
 *  bevelled, as a chunky game tile is. `thickness` is the slab's height
 *  with its bevel. */
export const TILE = {
  width: 4.5,
  depth: 4.3,
  chamfer: 0.5,
  thickness: 0.42,
  bevel: 0.07,
} as const;

/** The loop's half-widths across and in depth. */
export const LOOP_RADII = { x: 9.2, z: 6.7 } as const;

/** The board under the tiles: a bevelled slab with a raised frame round
 *  its edge, its top at y = 0 and the table under it. */
export const BOARD = {
  halfWidth: 12.9,
  halfDepth: 10.1,
  corner: 1.4,
  thickness: 0.55,
  frameWidth: 0.55,
  frameHeight: 0.2,
} as const;

/** The step whose tile is front and centre. */
const FRONT_STEP: PathStepSlug = "lille";

export function tileScale(slug: PathStepSlug): number {
  return HERO_STEPS.includes(slug) ? HERO_SCALE : 1;
}

/** A tile's centre on the table, `[x, z]`: on an ellipse, clockwise as the
 *  visitor sees it, the front step nearest them. */
export function tileCentre(slug: PathStepSlug): readonly [number, number] {
  const index = LOOP.indexOf(slug);
  const front = LOOP.indexOf(FRONT_STEP);
  const angle = Math.PI / 2 + ((index - front) * 2 * Math.PI) / LOOP.length;
  return [LOOP_RADII.x * Math.cos(angle), LOOP_RADII.z * Math.sin(angle)];
}

/** One piece standing on a tile, as the box it fills in the tile's own
 *  frame: centred on `x`, `z`, from `y` (default 0, the tile's top) up `h`.
 *  `prop` is the data's prop id it builds with (`PathProp.id`); scenery such
 *  as trees names none and builds with the tile's first prop. */
export type Piece = Readonly<{
  id: string;
  prop: string | null;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  y?: number;
}>;

export type TileLayout = Readonly<{
  /** Where the pawn stands on the tile, clear of every piece. */
  pawn: Readonly<{ x: number; z: number }>;
  pieces: readonly Piece[];
}>;

/* Front is +z, toward the visitor; the backdrops stand at the back so the
   landmark and the pawn are never behind them. */
export const LAYOUT: Readonly<Record<PathStepSlug, TileLayout>> = {
  home: {
    pawn: { x: 1.4, z: 1.3 },
    pieces: [
      { id: "plateau", prop: "plateau", x: 0, z: -0.2, w: 2.5, d: 1.7, h: 0.5 },
      { id: "bisalta", prop: "bisalta", x: 0, z: -1.6, w: 4, d: 1.1, h: 1.75 },
      {
        id: "school",
        prop: "school",
        x: -0.1,
        z: -0.15,
        w: 1.3,
        d: 1.0,
        h: 0.95,
        y: 0.4,
      },
      { id: "trees", prop: null, x: -1.55, z: 1.0, w: 0.9, d: 0.9, h: 1.05 },
    ],
  },
  turin: {
    pawn: { x: 1.25, z: 1.25 },
    pieces: [
      { id: "mole", prop: "mole", x: -0.45, z: -0.55, w: 1.2, d: 1.2, h: 3.3 },
      { id: "coils", prop: "coils", x: 1.0, z: -0.25, w: 1.1, d: 0.9, h: 1.0 },
      { id: "trees", prop: null, x: -1.55, z: 1.0, w: 0.75, d: 0.75, h: 0.95 },
      {
        id: "trees-back",
        prop: null,
        x: 1.5,
        z: -1.45,
        w: 0.7,
        d: 0.7,
        h: 0.9,
      },
    ],
  },
  switzerland: {
    pawn: { x: 1.35, z: 1.3 },
    pieces: [
      { id: "lake", prop: "lake", x: 0, z: -0.65, w: 4.0, d: 2.2, h: 0.05 },
      { id: "chablais", prop: "lake", x: 0, z: -1.7, w: 4.3, d: 0.8, h: 1.25 },
      {
        id: "sailboat",
        prop: "lake",
        x: -0.9,
        z: -0.45,
        w: 0.5,
        d: 0.3,
        h: 0.7,
      },
      {
        id: "jet-d-eau",
        prop: "jet-d-eau",
        x: 0.75,
        z: -0.55,
        w: 0.5,
        d: 1.1,
        h: 2.6,
      },
      {
        id: "roche-dial",
        prop: "roche-dial",
        x: -1.35,
        z: 1.0,
        w: 0.65,
        d: 0.35,
        h: 0.95,
      },
    ],
  },
  "cuneo-2022": {
    pawn: { x: 0.55, z: 1.3 },
    pieces: [
      {
        id: "schoolroom",
        prop: "schoolroom",
        x: -0.3,
        z: -0.6,
        w: 3.0,
        d: 1.8,
        h: 1.6,
      },
      {
        id: "mvp-window",
        prop: "mvp-window",
        x: 1.55,
        z: 0.35,
        w: 0.85,
        d: 0.3,
        h: 1.15,
      },
      { id: "trees", prop: null, x: -1.65, z: 1.1, w: 0.75, d: 0.75, h: 0.95 },
    ],
  },
  lille: {
    pawn: { x: 1.65, z: 1.3 },
    pieces: [
      {
        id: "belfry",
        prop: "belfry",
        x: -1.45,
        z: -0.85,
        w: 0.8,
        d: 0.8,
        h: 3.5,
      },
      {
        id: "courtyard",
        prop: "courtyard",
        x: 0.55,
        z: -0.85,
        w: 2.6,
        d: 1.4,
        h: 1.75,
      },
      {
        id: "pipe-loop",
        prop: "pipe-loop",
        x: 0.1,
        z: 0.9,
        w: 2.0,
        d: 0.9,
        h: 0.45,
      },
      {
        id: "clock-face",
        prop: "clock-face",
        x: -1.6,
        z: 0.95,
        w: 0.6,
        d: 0.3,
        h: 1.05,
      },
    ],
  },
  now: {
    pawn: { x: 1.35, z: 1.25 },
    pieces: [
      {
        id: "office",
        prop: "office",
        x: 0.35,
        z: -0.85,
        w: 2.8,
        d: 1.3,
        h: 1.7,
      },
      {
        id: "startup-desk",
        prop: "startup-desk",
        x: -0.5,
        z: 0.7,
        w: 1.5,
        d: 0.8,
        h: 1.05,
      },
      { id: "trees", prop: null, x: -1.65, z: -0.9, w: 0.75, d: 0.75, h: 0.95 },
    ],
  },
  next: {
    pawn: { x: 1.3, z: 1.25 },
    pieces: [
      { id: "blank", prop: "blank", x: 0, z: -0.3, w: 2.4, d: 1.1, h: 0.9 },
    ],
  },
};

/** A tile's pieces. */
export function piecesOf(slug: PathStepSlug): readonly Piece[] {
  return LAYOUT[slug].pieces;
}

/** A piece by its id on its tile. */
export function pieceOf(slug: PathStepSlug, id: string): Piece {
  const piece = LAYOUT[slug].pieces.find((each) => each.id === id);
  if (!piece) throw new Error(`No piece ${id} on ${slug}'s tile`);
  return piece;
}

/** The pawn: a turned game piece, its foot's radius and its height. */
export const PAWN_RADIUS = 0.42;
export const PAWN_HEIGHT = 1.3;
/** How high its foot rises at the top of a hop. */
export const HOP_HEIGHT = 1.2;
const PAWN_HOP_TOP = HOP_HEIGHT + PAWN_HEIGHT;

/** The pawn's spot on `slug`'s tile, in the tile's own frame. */
export function pawnSpotOnTile(slug: PathStepSlug): { x: number; z: number } {
  return LAYOUT[slug].pawn;
}

/** The pawn's spot on `slug`'s tile, on the table. */
export function pawnSpot(slug: PathStepSlug): readonly [number, number] {
  const [x, z] = tileCentre(slug);
  const scale = tileScale(slug);
  const spot = pawnSpotOnTile(slug);
  return [x + spot.x * scale, z + spot.z * scale];
}

/** A point on the table, `[x, y, z]`. */
export type FramePoint = readonly [number, number, number];

/** What the camera keeps in view, as outlines on the table: every tile's
 *  footprint, the top of every piece standing on it and, last, the top of
 *  the pawn's hop onto it, tile by tile. Each outline is convex and in order
 *  round its edge, so the camera can tell whether the tabs laid over the
 *  stage cover any of it. */
export function frameShapes(): {
  slug: PathStepSlug;
  outlines: (readonly FramePoint[])[];
}[] {
  return LOOP.map((slug) => {
    const [cx, cz] = tileCentre(slug);
    const scale = tileScale(slug);
    const at = (x: number, y: number, z: number) =>
      [cx + x * scale, y * scale, cz + z * scale] as const;
    const w = TILE.width / 2;
    const d = TILE.depth / 2;
    const footprint = [at(-w, 0, -d), at(w, 0, -d), at(w, 0, d), at(-w, 0, d)];
    const tops = piecesOf(slug).map((piece) => {
      const top = TILE.thickness + (piece.y ?? 0) + piece.h;
      const [x0, x1] = [piece.x - piece.w / 2, piece.x + piece.w / 2];
      const [z0, z1] = [piece.z - piece.d / 2, piece.z + piece.d / 2];
      return [
        at(x0, top, z0),
        at(x1, top, z0),
        at(x1, top, z1),
        at(x0, top, z1),
      ];
    });
    const spot = pawnSpotOnTile(slug);
    const hop = [at(spot.x, TILE.thickness + PAWN_HOP_TOP, spot.z)];
    return { slug, outlines: [footprint, ...tops, hop] };
  });
}

/** The board's rim, the top of its frame, as one outline round its edge:
 *  the camera frames the whole board, not only its tiles. The rounded
 *  corners are cut at their chord's far side, so the outline holds them. */
export function boardOutline(): readonly FramePoint[] {
  const w = BOARD.halfWidth;
  const d = BOARD.halfDepth;
  const c = BOARD.corner * (1 - Math.SQRT1_2);
  const y = BOARD.frameHeight;
  return [
    [-w + c, y, -d],
    [w - c, y, -d],
    [w, y, -d + c],
    [w, y, d - c],
    [w - c, y, d],
    [-w + c, y, d],
    [-w, y, d - c],
    [-w, y, -d + c],
  ];
}

/** The two side props, Quadrell and L'Oracolo della Ghigliottina: small
 *  solid objects in the board's middle, off the loop, on the table. */
export const SIDE_PROPS = {
  quadrell: { x: -2.2, z: 0.4 },
  oracolo: { x: 2.2, z: 0.4 },
} as const;
