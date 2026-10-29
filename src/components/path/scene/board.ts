import { MVP_WINDOW_LABEL, PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";

import { cardsForStep, TILE_SIZE } from "./card-art";

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
export const LOOP_RADII = { x: 8.8, z: 6.7 } as const;

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

/** Where the pawn stands on a tile, in the tile's own frame: its front-left
 *  corner, clear of the cards and the name. */
export const PAWN_SPOT = { x: -1.62, z: 1.42 } as const;

/** The pawn's spot on `slug`'s tile, on the table. */
export function pawnSpot(slug: PathStepSlug): readonly [number, number] {
  const [x, z] = tileCentre(slug);
  const scale = tileScale(slug);
  return [x + PAWN_SPOT.x * scale, z + PAWN_SPOT.z * scale];
}

/** What the camera keeps in view, on the table: every tile's footprint,
 *  the top corners of every card standing on it, and the top of the pawn's
 *  hop over it. */
export function framePoints(): (readonly [number, number, number])[] {
  return LOOP.flatMap((slug) => {
    const [cx, cz] = tileCentre(slug);
    const scale = tileScale(slug);
    const at = (x: number, y: number, z: number) =>
      [cx + x * scale, y * scale, cz + z * scale] as const;
    const w = TILE.width / 2;
    const d = TILE.depth / 2;
    const footprint = [at(-w, 0, -d), at(w, 0, -d), at(-w, 0, d), at(w, 0, d)];
    const cards = cardsForStep(slug).flatMap((card) => {
      const top = TILE.thickness + card.position.y + card.height;
      const left = card.position.x - card.anchor.u * card.width;
      return [
        at(left, top, card.position.z),
        at(left + card.width, top, card.position.z),
      ];
    });
    const hop = at(PAWN_SPOT.x, TILE.thickness + PAWN_HOP_TOP, PAWN_SPOT.z);
    return [...footprint, ...cards, hop];
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
