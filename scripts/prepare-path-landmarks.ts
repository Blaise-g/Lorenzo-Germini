/* Turns the image-to-3D landmarks, props and markers into the GLBs the path
   scene loads. Each raw generator output is kept in `vendor/path-models/<id>.glb` (textures
   lossy WebP at full size, geometry meshopt-quantized to 16 bits, nothing simplified or resized:
   the master the shipped files are cut from). From it this writes two files under `public/path/models/`:

     <id>.glb       the full model, its triangles and textures per `DETAIL`
     <id>.lod.glb   the far-away cut of the same master

   Both are normalised to one convention: Y up, the base at y = 0, centred on
   x and z, one unit tall. The steps are weld, simplify (seams kept where the
   target allows), WebP
   textures, meshopt and prune; `landmarks.json` beside them records what was
   applied to each landmark, and the integrating scene reads it. `props.json`
   does the same for the props and the two markers, kept apart because the
   scene takes every id in `landmarks.json` for a landmark.

     bun run prepare:path-landmarks                   every model
     bun run prepare:path-landmarks --import <glb> <id>
                                                      keep a new raw output */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  Document,
  NodeIO,
  type mat4,
  type Mesh,
  type Primitive,
  type Texture,
  type vec3,
} from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";
import {
  cloneDocument,
  dedup,
  dequantize,
  getBounds,
  getGLPrimitiveCount,
  meshopt,
  prune,
  simplify,
  transformMesh,
  weld,
} from "@gltf-transform/functions";
import {
  MeshoptDecoder,
  MeshoptEncoder,
  MeshoptSimplifier,
} from "meshoptimizer";
import { format } from "prettier";
import sharp from "sharp";

const VENDOR = path.join(process.cwd(), "vendor", "path-models");
const OUT = path.join(process.cwd(), "public", "path", "models");

export type Kind = "landmark" | "prop" | "marker";

export const MANIFEST: Record<Kind, string> = {
  landmark: path.join(OUT, "landmarks.json"),
  prop: path.join(OUT, "props.json"),
  marker: path.join(OUT, "props.json"),
};

/** What each shipped file may cost. The bytes are a ceiling, not a target:
 *  the benchmark measured the belfry at about 280 KB and 95 KB. A prop sits
 *  small at the edge of a tile; a marker is seen close, so it keeps more
 *  triangles and texture for the face than a prop. */
export const DETAIL = {
  landmark: {
    full: { triangles: 10_000, texture: 1024, maxBytes: 450 * 1024 },
    lod: { triangles: 2_500, texture: 512, maxBytes: 160 * 1024 },
  },
  prop: {
    full: { triangles: 5_000, texture: 512, maxBytes: 150 * 1024 },
    lod: { triangles: 2_000, texture: 256, maxBytes: 60 * 1024 },
  },
  marker: {
    full: { triangles: 8_000, texture: 1024, maxBytes: 300 * 1024 },
    lod: { triangles: 2_000, texture: 512, maxBytes: 100 * 1024 },
  },
} as const;
export type Detail = keyof (typeof DETAIL)["landmark"];

/** How far the simplifier may move a vertex, as a share of the mesh's size.
 *  Loose on purpose: the triangle target is what stops it. */
const SIMPLIFY_ERROR = 0.05;
/** WebP quality for the shipped colour textures. */
const WEBP_QUALITY = 78;

export interface PathModel {
  id: string;
  kind: Kind;
  /** The `src/data/path.ts` step it stands on; null for what is not tied to
   *  one: the side props, the trees and the markers. */
  step: string | null;
  model: string;
  licence: string;
  /** Turn about Y, in degrees, applied before centring, so its front faces +Z. */
  yaw: number;
  /** Turn about X, in degrees, applied first: Pixal3D builds in its estimated
   *  camera's frame, so a model can come out leaning by the reference's view
   *  angle. Measured from a plane fitted to the base, not judged by eye. */
  pitch: number;
  /** Pull the shading the generator baked into the albedo back toward flat,
   *  0 (off) to 1; for models that double-shade under the scene's sun. */
  flattenShading: number;
}

const HUNYUAN = "Hunyuan3D-2.1";
const HUNYUAN_LICENCE =
  "Tencent Hunyuan 3D 2.1 Community License (its territory excludes the EU, UK and South Korea; the owner accepted that on 2026-10-29)";

/** One toy piece from Hunyuan3D-2.1, standing level as generated, its
 *  albedo kept: only the yaw that brings its front to +Z differs. */
function toy(kind: Kind, id: string, step: string | null, yaw = 0): PathModel {
  return {
    id,
    kind,
    step,
    model: HUNYUAN,
    licence: HUNYUAN_LICENCE,
    yaw,
    pitch: 0,
    flattenShading: 0,
  };
}

/** One per board landmark (`SceneAsset.id` in
 *  `src/components/path/scene/scene-assets.ts`). The yaws were picked on
 *  renders of each master; the reasons are in `docs/path-assets.md`. */
export const LANDMARKS: readonly PathModel[] = [
  toy("landmark", "home-school", "home"),
  toy("landmark", "turin-mole", "turin", -90),
  toy("landmark", "switzerland-jet-d-eau", "switzerland"),
  toy("landmark", "cuneo-2022-schoolroom", "cuneo-2022"),
  toy("landmark", "lille-bourse", "lille"),
  toy("landmark", "lille-belfry", "lille"),
  toy("landmark", "now-office", "now"),
];

/** The board's other pieces, each standing in for a piece `props.ts` builds
 *  in code: the same name, except `ferraris-coils` for `coils`, `next-plinth`
 *  for `blank`, and the two trees for the `trees*` clusters. Static bodies
 *  only: the moving parts (the coils' rotor, the dial's needle, the window's
 *  shutters, the clock's hands) are left to code. The trees and the side props
 *  belong to no step. */
export const PROPS: readonly PathModel[] = [
  toy("prop", "bisalta", "home"),
  toy("prop", "ferraris-coils", "turin"),
  toy("prop", "chablais", "switzerland", -71.3),
  toy("prop", "sailboat", "switzerland"),
  toy("prop", "roche-dial", "switzerland"),
  toy("prop", "mvp-window", "cuneo-2022"),
  toy("prop", "clock-face", "lille"),
  toy("prop", "startup-desk", "now"),
  toy("prop", "next-plinth", "next"),
  toy("prop", "tree-round", null),
  toy("prop", "tree-conifer", null),
  toy("prop", "quadrell", null),
  toy("prop", "oracolo", null),
];

/** The two pieces that walk the path: Lorenzo and the robot. Each is one unit
 *  tall like everything else; their relative size is the scene's to set. */
export const MARKERS: readonly PathModel[] = [
  toy("marker", "marker-lorenzo", null),
  toy("marker", "marker-robot", null),
];

/** Every model the script prepares, in the order it prepares them. */
export const MODELS: readonly PathModel[] = [
  ...LANDMARKS,
  ...PROPS,
  ...MARKERS,
];

/* ---------- normalisation ---------- */

/** A column-major 4×4: turn by `yaw` about Y, then scale by `scale`, then
 *  move by `offset`. */
export function similarity(
  yawDegrees: number,
  scale: number,
  offset: vec3,
): mat4 {
  const a = (yawDegrees * Math.PI) / 180;
  const c = Math.cos(a) * scale;
  const s = Math.sin(a) * scale;
  // prettier-ignore
  return [
    c, 0, -s, 0,
    0, scale, 0, 0,
    s, 0, c, 0,
    offset[0], offset[1], offset[2], 1,
  ];
}

/** A column-major 4×4 turn by `pitchDegrees` about X: +Y toward +Z. */
function pitchMatrix(pitchDegrees: number): mat4 {
  const a = (pitchDegrees * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  // prettier-ignore
  return [
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ];
}

export interface Normalisation {
  upAxis: "+Y";
  pitch: number;
  yaw: number;
  /** The uniform scale applied, after baking every node transform. */
  scale: number;
  /** The translation applied after scaling. */
  offset: vec3;
  /** The generator's bounding box after baking, the pitch and the yaw, before scaling. */
  sourceSize: vec3;
}

/** Bakes every node transform into its mesh, then turns, scales and moves the
 *  whole scene so it stands on y = 0, centred on x and z, one unit tall. glTF
 *  is Y-up by definition and every generator here writes it so; the yaw and,
 *  for a leaning Pixal3D model, the pitch are chosen per landmark. */
export function normalise(
  document: Document,
  yaw: number,
  pitch = 0,
): Normalisation {
  const root = document.getRoot();
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  if (!scene) throw new Error("no scene");

  const baked = new Set<Mesh>();
  scene.traverse((node) => {
    const mesh = node.getMesh();
    if (mesh) {
      if (baked.has(mesh)) throw new Error("instanced meshes are not handled");
      transformMesh(mesh, node.getWorldMatrix());
      baked.add(mesh);
    }
  });
  scene.traverse((node) => {
    node
      .setTranslation([0, 0, 0])
      .setRotation([0, 0, 0, 1])
      .setScale([1, 1, 1]);
  });

  const level = pitchMatrix(pitch);
  const turn = similarity(yaw, 1, [0, 0, 0]);
  for (const mesh of baked) {
    transformMesh(mesh, level);
    transformMesh(mesh, turn);
  }
  const { min, max } = getBounds(scene);
  const size: vec3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  if (!(size[1] > 0)) throw new Error("the model has no height");
  const scale = 1 / size[1];
  const offset: vec3 = [
    (-(min[0] + max[0]) / 2) * scale,
    -min[1] * scale,
    (-(min[2] + max[2]) / 2) * scale,
  ];
  const place = similarity(0, scale, offset);
  for (const mesh of baked) transformMesh(mesh, place);
  return { upAxis: "+Y", pitch, yaw, scale, offset, sourceSize: size };
}

/* ---------- geometry ---------- */

export function triangleCount(document: Document): number {
  return document
    .getRoot()
    .listMeshes()
    .flatMap((mesh) => mesh.listPrimitives())
    .reduce((count, prim) => count + getGLPrimitiveCount(prim), 0);
}

/** Simplifies a welded document to at most `target` triangles. The simplifier
 *  takes a ratio and stops early where the error allows, so this narrows the
 *  ratio until the result fits. Seams stay: meshoptimizer keeps vertices whose
 *  UVs split, and the open borders are locked. A mesh unwrapped into many
 *  charts runs out of collapses first (a Pixal3D 10k master floors near 5k),
 *  and then `acrossSeams` finishes the job. */
export async function simplifyTo(
  document: Document,
  target: number,
): Promise<Document> {
  const start = triangleCount(document);
  if (start <= target) return document;
  let ratio = target / start;
  let previous = start;
  for (let attempt = 0; attempt < 8; attempt++) {
    const trial = cloneDocument(document);
    await trial.transform(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio,
        error: SIMPLIFY_ERROR,
        lockBorder: true,
      }),
    );
    const count = triangleCount(trial);
    if (count <= target) return trial;
    if (count > previous * 0.98) break; // stalled on the seams
    previous = count;
    ratio *= (target / count) * 0.97;
  }
  return acrossSeams(document, target);
}

/** The fallback: meshoptimizer's permissive mode may collapse across a UV
 *  seam, weighing the UV change against the move, so the texture shifts
 *  least where it would show. Each primitive gets its share of `target`. */
async function acrossSeams(
  document: Document,
  target: number,
): Promise<Document> {
  const result = cloneDocument(document);
  const start = triangleCount(result);
  for (const mesh of result.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      const position = prim.getAttribute("POSITION");
      if (!indices || !position)
        throw new Error("simplify needs indexed positions");
      const share = Math.floor((indices.getCount() / 3 / start) * target) * 3;
      const uv = prim.getAttribute("TEXCOORD_0");
      const [kept] = uv
        ? MeshoptSimplifier.simplifyWithAttributes(
            new Uint32Array(indices.getArray()!),
            new Float32Array(position.getArray()!),
            3,
            new Float32Array(uv.getArray()!),
            2,
            [0.5, 0.5],
            null,
            share,
            SIMPLIFY_ERROR,
            ["Permissive"],
          )
        : MeshoptSimplifier.simplify(
            new Uint32Array(indices.getArray()!),
            new Float32Array(position.getArray()!),
            3,
            share,
            SIMPLIFY_ERROR,
            ["Permissive"],
          );
      indices.setArray(new Uint32Array(kept));
    }
  }
  await result.transform(prune());
  const count = triangleCount(result);
  if (count > target)
    throw new Error(`could not simplify to ${target} triangles (${count})`);
  return result;
}

/** Area-weighted vertex normals for an indexed primitive, shared by every
 *  vertex at one position so the UV seams do not show as creases. Not the
 *  `normals()` transform: that one writes flat normals and unwelds the mesh. */
export function smoothNormals(document: Document, prim: Primitive): void {
  const position = prim.getAttribute("POSITION");
  const indices = prim.getIndices();
  if (!position || !indices) return;
  const count = position.getCount();
  const key = (i: number) => position.getElement(i, []).join(",");
  const group = new Map<string, number>();
  const groupOf = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    const k = key(i);
    if (!group.has(k)) group.set(k, group.size);
    groupOf[i] = group.get(k)!;
  }
  const sum = new Float64Array(group.size * 3);
  const a: number[] = [];
  const b: number[] = [];
  const c: number[] = [];
  for (let t = 0; t < indices.getCount(); t += 3) {
    const [ia, ib, ic] = [
      indices.getScalar(t),
      indices.getScalar(t + 1),
      indices.getScalar(t + 2),
    ];
    position.getElement(ia, a);
    position.getElement(ib, b);
    position.getElement(ic, c);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    for (const i of [ia, ib, ic]) {
      const g = groupOf[i] * 3;
      sum[g] += n[0];
      sum[g + 1] += n[1];
      sum[g + 2] += n[2];
    }
  }
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const g = groupOf[i] * 3;
    const length = Math.hypot(sum[g], sum[g + 1], sum[g + 2]) || 1;
    out[i * 3] = sum[g] / length;
    out[i * 3 + 1] = sum[g + 1] / length;
    out[i * 3 + 2] = sum[g + 2] / length;
  }
  const buffer = document.getRoot().listBuffers()[0];
  prim.setAttribute(
    "NORMAL",
    document.createAccessor().setType("VEC3").setArray(out).setBuffer(buffer),
  );
}

/* ---------- textures ---------- */

function baseColourTextures(document: Document): Set<Texture> {
  const found = new Set<Texture>();
  for (const material of document.getRoot().listMaterials()) {
    const texture = material.getBaseColorTexture();
    if (texture) found.add(texture);
  }
  return found;
}

/** Divides out the low-frequency light the generator painted into the
 *  albedo: each pixel's colour is scaled by the mean luminance over its
 *  blurred neighbourhood's luminance, mixed in by `strength`. Detail finer
 *  than the blur (brick, mouldings) survives; broad lit and shaded sides
 *  even out, so the scene's own sun does the shading. */
export async function flattenShading(
  image: Uint8Array,
  strength: number,
): Promise<Uint8Array> {
  const input = sharp(image).ensureAlpha();
  const { data, info } = await input
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sigma = Math.max(info.width, info.height) / 24;
  const blurred = await sharp(image).greyscale().blur(sigma).raw().toBuffer();
  let total = 0;
  for (const value of blurred) total += value;
  const mean = total / blurred.length;
  const out = Buffer.alloc(data.length);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const gain = 1 + strength * (mean / Math.max(blurred[p], 8) - 1);
    for (let c = 0; c < 3; c++) {
      out[i + c] = Math.min(255, Math.round(data[i + c] * gain));
    }
    out[i + 3] = data[i + 3];
  }
  return sharp(out, { raw: info }).png().toBuffer();
}

/* ---------- files ---------- */

let io: NodeIO | undefined;
async function gltfIO(): Promise<NodeIO> {
  if (!io) {
    await MeshoptDecoder.ready;
    await MeshoptEncoder.ready;
    io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
      "meshopt.decoder": MeshoptDecoder,
      "meshopt.encoder": MeshoptEncoder,
    });
  }
  return io;
}

export async function readGlb(file: string): Promise<Document> {
  return (await gltfIO()).read(file);
}

/** Encodes every texture as lossy WebP: the base colour inside `side` × `side`,
 *  the metallic-roughness and any other map at half that, where its detail
 *  cannot read at the scene's distance. Done here rather than by
 *  `textureCompress`, which reads a lossless WebP's size as 0 and cannot resize
 *  the masters. */
async function shippedTextures(
  document: Document,
  side: number,
): Promise<void> {
  document.createExtension(EXTTextureWebP).setRequired(true);
  const colour = baseColourTextures(document);
  for (const texture of document.getRoot().listTextures()) {
    const image = texture.getImage();
    if (!image) continue;
    const fit = colour.has(texture) ? side : side / 2;
    const webp = await sharp(image)
      .resize(fit, fit, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toBuffer();
    texture.setImage(webp).setMimeType("image/webp");
  }
}

/** The masters' texture quality: lossy, at full resolution, so the 22
 *  masters stay small enough for plain git. */
export const MASTER_WEBP_QUALITY = 85;

/** Re-encodes every texture as lossy WebP at `MASTER_WEBP_QUALITY`, at its
 *  own size. Every one is converted, whatever its declared type: Hunyuan
 *  labels a JPEG `image/png`. */
async function masterTextures(document: Document): Promise<void> {
  for (const texture of document.getRoot().listTextures()) {
    const image = texture.getImage();
    if (!image) continue;
    const webp = await sharp(image)
      .webp({ quality: MASTER_WEBP_QUALITY, effort: 6 })
      .toBuffer();
    document.createExtension(EXTTextureWebP).setRequired(true);
    texture.setImage(webp).setMimeType("image/webp");
  }
}

/** Keeps a raw generator output as the master: meshopt at 16 bits, textures
 *  lossy WebP, nothing simplified or resized. */
export async function importRaw(
  file: string,
  id: string,
  vendorDir = VENDOR,
): Promise<number> {
  const document = await readGlb(file);
  await masterTextures(document);
  await document.transform(
    dedup(),
    meshopt({
      encoder: MeshoptEncoder,
      quantizePosition: 16,
      quantizeTexcoord: 16,
      quantizeNormal: 12,
    }),
    prune(),
  );
  await mkdir(vendorDir, { recursive: true });
  const bytes = await (await gltfIO()).writeBinary(document);
  await writeFile(path.join(vendorDir, `${id}.glb`), bytes);
  return bytes.length;
}

export interface Shipped {
  file: string;
  triangles: number;
  bytes: number;
  texture: number;
}

async function ship(
  master: Document,
  asset: PathModel,
  detail: Detail,
  outDir: string,
): Promise<Shipped> {
  const { triangles, texture } = DETAIL[asset.kind][detail];
  const welded = cloneDocument(master);
  await welded.transform(weld());
  const document = await simplifyTo(welded, triangles);
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (!prim.getAttribute("NORMAL")) smoothNormals(document, prim);
    }
  }
  await shippedTextures(document, texture);
  await document.transform(
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
    prune(),
  );
  const name = detail === "full" ? `${asset.id}.glb` : `${asset.id}.lod.glb`;
  const bytes = await (await gltfIO()).writeBinary(document);
  await writeFile(path.join(outDir, name), bytes);
  return {
    file: `/path/models/${name}`,
    triangles: triangleCount(document),
    bytes: bytes.length,
    texture,
  };
}

export interface ManifestEntry {
  kind: Kind;
  step: string | null;
  file: string;
  lodFile: string;
  triangles: number;
  lodTriangles: number;
  bytes: number;
  lodBytes: number;
  model: string;
  licence: string;
  normalisation: Normalisation & { flattenShading: number };
}

/** Cuts the shipped pair from a master, by default the model's own in
 *  `vendor/path-models/` into `public/path/models/`; the bake-off renders
 *  candidates through the same steps from elsewhere. */
export async function prepare(
  asset: PathModel,
  source = path.join(VENDOR, `${asset.id}.glb`),
  outDir = OUT,
): Promise<ManifestEntry> {
  const master = await readGlb(source);
  // The master is stored quantized; the simplifier weighs UVs as floats in 0–1.
  await master.transform(dequantize());
  const normalisation = normalise(master, asset.yaw, asset.pitch);
  if (asset.flattenShading > 0) {
    for (const texture of baseColourTextures(master)) {
      const image = texture.getImage();
      if (!image) continue;
      texture
        .setImage(await flattenShading(image, asset.flattenShading))
        .setMimeType("image/png");
    }
  }
  await mkdir(outDir, { recursive: true });
  const full = await ship(master, asset, "full", outDir);
  const lod = await ship(master, asset, "lod", outDir);
  return {
    kind: asset.kind,
    step: asset.step,
    file: full.file,
    lodFile: lod.file,
    triangles: full.triangles,
    lodTriangles: lod.triangles,
    bytes: full.bytes,
    lodBytes: lod.bytes,
    model: asset.model,
    licence: asset.licence,
    normalisation: {
      ...normalisation,
      flattenShading: asset.flattenShading,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--import") {
    const [, file, id] = args;
    if (!file || !id) throw new Error("--import <glb> <id>");
    const before = (await stat(file)).size;
    const after = await importRaw(file, id);
    console.log(
      `${id}: ${(before / 1e6).toFixed(2)} MB → ${(after / 1e6).toFixed(2)} MB`,
    );
    return;
  }

  await mkdir(OUT, { recursive: true });
  const manifests = new Map<string, Record<string, ManifestEntry>>();
  let failed = false;
  for (const asset of MODELS) {
    const entry = await prepare(asset);
    const file = MANIFEST[asset.kind];
    manifests.set(file, { ...manifests.get(file), [asset.id]: entry });
    const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;
    console.log(
      `${asset.id}: ${entry.triangles} tris ${kb(entry.bytes)}; ` +
        `LOD ${entry.lodTriangles} tris ${kb(entry.lodBytes)}`,
    );
    const budget = DETAIL[asset.kind];
    if (
      entry.bytes > budget.full.maxBytes ||
      entry.lodBytes > budget.lod.maxBytes
    ) {
      console.error(`${asset.id}: over its byte budget`);
      failed = true;
    }
  }
  for (const [file, manifest] of manifests) {
    const previous = await readFile(file, "utf8").catch(() => "");
    // Formatted as `format:check` expects, so a rerun leaves the checked-in manifest alone.
    const next = await format(JSON.stringify(manifest), { filepath: file });
    if (previous !== next) await writeFile(file, next);
  }
  if (failed) process.exit(1);
}

/* Run as a script, not when a test imports the functions above. */
if (path.basename(process.argv[1] ?? "") === "prepare-path-landmarks.ts") {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
