import { CatmullRomCurve3, Vector3 } from "three";

import type { PathStepSlug } from "@/data/path.types";

import { LOOP, pawnSpot, TILE, tileCentre, tileScale } from "./board";

/* The path's spline and the tiles' anchors, in one place for the camera rig
   and the board alike (v3, the benchmark's §4(a)): a closed CatmullRom curve
   through the tile centres in the loop's order, and each tile's anchor on
   it. Everything is in world units, on the board's top (y = 0). */

/** A tile's anchor: its centre on the board, the top of its slab, its
 *  scale, where the pawn stands on it, and where on the spline it sits. */
export type TileAnchor = Readonly<{
  slug: PathStepSlug;
  /** The tile's centre at the board's top. */
  centre: Vector3;
  /** The top face of its slab, which everything on the tile stands on. */
  top: number;
  scale: number;
  /** Where the pawn's foot rests on the tile. */
  pawn: Vector3;
  /** The tile's place on the spline, 0 to 1, in the curve's own `getPoint`
   *  terms: tile `i` of `n` is at `i / n`. */
  t: number;
}>;

/** Every tile's anchor, in the loop's order. */
export function tileAnchors(): readonly TileAnchor[] {
  return LOOP.map((slug, index) => {
    const [x, z] = tileCentre(slug);
    const scale = tileScale(slug);
    const top = TILE.thickness * scale;
    const [px, pz] = pawnSpot(slug);
    return {
      slug,
      centre: new Vector3(x, 0, z),
      top,
      scale,
      pawn: new Vector3(px, top, pz),
      t: index / LOOP.length,
    };
  });
}

/** One tile's anchor. */
export function tileAnchor(slug: PathStepSlug): TileAnchor {
  return tileAnchors().find((anchor) => anchor.slug === slug)!;
}

/** The path: a closed centripetal CatmullRom curve through the tile centres
 *  at the board's top, home first. With `n` control points on a closed
 *  curve, `getPoint(i / n)` is tile `i`'s centre. */
export function pathSpline(): CatmullRomCurve3 {
  return new CatmullRomCurve3(
    tileAnchors().map((anchor) => anchor.centre.clone()),
    true,
    "centripetal",
  );
}
