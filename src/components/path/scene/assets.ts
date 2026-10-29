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
   landmarks, not seven: a step's own before its tile builds, the next
   step's as it is shown, and the rest one at a time when the page is idle
   (`runtime.ts`). A phone, and a board the governor has stepped down, fetch
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
export async function loadLandmarkIndex(): Promise<
  ReadonlyMap<string, LandmarkEntry>
> {
  try {
    const response = await fetch(LANDMARK_INDEX);
    if (!response.ok) throw new Error(`${LANDMARK_INDEX}: ${response.status}`);
    const index: unknown = await response.json();
    if (typeof index !== "object" || index === null || Array.isArray(index)) {
      throw new Error(`${LANDMARK_INDEX} is not an object`);
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
  | { status: "loaded"; scene: Object3D }
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
    return { status: "loaded", scene: gltf.scene };
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

/** A loaded landmark fitted into its piece's box: scaled to fill it as far
 *  as its proportions allow, times the asset's own `scale`, its foot centred
 *  on the origin, turned by `rotationY`. */
export function fitModel(scene: Object3D, asset: SceneAsset, piece: Piece) {
  const model = scene.clone(true);
  model.rotation.y = asset.rotationY;
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const fit =
    Math.min(
      piece.w / (size.x || 1),
      piece.h / (size.y || 1),
      piece.d / (size.z || 1),
    ) * asset.scale;
  const centre = box.getCenter(new Vector3());
  model.position.set(-centre.x * fit, -box.min.y * fit, -centre.z * fit);
  model.scale.multiplyScalar(fit);
  model.traverse((node) => {
    if (node instanceof Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  return model;
}
