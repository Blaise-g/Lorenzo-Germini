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

   A file is a glTF binary, its meshes compressed with
   `EXT_meshopt_compression`, its textures, if any, WebP or PNG: the loader
   wires no KTX2 transcoder, so a KTX2 texture fails its tile. Its origin is
   the landmark's foot, centred, +y up and its front facing +z, in whatever
   units the generator left: the board fits it into its piece's box and
   then applies `scale`. */

export type AssetRole = "landmark";

/** The index of the landmarks shipped: an object keyed by `SceneAsset.id`.
 *  Its entries' fields (triangles, bytes, model, licence and normalisation)
 *  are the landmark package's record; the board reads which ids are there
 *  and each one's `lodFile`. */
export const LANDMARK_INDEX = "/path/models/landmarks.json";

/** What the board reads of a landmark's entry in the index: its decimated
 *  file, with smaller textures, if it has one. */
export type LandmarkEntry = Readonly<{ lodFile?: string }>;

/** The governor's rung (`post.ts`) from which a landmark not yet fetched is
 *  fetched as its LOD: the rungs that draw fewer pixels. A phone fetches
 *  the LODs from the start. */
export const LOD_FROM_RUNG = 2;

/** The file to fetch for `asset`, a landmark or a prop: its LOD when
 *  `lod` asks for one and the index lists one, otherwise the full model. */
export function modelFile(
  asset: Readonly<{ file: string }>,
  entry: LandmarkEntry | undefined,
  lod: boolean,
): string {
  return lod && entry?.lodFile ? entry.lodFile : asset.file;
}

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

/* ─── Toy props and the duo (v3-toys) ─── */

/** The index of the toy props and the two markers shipped: an object keyed
 *  by model id, as `LANDMARK_INDEX` is, kept apart from it because the
 *  board takes every id there for a landmark. */
export const PROP_INDEX = "/path/models/props.json";

/** A generated prop standing in a tile's piece. Unlike a landmark, a prop
 *  that does not arrive is never its tile's failure: its code stand-in
 *  keeps standing. */
export type PropPlacement = Readonly<{
  /** The model's id in `PROP_INDEX`: one model may stand in several
   *  pieces, as the trees do. */
  model: string;
  step: PathStepSlug;
  /** The piece in the tile's layout (`board.ts`) whose box it fills. */
  piece: string;
  /** Fits its width and height to the box and squashes its depth into it,
   *  rather than shrinking whole to the box's shallowest side: for a
   *  backdrop, or a piece whose base runs deeper than its box. */
  squash?: boolean;
}>;

const placed = (
  model: string,
  step: PathStepSlug,
  piece: string,
  squash?: boolean,
): PropPlacement => ({ model, step, piece, squash });

/** Every piece a toy prop stands in, in the loop's order. The plateau, the
 *  lake and the pipe loop have no model and stay in code; so does every
 *  part a beat moves (`toys.ts`). */
export const PROP_PLACEMENTS: readonly PropPlacement[] = [
  placed("bisalta", "home", "bisalta", true),
  placed("tree-round", "home", "trees"),
  placed("ferraris-coils", "turin", "coils"),
  placed("tree-conifer", "turin", "trees"),
  placed("tree-round", "turin", "trees-back"),
  placed("chablais", "switzerland", "chablais", true),
  placed("sailboat", "switzerland", "sailboat"),
  placed("roche-dial", "switzerland", "roche-dial"),
  placed("mvp-window", "cuneo-2022", "mvp-window", true),
  placed("tree-conifer", "cuneo-2022", "trees"),
  placed("clock-face", "lille", "clock-face"),
  placed("startup-desk", "now", "startup-desk"),
  placed("tree-round", "now", "trees"),
  placed("next-plinth", "next", "blank"),
];

/** The two side props' models, by the side prop they stand in for
 *  (`SIDE_PROPS` in `board.ts`), and the box each fills there, as a piece
 *  does on a tile. */
export const SIDE_MODELS = {
  quadrell: { model: "quadrell", w: 0.95, d: 0.95, h: 0.62 },
  oracolo: { model: "oracolo", w: 0.8, d: 0.42, h: 1.2 },
} as const;

/** The marker's two handles, by the names their generated models take
 *  (`marker-lorenzo`, `marker-robot`): a model swapped in goes inside its
 *  handle (`world.ts`), and everything that moves the marker moves the
 *  handle. */
export const MARKER = {
  figure: "marker-lorenzo",
  buddy: "marker-robot",
} as const;

/** Every model id `PROP_INDEX` may list: the tiles' props, the side props
 *  and the two markers. */
export const PROP_MODELS: readonly string[] = [
  ...new Set([
    ...PROP_PLACEMENTS.map((placement) => placement.model),
    ...Object.values(SIDE_MODELS).map((side) => side.model),
    MARKER.figure,
    MARKER.buddy,
  ]),
];

/** A prop model's file, as served. */
export function propFile(model: string): `/path/models/${string}.glb` {
  return `/path/models/${model}.glb`;
}

/** The prop models `step`'s tile stands. */
export function propModelsOf(step: PathStepSlug): string[] {
  return [
    ...new Set(
      PROP_PLACEMENTS.filter((placement) => placement.step === step).map(
        (placement) => placement.model,
      ),
    ),
  ];
}

/** The placement standing in `piece` on `step`'s tile, if any. */
export function placementOf(
  step: PathStepSlug,
  piece: string,
): PropPlacement | undefined {
  return PROP_PLACEMENTS.find(
    (placement) => placement.step === step && placement.piece === piece,
  );
}

/** A tile's generated landmarks. */
export function assetsForStep(step: PathStepSlug): readonly SceneAsset[] {
  return SCENE_ASSETS.filter((asset) => asset.step === step);
}

/** The steps in the order the board loads their landmarks once the first
 *  tile is up: from the one after `from` round the loop, nearest first, so
 *  the tour's next landing is never the last to arrive. */
export function loadOrder(
  loop: readonly PathStepSlug[],
  from: PathStepSlug,
): PathStepSlug[] {
  const start = loop.indexOf(from);
  return loop.map((_, index) => loop[(start + 1 + index) % loop.length]);
}
