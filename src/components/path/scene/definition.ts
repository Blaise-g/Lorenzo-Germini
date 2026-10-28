import type { BufferGeometry, Object3D } from "three";

import type { PathSceneId } from "@/data/path.types";

import type { PaletteRole } from "./palette";

/** The surfaces a prop may be made of. Outline and fog are the runtime's. */
export type SurfaceRole = Exclude<PaletteRole, "outline" | "fog">;

/** What the runtime hands a scene's art: code-built solids in the palette,
 *  each with its outline (GH-141, decision 11). */
export type SceneKit = {
  /** A mesh of `geometry` in `role`'s colour, outlined. */
  solid(geometry: BufferGeometry, role: SurfaceRole): Object3D;
  /** A flat, unoutlined surface, such as a dimmed pane: `opacity` below 1
   *  lets the colour behind show through. */
  pane(geometry: BufferGeometry, role: PaletteRole, opacity?: number): Object3D;
};

/** One scene's art. Every prop id its steps name in `src/data/path.ts` has a
 *  maker here, positioned in the scene's own space; the base is always shown.
 *  The camera is fixed: it looks at `target` from the scene's front, far
 *  enough back to keep `frameRadius` in view at any aspect. */
export type SceneDefinition = {
  id: PathSceneId;
  target: readonly [number, number, number];
  frameRadius: number;
  base(kit: SceneKit): Object3D;
  props: Readonly<Record<string, (kit: SceneKit) => Object3D>>;
};
