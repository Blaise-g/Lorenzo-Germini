import { MVP_WINDOW_LABEL, PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";

import { type CardArt, cardsForStep, TILE_SIZE } from "./card-art";

/* The board's layout (comp B, "Risograph Pop-up"): seven printed tiles on a
   closed loop in the data's order, home at the back and Lille, the other
   hero, at the front, with "?" closing the loop beside home. Pure numbers,
   so a spec checks the layout without a browser. Units are the card art's:
   a tile is about `TILE_SIZE` (4) across. */

/** The loop, in the data's order. */
export const LOOP: readonly PathStepSlug[] = PATH_STEPS.map(
  (step) => step.slug,
);

/** The hero tiles: a size up, with their full multi-card scenes. */
export const HERO_STEPS: readonly PathStepSlug[] = ["home", "lille"];
export const HERO_SCALE = 1.16;

/** A tile's printed top, before its scale: a chamfered card a little
 *  larger than the cards' frame, so they stand inside its border. */
export const TILE = {
  width: TILE_SIZE + 0.5,
  depth: TILE_SIZE + 0.3,
  chamfer: 0.5,
  thickness: 0.2,
} as const;

/** The loop's half-widths across and in depth. */
export const LOOP_RADII = { x: 9.2, z: 6.7 } as const;

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

/** The pawn's cone's radius at its foot, and the room it keeps from a card
 *  standing near it, in the tile's own units. */
export const PAWN_RADIUS = 0.55;
const PAWN_CLEARANCE = 0.08;
/** How far a standing card's glued tab reaches in front of its foot, at
 *  most. */
export const TAB_REACH = 0.26;
/** How far in from a tile's front edge its name is printed, in scene units,
 *  and how far its letters reach back from there. The pawn stands behind
 *  both, so it never stands on the name. */
export const NAME_STRIP = 0.58;
export const NAME_REACH = 0.25;
/** How much a spot to the front counts against one off the middle. */
const SPOT_FRONT_WEIGHT = 0.6;
/** The grid the spot is searched on. */
const SPOT_STEP = 0.05;

/* The search is a pure function of the card layout, and the pawn asks for
   its spot every frame it moves. */
const spots = new Map<PathStepSlug, { x: number; z: number }>();

/** Where the pawn stands on `slug`'s tile, in the tile's own frame: the
 *  spot behind the name, inside the tile's border, where its foot touches
 *  no card standing on the tile nor that card's tab; to a side of the tile
 *  rather than its middle, and to the front rather than the back, so the
 *  cards do not hide it. Each tile's cards stand in their own places, so
 *  each tile has its own spot. */
export function pawnSpotOnTile(slug: PathStepSlug): {
  x: number;
  z: number;
} {
  const known = spots.get(slug);
  if (known) return known;
  const reach = PAWN_RADIUS + PAWN_CLEARANCE;
  const cards = cardsForStep(slug).filter((card) => card.position.y === 0);
  const clear = (x: number, z: number) =>
    cards.every((card) => {
      const [left, right] = cardSpan(card);
      const dx = Math.max(left - x, 0, x - right);
      const dz = Math.max(
        card.position.z - z,
        0,
        z - card.position.z - TAB_REACH,
      );
      return Math.hypot(dx, dz) >= reach;
    });
  const xMax = TILE.width / 2 - TILE.chamfer - 0.1;
  const zMax = TILE.depth / 2 - NAME_STRIP - NAME_REACH - PAWN_RADIUS;
  const steps = (max: number) => Math.round((2 * max) / SPOT_STEP);
  let best: { x: number; z: number } | undefined;
  let bestScore = -Infinity;
  for (let j = 0; j <= steps(zMax); j += 1) {
    const z = zMax - j * SPOT_STEP;
    for (let i = 0; i <= steps(xMax); i += 1) {
      const x = -xMax + i * SPOT_STEP;
      /* Off the middle, where the name is printed, and to the front. */
      const score = Math.abs(x) + SPOT_FRONT_WEIGHT * z - (x > 0 ? 0.05 : 0);
      if (score > bestScore && clear(x, z)) {
        best = { x, z };
        bestScore = score;
      }
    }
  }
  if (!best) throw new Error(`No room for the pawn on ${slug}'s tile`);
  spots.set(slug, best);
  return best;
}
/** A card's left and right edges across its tile, `[left, right]`. */
export function cardSpan(card: CardArt): readonly [number, number] {
  const left = card.position.x - card.anchor.u * card.width;
  return [left, left + card.width];
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
 *  footprint, every card standing on it and, last, the top of the pawn's
 *  hop onto it, tile by tile. Each outline is convex and in order round its
 *  edge, so the camera can tell whether the tabs laid over the stage cover
 *  any of it. */
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
    const cards = cardsForStep(slug).map((card) => {
      const foot = TILE.thickness + card.position.y;
      const top = foot + card.height;
      const [left, right] = cardSpan(card);
      const z = card.position.z;
      return [
        at(left, foot, z),
        at(right, foot, z),
        at(right, top, z),
        at(left, top, z),
      ];
    });
    const spot = pawnSpotOnTile(slug);
    const hop = [at(spot.x, TILE.thickness + PAWN_HOP_TOP, spot.z)];
    return { slug, outlines: [footprint, ...cards, hop] };
  });
}

/** The pawn's cone, and how high its foot rises at the top of a hop. */
export const PAWN_HEIGHT = 1.6;
export const HOP_HEIGHT = 1.2;
const PAWN_HOP_TOP = HOP_HEIGHT + PAWN_HEIGHT;

/** A tile's printed name: the step's place, its own words from the data. */
export function tileName(slug: PathStepSlug): string {
  return PATH_STEPS.find((step) => step.slug === slug)!.place;
}

/** The dimmed MVP window's label, set on a tag beside it: decision 3's
 *  words, from the step's own line, in two lines. */
export const MVP_WINDOW_LINES = MVP_WINDOW_LABEL.split(/(?<= —) /);
/** Printed faded, like the window it names. */
export const MVP_INK_STRENGTH = 0.55;
