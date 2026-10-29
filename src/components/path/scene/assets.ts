import {
  Box3,
  LinearMipmapLinearFilter,
  Mesh,
  Texture,
  Vector3,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

import type { SceneFallbackReason } from "./fallback";
import type { Piece } from "./board";
import {
  LANDMARK_INDEX,
  type LandmarkEntry,
  type SceneAsset,
} from "./scene-assets";

/* What the board fetches (v3): the card-grain bump map, the index of the
   landmarks shipped, and the models it lists. A landmark the index does not
   list is never asked for: its stand-in stands. A listed model whose file
   is not there (404) is no failure either. One that fails to arrive, or
   arrives and does not parse, is its tile's failure, and is fetched again
   the next time its tile is selected.

   The models load lazily (v3-harden), so a first paint carries one step's
   landmarks, not seven: a step's own before its tile builds, and the rest
   one at a time once the page is idle, nearest first. A step shown after
   that also asks for its own and the next step's at once (`runtime.ts`). A phone, and a board the governor has stepped down, fetch
   each model's LOD (`modelFile`). */

/** The card stock's grain: a tileable grey height map, read as a bump. */
export const GRAIN_FILE = "/path/world/grain.webp";

export async function loadGrain(): Promise<Texture> {
  const response = await fetch(GRAIN_FILE);
  if (!response.ok) throw new Error(`${GRAIN_FILE}: ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob(), {
    colorSpaceConversion: "none",
    imageOrientation: "flipY",
  });
  const texture = new Texture(bitmap);
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** The landmarks the index lists, by id. An index that cannot be read lists
 *  none: the board stands every stand-in, which is a whole board. */
export function loadLandmarkIndex() {
  return loadIndex(LANDMARK_INDEX);
}

/** The models an index (`LANDMARK_INDEX`, `PROP_INDEX`) lists, by id, and
 *  each one's LOD; none when it cannot be read. */
export async function loadIndex(
  url: string,
): Promise<ReadonlyMap<string, LandmarkEntry>> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const index: unknown = await response.json();
    if (typeof index !== "object" || index === null || Array.isArray(index)) {
      throw new Error(`${url} is not an object`);
    }
    return new Map(
      Object.entries(index as Record<string, unknown>).map(([id, entry]) => {
        const lodFile = (entry as { lodFile?: unknown } | null)?.lodFile;
        return [id, typeof lodFile === "string" ? { lodFile } : {}];
      }),
    );
  } catch (error) {
    console.error(error);
    return new Map();
  }
}

/** A model's outcome: its scene, absent (stand in for it), or failed and
 *  why. */
export type ModelResult =
  | { status: "loaded"; scene: Object3D; file: string }
  | { status: "absent" }
  | { status: "failed"; reason: SceneFallbackReason };

let loader: GLTFLoader | undefined;

/** Fetches and parses one landmark's `file`. Never throws: a failure is a
 *  result. */
export async function loadModel(file: string): Promise<ModelResult> {
  let buffer: ArrayBuffer;
  try {
    const response = await fetch(file);
    if (response.status === 404) return { status: "absent" };
    if (!response.ok) return { status: "failed", reason: "assets-failed" };
    buffer = await response.arrayBuffer();
  } catch {
    return { status: "failed", reason: "assets-failed" };
  }
  try {
    loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.parseAsync(buffer, "");
    return { status: "loaded", scene: gltf.scene, file };
  } catch (error) {
    console.error(error);
    return { status: "failed", reason: "scene-failed" };
  }
}

/** Runs `task` when the page is next idle: after the first paint's work,
 *  so a fetch it starts does not compete with it. Safari has no
 *  `requestIdleCallback`; a short timeout stands in. */
export function whenIdle(task: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
  } else {
    window.setTimeout(task, IDLE_FALLBACK_MS);
  }
}

/** The longest an idle task waits for the page to go quiet. */
const IDLE_TIMEOUT_MS = 2000;
/** Where there is no idle callback, how long after the first paint. */
const IDLE_FALLBACK_MS = 200;

/** The box a model is fitted into: a piece's, or a side prop's. */
export type FitBox = Readonly<{ w: number; d: number; h: number }>;

/** The scale that fits a model `size` into `box`: uniform, as far as its
 *  proportions allow, times `scale`; or, `squash`ed, its width and height
 *  as far as they allow and its depth squeezed into the box's. */
export function fitScale(
  size: Readonly<{ x: number; y: number; z: number }>,
  box: FitBox,
  scale = 1,
  squash = false,
): Vector3 {
  const across = Math.min(box.w / (size.x || 1), box.h / (size.y || 1));
  const deep = box.d / (size.z || 1);
  const fit = Math.min(across, deep) * scale;
  return squash
    ? new Vector3(
        across * scale,
        across * scale,
        Math.min(across, deep) * scale,
      )
    : new Vector3(fit, fit, fit);
}

/** A loaded landmark fitted into its piece's box: scaled to fill it as far
 *  as its proportions allow, times the asset's own `scale`, its foot centred
 *  on the origin, turned by `rotationY`. */
export function fitModel(scene: Object3D, asset: SceneAsset, piece: Piece) {
  return fitInto(scene, piece, asset.scale, false, asset.rotationY);
}

/** A loaded model fitted into `box` (`fitScale`), its foot centred on the
 *  origin, turned by `rotationY`; a clone, sharing the model's geometry
 *  and materials. */
export function fitInto(
  scene: Object3D,
  box: FitBox,
  scale = 1,
  squash = false,
  rotationY = 0,
) {
  const model = scene.clone(true);
  model.rotation.y = rotationY;
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  const fit = fitScale(size, box, scale, squash);
  const centre = bounds.getCenter(new Vector3());
  model.position.set(
    -centre.x * fit.x,
    -bounds.min.y * fit.y,
    -centre.z * fit.z,
  );
  model.scale.multiply(fit);
  model.traverse((node) => {
    if (node instanceof Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  return model;
}
