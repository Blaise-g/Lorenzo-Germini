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
import { LANDMARK_INDEX, type SceneAsset } from "./scene-assets";

/* What the board fetches (v3): the card-grain bump map, the index of the
   landmarks shipped, and the models it lists. A landmark the index does not
   list is never asked for: its stand-in stands. A listed model whose file
   is not there (404) is no failure either. One that fails to arrive, or
   arrives and does not parse, is its tile's failure, and is fetched again
   the next time its tile is selected. */

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

/** The ids the landmark index lists. An index that cannot be read lists
 *  none: the board stands every stand-in, which is a whole board. */
export async function loadLandmarkIndex(): Promise<ReadonlySet<string>> {
  try {
    const response = await fetch(LANDMARK_INDEX);
    if (!response.ok) throw new Error(`${LANDMARK_INDEX}: ${response.status}`);
    const index: unknown = await response.json();
    if (typeof index !== "object" || index === null || Array.isArray(index)) {
      throw new Error(`${LANDMARK_INDEX} is not an object`);
    }
    return new Set(Object.keys(index));
  } catch (error) {
    console.error(error);
    return new Set();
  }
}

/** A model's outcome: its scene, absent (stand in for it), or failed and
 *  why. */
export type ModelResult =
  | { status: "loaded"; scene: Object3D }
  | { status: "absent" }
  | { status: "failed"; reason: SceneFallbackReason };

let loader: GLTFLoader | undefined;

/** Fetches and parses one landmark. Never throws: a failure is a result. */
export async function loadModel(asset: SceneAsset): Promise<ModelResult> {
  let buffer: ArrayBuffer;
  try {
    const response = await fetch(asset.file);
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
