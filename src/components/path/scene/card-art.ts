import type { PathStepSlug } from "@/data/path.types";

/* The die-cut paper cards the board is built from (comp B, "Risograph
   Pop-up"): every card each tile stands up, and where. This file is the seam
   between the card art and the board, so its shape stays put; the art behind
   it can be regenerated freely.

   Each card is one WebP under `public/path/cards/`, made by
   `bun run generate:path-cards` from the GPT Image originals in
   `vendor/path-cards/`. Its channels are an ink separation, not colours:
   R is terracotta ink coverage, G is slate-blue ink coverage, B is unused
   (zero), and A is the die-cut mask, which already includes the white cut
   margin around the shape. Where A is set and neither ink is, the card shows
   bare paper. The runtime colours paper and inks from the path tokens, so one
   texture serves light and dark.

   Units are scene units on one scale for every card: a tile is about
   `TILE_SIZE` (4) across, and `width` and `height` are the card's size on
   that scale, matching the texture's aspect. A card stands upright in its
   tile's local frame, facing the viewer: x runs left to right across the
   tile, z from the back edge (-2) to the front edge (+2), y up from the
   tile's top face. */

/** About how wide a tile is, in scene units: the scale every card is on. */
export const TILE_SIZE = 4;

/** What a card does on its tile. A `backdrop` stands at the back and frames
 *  the scene, the `landmark` is the place's one subject, and an `accent` is
 *  a small piece around them (a tree, a sailboat, a dial). */
export type CardRole = "landmark" | "backdrop" | "accent";

export type CardArt = Readonly<{
  /** Unique across the board, `<step>-<subject>`. */
  id: string;
  /** The tile it stands on. */
  step: PathStepSlug;
  /** The step's prop id it renders (`PathProp.id`), if it renders one.
   *  Accents such as trees render none. */
  prop?: string;
  /** Its texture, as served. Trees are shared, so two cards can name one file. */
  file: `/path/cards/${string}.webp`;
  /** Size in scene units (see `TILE_SIZE`); `width / height` is the
   *  texture's aspect. */
  width: number;
  height: number;
  /** The hinge, in the card's own 0–1 space: u across from its left edge, v
   *  up from its bottom edge. A card that folds up from the tile is
   *  `{ u: 0.5, v: 0 }`, hinged along its bottom edge. */
  anchor: Readonly<{ u: number; v: number }>;
  role: CardRole;
  /** Suggested place for the anchor in the tile's frame (see above). `y` is
   *  zero for a card standing on the tile, and above it for one mounted on
   *  another card, such as the MVP window on the schoolroom. */
  position: Readonly<{ x: number; y: number; z: number }>;
  /** Suggested build order on its tile, from zero: back to front, and the
   *  order the cards fold up in. */
  order: number;
}>;

const FOLD_UP = { u: 0.5, v: 0 } as const;

export const CARD_ART: readonly CardArt[] = [
  // home: Cuneo's first visit. The Bisalta behind the plateau, the school on it.
  {
    id: "home-bisalta",
    step: "home",
    prop: "bisalta",
    file: "/path/cards/home-bisalta.webp",
    width: 3.8,
    height: 1.58,
    anchor: FOLD_UP,
    role: "backdrop",
    position: { x: 0, y: 0, z: -1.4 },
    order: 0,
  },
  {
    id: "home-plateau",
    step: "home",
    prop: "plateau",
    file: "/path/cards/home-plateau.webp",
    width: 3.6,
    height: 1.0,
    anchor: FOLD_UP,
    role: "backdrop",
    position: { x: 0, y: 0, z: -0.5 },
    order: 1,
  },
  {
    id: "home-school",
    step: "home",
    prop: "school",
    file: "/path/cards/home-school.webp",
    width: 1.8,
    height: 0.84,
    anchor: FOLD_UP,
    role: "landmark",
    position: { x: 0.5, y: 0, z: 0.5 },
    order: 2,
  },
  {
    id: "home-tree",
    step: "home",
    file: "/path/cards/tree-conifer.webp",
    width: 0.72,
    height: 0.9,
    anchor: FOLD_UP,
    role: "accent",
    position: { x: -1.3, y: 0, z: 0.7 },
    order: 3,
  },
  // turin: the Mole Antonelliana, and Ferraris' coils set over its dome.
  {
    id: "turin-mole",
    step: "turin",
    prop: "mole",
    file: "/path/cards/turin-mole.webp",
    width: 1.25,
    height: 3.2,
    anchor: FOLD_UP,
    role: "landmark",
    position: { x: 0, y: 0, z: -0.4 },
    order: 0,
  },
  {
    id: "turin-coils",
    step: "turin",
    prop: "coils",
    file: "/path/cards/turin-coils.webp",
    width: 1.4,
    height: 1.06,
    anchor: FOLD_UP,
    role: "accent",
    position: { x: 0, y: 1.0, z: -0.3 },
    order: 1,
  },
  {
    id: "turin-tree-left",
    step: "turin",
    file: "/path/cards/tree-round.webp",
    width: 0.81,
    height: 0.8,
    anchor: FOLD_UP,
    role: "accent",
    position: { x: -1.3, y: 0, z: 0.6 },
    order: 2,
  },
  {
    id: "turin-tree-right",
    step: "turin",
    file: "/path/cards/tree-conifer.webp",
    width: 0.72,
    height: 0.9,
    anchor: FOLD_UP,
    role: "accent",
    position: { x: 1.3, y: 0, z: 0.5 },
    order: 3,
  },
  // switzerland: the lake from above Lausanne, the Jet d'Eau, Roche's dial.
  {
    id: "switzerland-lake",
    step: "switzerland",
    prop: "lake",
    file: "/path/cards/switzerland-lake.webp",
    width: 3.8,
    height: 1.43,
    anchor: FOLD_UP,
    role: "backdrop",
    position: { x: 0, y: 0, z: -1.3 },
    order: 0,
  },
  {
    id: "switzerland-jet-d-eau",
    step: "switzerland",
    prop: "jet-d-eau",
    file: "/path/cards/switzerland-jet-d-eau.webp",
    width: 1.36,
    height: 2.6,
    anchor: FOLD_UP,
    role: "landmark",
    position: { x: 0.3, y: 0, z: -0.3 },
    order: 1,
  },
  {
    id: "switzerland-sailboat",
    step: "switzerland",
    file: "/path/cards/switzerland-sailboat.webp",
    width: 0.82,
    height: 0.8,
    anchor: FOLD_UP,
    role: "accent",
    position: { x: 1.3, y: 0, z: 0.4 },
    order: 2,
  },
  {
    id: "switzerland-roche-dial",
    step: "switzerland",
    prop: "roche-dial",
    file: "/path/cards/switzerland-roche-dial.webp",
    width: 0.7,
    height: 0.8,
    anchor: FOLD_UP,
    role: "accent",
    position: { x: -1.2, y: 0, z: 0.6 },
    order: 3,
  },
  // cuneo-2022: the first return. The schoolroom, and its dimmed MVP window.
  {
    id: "cuneo-2022-schoolroom",
    step: "cuneo-2022",
    prop: "schoolroom",
    file: "/path/cards/cuneo-2022-schoolroom.webp",
    width: 3.0,
    height: 1.85,
    anchor: FOLD_UP,
    role: "landmark",
    position: { x: 0, y: 0, z: -0.6 },
    order: 0,
  },
  {
    id: "cuneo-2022-mvp-window",
    step: "cuneo-2022",
    prop: "mvp-window",
    file: "/path/cards/cuneo-2022-mvp-window.webp",
    width: 0.57,
    height: 0.6,
    anchor: FOLD_UP,
    role: "accent",
    position: { x: 0.9, y: 0.9, z: -0.55 },
    order: 1,
  },
  {
    id: "cuneo-2022-tree",
    step: "cuneo-2022",
    file: "/path/cards/tree-round.webp",
    width: 0.81,
    height: 0.8,
    anchor: FOLD_UP,
    role: "accent",
    position: { x: -1.4, y: 0, z: 0.6 },
    order: 2,
  },
  // lille: the hero tile. The Bourse behind, the belfry, the courtyard, the
  // clock face, and the pipe loop along the front.
  {
    id: "lille-bourse",
    step: "lille",
    file: "/path/cards/lille-bourse.webp",
    width: 3.0,
    height: 1.76,
    anchor: FOLD_UP,
    role: "backdrop",
    position: { x: 0.4, y: 0, z: -1.3 },
    order: 0,
  },
  {
    id: "lille-belfry",
    step: "lille",
    prop: "belfry",
    file: "/path/cards/lille-belfry.webp",
    width: 0.87,
    height: 3.4,
    anchor: FOLD_UP,
    role: "landmark",
    position: { x: -1.3, y: 0, z: -0.7 },
    order: 1,
  },
  {
    id: "lille-courtyard",
    step: "lille",
    prop: "courtyard",
    file: "/path/cards/lille-courtyard.webp",
    width: 2.4,
    height: 1.21,
    anchor: FOLD_UP,
    role: "landmark",
    position: { x: 0.4, y: 0, z: -0.3 },
    order: 2,
  },
  {
    id: "lille-clock-face",
    step: "lille",
    prop: "clock-face",
    file: "/path/cards/lille-clock-face.webp",
    width: 0.64,
    height: 0.8,
    anchor: FOLD_UP,
    role: "accent",
    position: { x: 1.2, y: 0, z: 0.5 },
    order: 3,
  },
  /* The pipe stays a printed card, not a terracotta tube. Comp B draws it
     as a round pipe, but everything else on the board is paper printed in
     two inks; one modelled, shaded object would read as from another set,
     and would be the only mesh not drawn by the ink shader. A card also
     folds up as the rest do, and costs no geometry. */
  {
    id: "lille-pipe-loop",
    step: "lille",
    prop: "pipe-loop",
    file: "/path/cards/lille-pipe-loop.webp",
    width: 3.6,
    height: 0.97,
    anchor: FOLD_UP,
    role: "accent",
    position: { x: 0, y: 0, z: 1.3 },
    order: 4,
  },
  // now: the second return. The office behind, the startup's desk in front.
  {
    id: "now-office",
    step: "now",
    prop: "office",
    file: "/path/cards/now-office.webp",
    width: 2.6,
    height: 1.32,
    anchor: FOLD_UP,
    role: "backdrop",
    position: { x: 0.4, y: 0, z: -0.9 },
    order: 0,
  },
  {
    id: "now-desk",
    step: "now",
    prop: "startup-desk",
    file: "/path/cards/now-desk.webp",
    width: 1.8,
    height: 1.1,
    anchor: FOLD_UP,
    role: "landmark",
    position: { x: -0.4, y: 0, z: 0.4 },
    order: 1,
  },
  {
    id: "now-tree",
    step: "now",
    file: "/path/cards/tree-conifer.webp",
    width: 0.72,
    height: 0.9,
    anchor: FOLD_UP,
    role: "accent",
    position: { x: -1.5, y: 0, z: -0.6 },
    order: 2,
  },
  // next: "?". A blank card with five empty clue slots, and nothing else.
  {
    id: "next-blank",
    step: "next",
    prop: "blank",
    file: "/path/cards/next-blank.webp",
    width: 2.6,
    height: 1.45,
    anchor: FOLD_UP,
    role: "landmark",
    position: { x: 0, y: 0, z: -0.2 },
    order: 0,
  },
];

/** A tile's cards in build order. */
export function cardsForStep(step: PathStepSlug): readonly CardArt[] {
  return CARD_ART.filter((card) => card.step === step).sort(
    (a, b) => a.order - b.order,
  );
}
