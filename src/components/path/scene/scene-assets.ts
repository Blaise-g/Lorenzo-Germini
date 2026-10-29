import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";

import { pieceOf } from "./board";

/* The board's model manifest (v3; the benchmark's §4(b)): every landmark
   that is a generated model rather than modelled in code, and where it
   stands. It replaces v2's card manifest at the same seam: the landmark
   package (W2) fills in the files under `public/path/models/` and lists
   each one it ships in `landmarks.json` there, by id. The board asks for a
   landmark's file only when the index lists it; wherever it does not, the
   board stands its own code-modelled stand-in at the same anchor, with no
   request, so a missing file is never a missing landmark. No three.js
   here.

   A file is a glTF binary, its meshes and textures compressed with
   `EXT_meshopt_compression` (and KTX2 where it has textures). Its origin is
   the landmark's foot, centred, +y up and its front facing +z, in whatever
   units the generator left: the board fits it into its piece's box and
   then applies `scale`. */

export type AssetRole = "landmark";

/** The index of the landmarks shipped: an object keyed by `SceneAsset.id`.
 *  Its entries' fields (the LOD file, triangles, bytes, model, licence and
 *  normalisation) are the landmark package's record; the board reads only
 *  which ids are there. */
export const LANDMARK_INDEX = "/path/models/landmarks.json";

export type SceneAsset = Readonly<{
  /** Unique across the board, `<step>-<subject>`. */
  id: string;
  /** The tile it stands on. */
  step: PathStepSlug;
  /** The step's prop it is (`PathProp.id`), which it builds with. */
  prop: string;
  /** The piece in the tile's layout (`board.ts`) whose box it fills, and
   *  whose stand-in it replaces. */
  piece: string;
  /** The model, as served. */
  file: `/path/models/${string}.glb`;
  /** A factor on the fit into the piece's box: 1 fills the box as far as
   *  the model's proportions allow. */
  scale: number;
  /** Where its foot stands in the tile's frame (`board.ts`): x across, z
   *  toward the visitor, y up from the tile's top. */
  anchor: Readonly<{ x: number; y: number; z: number }>;
  /** Its turn about y, in radians. */
  rotationY: number;
  role: AssetRole;
  /** The step's line it captions: its prop's, from the data. */
  captionLine: number;
}>;

function captionOf(step: PathStepSlug, prop: string): number {
  const found = PATH_STEPS.find((each) => each.slug === step)?.props.find(
    (each) => each.id === prop,
  );
  if (!found) throw new Error(`${step} names no prop ${prop}`);
  return found.captionLine;
}

/** A landmark standing where its piece stands in the tile's layout. */
function landmark(
  step: PathStepSlug,
  prop: string,
  subject: string,
  scale = 1,
): SceneAsset {
  const piece = pieceOf(step, prop);
  return {
    id: `${step}-${subject}`,
    step,
    prop,
    piece: piece.id,
    file: `/path/models/${step}-${subject}.glb`,
    scale,
    anchor: { x: piece.x, y: piece.y ?? 0, z: piece.z },
    rotationY: 0,
    role: "landmark",
    captionLine: captionOf(step, prop),
  };
}

export const SCENE_ASSETS: readonly SceneAsset[] = [
  landmark("home", "school", "school"),
  landmark("turin", "mole", "mole"),
  landmark("switzerland", "jet-d-eau", "jet-d-eau"),
  landmark("cuneo-2022", "schoolroom", "schoolroom"),
  landmark("lille", "belfry", "belfry"),
  landmark("lille", "courtyard", "bourse"),
  landmark("now", "office", "office"),
];

/** A tile's generated landmarks. */
export function assetsForStep(step: PathStepSlug): readonly SceneAsset[] {
  return SCENE_ASSETS.filter((asset) => asset.step === step);
}
