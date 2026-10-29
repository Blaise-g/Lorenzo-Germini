/* The path scene's image-to-3D landmarks, props and markers: the manifests
   the integrating scene reads, the GLBs they name, and the normalisation that
   makes them interchangeable. No browser: the files are read with glTF-Transform. */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { Document, NodeIO, type vec3 } from "@gltf-transform/core";
import {
  EXTMeshoptCompression,
  KHRMeshQuantization,
} from "@gltf-transform/extensions";
import { getBounds, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { LANDMARK_INDEX } from "@/components/path/scene/scene-assets";
import {
  DETAIL,
  LANDMARKS,
  MANIFEST,
  MODELS,
  flattenShading,
  normalise,
  prepare,
  readGlb,
  simplifyTo,
  smoothNormals,
  triangleCount,
  type Detail,
  type ManifestEntry,
} from "../scripts/prepare-path-landmarks";

/** Meshopt stores positions at 14 bits by default: about 1e-4 of the extent. */
const QUANTISED = 2e-3;
/** The LOD keeps the full file's placement, so the scene can swap one for the
 *  other without a jump; simplifying may pull its extremes in by this much. */
const LOD_DRIFT = 0.01;
/** The masters together, the top of the 10–15 MB the owner set so they stay
 *  in plain git rather than LFS. */
const MASTERS_MAX_BYTES = 15_000_000;

const shipped = (file: string) => path.join(process.cwd(), "public", file);

async function manifest(file: string): Promise<Record<string, ManifestEntry>> {
  return JSON.parse(await readFile(file, "utf8"));
}

function sceneBounds(document: Document) {
  const scene = document.getRoot().listScenes()[0];
  const { min, max } = getBounds(scene);
  return { min, max };
}

test.describe("the manifests", () => {
  for (const file of new Set(Object.values(MANIFEST))) {
    test(`${path.basename(file)} lists exactly the models the script prepares for it`, async () => {
      const entries = await manifest(file);
      expect(Object.keys(entries).sort()).toEqual(
        MODELS.filter((asset) => MANIFEST[asset.kind] === file)
          .map((asset) => asset.id)
          .sort(),
      );
    });
  }

  test("only the landmarks are written to the index the scene reads: it takes each id there for one", () => {
    const index = path.join(process.cwd(), "public", LANDMARK_INDEX);
    for (const kind of Object.keys(MANIFEST) as (keyof typeof MANIFEST)[]) {
      expect(MANIFEST[kind] === index, kind).toBe(kind === "landmark");
    }
  });

  test("each model has its master, and its entry matches what the script applies", async () => {
    for (const asset of MODELS) {
      const entries = await manifest(MANIFEST[asset.kind]);
      const master = path.join(
        process.cwd(),
        "vendor",
        "path-models",
        `${asset.id}.glb`,
      );
      expect((await stat(master)).size, asset.id).toBeGreaterThan(0);
      expect(entries[asset.id].model, asset.id).toBe(asset.model);
      expect(entries[asset.id].licence, asset.id).toBe(asset.licence);
      // A placement edited without a rerun leaves the shipped files stale.
      const { kind, step, normalisation } = entries[asset.id];
      expect({ kind, step, ...normalisation }, asset.id).toMatchObject({
        kind: asset.kind,
        step: asset.step,
        yaw: asset.yaw,
        pitch: asset.pitch,
        flattenShading: asset.flattenShading,
      });
    }
  });

  test("the masters keep lossy WebP textures, small enough for plain git", async () => {
    let total = 0;
    for (const asset of MODELS) {
      const master = path.join(
        process.cwd(),
        "vendor",
        "path-models",
        `${asset.id}.glb`,
      );
      total += (await stat(master)).size;
      for (const texture of (await readGlb(master)).getRoot().listTextures()) {
        expect(texture.getMimeType(), asset.id).toBe("image/webp");
        // A lossy WebP's first chunk is `VP8 `; a lossless one's is `VP8L`.
        const chunk = Buffer.from(texture.getImage()!.subarray(12, 16));
        expect(chunk.toString("latin1"), asset.id).toBe("VP8 ");
      }
    }
    expect(total).toBeLessThanOrEqual(MASTERS_MAX_BYTES);
  });

  for (const asset of MODELS) {
    for (const detail of ["full", "lod"] as Detail[]) {
      test(`${asset.id} (${detail}) exists, fits its budget, parses and is normalised`, async () => {
        const entry = (await manifest(MANIFEST[asset.kind]))[asset.id];
        const file = detail === "full" ? entry.file : entry.lodFile;
        const recordedBytes = detail === "full" ? entry.bytes : entry.lodBytes;
        const recordedTriangles =
          detail === "full" ? entry.triangles : entry.lodTriangles;
        const budget = DETAIL[asset.kind][detail];

        const bytes = (await stat(shipped(file))).size;
        expect(bytes).toBe(recordedBytes);
        expect(bytes).toBeLessThanOrEqual(budget.maxBytes);

        const document = await readGlb(shipped(file));
        const used = document
          .getRoot()
          .listExtensionsUsed()
          .map((extension) => extension.extensionName);
        expect(used).toContain("EXT_meshopt_compression");
        expect(used).toContain("EXT_texture_webp");

        const triangles = triangleCount(document);
        expect(triangles).toBe(recordedTriangles);
        expect(triangles).toBeLessThanOrEqual(budget.triangles);
        expect(triangles).toBeGreaterThan(budget.triangles * 0.8);

        const { min, max } = sceneBounds(document);
        const drift = detail === "full" ? QUANTISED : LOD_DRIFT;
        expect(min[1]).toBeGreaterThan(-QUANTISED);
        expect(min[1]).toBeLessThan(drift);
        expect(max[1]).toBeLessThan(1 + QUANTISED);
        expect(max[1]).toBeGreaterThan(1 - drift);
        expect(Math.abs((min[0] + max[0]) / 2)).toBeLessThan(drift);
        expect(Math.abs((min[2] + max[2]) / 2)).toBeLessThan(drift);

        const textures = document.getRoot().listTextures();
        expect(textures.length).toBeGreaterThan(0);
        for (const texture of textures) {
          expect(texture.getMimeType()).toBe("image/webp");
          const meta = await sharp(texture.getImage()!).metadata();
          expect(meta.format).toBe("webp");
          expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(
            budget.texture,
          );
        }
        for (const mesh of document.getRoot().listMeshes()) {
          for (const prim of mesh.listPrimitives()) {
            expect(prim.getAttribute("NORMAL"), mesh.getName()).toBeTruthy();
          }
        }
      });
    }
  }
});

/* A box from `min` to `max`, as one indexed primitive under a node. */
function boxDocument(min: vec3, max: vec3) {
  const document = new Document();
  const buffer = document.createBuffer();
  const corners: number[] = [];
  for (const x of [min[0], max[0]])
    for (const y of [min[1], max[1]])
      for (const z of [min[2], max[2]]) corners.push(x, y, z);
  // prettier-ignore
  const faces = [
    0, 1, 3, 0, 3, 2,  4, 6, 7, 4, 7, 5,  0, 4, 5, 0, 5, 1,
    2, 3, 7, 2, 7, 6,  0, 2, 6, 0, 6, 4,  1, 5, 7, 1, 7, 3,
  ];
  const prim = document
    .createPrimitive()
    .setAttribute(
      "POSITION",
      document
        .createAccessor()
        .setType("VEC3")
        .setArray(new Float32Array(corners))
        .setBuffer(buffer),
    )
    .setIndices(
      document
        .createAccessor()
        .setType("SCALAR")
        .setArray(new Uint32Array(faces))
        .setBuffer(buffer),
    );
  const mesh = document.createMesh("box").addPrimitive(prim);
  const node = document.createNode("box").setMesh(mesh);
  const scene = document.createScene().addChild(node);
  document.getRoot().setDefaultScene(scene);
  return { document, node, prim, scene };
}

test.describe("normalise", () => {
  test("bakes node and parent transforms, then stands the model one unit tall on the origin", () => {
    const { document, node, scene } = boxDocument([0, 0, 0], [2, 3, 1]);
    const parent = document
      .createNode("parent")
      .setTranslation([10, -4, 7])
      .setScale([2, 2, 2]);
    scene.removeChild(node);
    parent.addChild(node);
    scene.addChild(parent);
    node.setTranslation([1, 1, 1]);

    const result = normalise(document, 0);

    const { min, max } = sceneBounds(document);
    expect(min[1]).toBeCloseTo(0, 6);
    expect(max[1]).toBeCloseTo(1, 6);
    expect((min[0] + max[0]) / 2).toBeCloseTo(0, 6);
    expect((min[2] + max[2]) / 2).toBeCloseTo(0, 6);
    // The box is 2 × 3 × 1, doubled by its parent: 4 × 6 × 2 in the world.
    expect(result.sourceSize[0]).toBeCloseTo(4, 6);
    expect(result.sourceSize[1]).toBeCloseTo(6, 6);
    expect(result.scale).toBeCloseTo(1 / 6, 6);
    expect(max[0] - min[0]).toBeCloseTo(4 / 6, 6);
    // Nothing is left on the nodes for a loader to apply twice.
    for (const each of document.getRoot().listNodes()) {
      expect(each.getMatrix()).toEqual([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
      ]);
    }
  });

  test("a quarter turn of pitch stands a lying box on its end", () => {
    // 2 wide, 1 tall, 4 deep: pitched +Y toward +Z, the depth becomes the height.
    const { document } = boxDocument([0, 0, 0], [2, 1, 4]);
    const result = normalise(document, 0, 90);
    const { min, max } = sceneBounds(document);
    expect(result.sourceSize[1]).toBeCloseTo(4, 6);
    expect(max[0] - min[0]).toBeCloseTo(0.5, 6);
    expect(max[1] - min[1]).toBeCloseTo(1, 6);
    expect(max[2] - min[2]).toBeCloseTo(0.25, 6);
  });

  test("a quarter turn of yaw swaps the footprint's width and depth", () => {
    const { document } = boxDocument([0, 0, 0], [4, 2, 1]);
    normalise(document, 90);
    const { min, max } = sceneBounds(document);
    expect(max[0] - min[0]).toBeCloseTo(0.5, 6);
    expect(max[2] - min[2]).toBeCloseTo(2, 6);
    expect(max[1] - min[1]).toBeCloseTo(1, 6);
  });
});

test.describe("simplifyTo", () => {
  /* An n × n grid over a gentle dome, every quad its own UV chart, so each
     edge is a seam: the most a many-chart generator unwrap can be. */
  function chartedGrid(n: number) {
    const document = new Document();
    const buffer = document.createBuffer();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const height = (x: number, z: number) =>
      0.2 * Math.sin(Math.PI * x) * Math.sin(Math.PI * z);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const base = positions.length / 3;
        for (const [dx, dz] of [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ]) {
          const x = (i + dx) / n;
          const z = (j + dz) / n;
          positions.push(x, height(x, z), z);
          // Each chart sits in its own cell of the atlas, with a gutter.
          uvs.push((i + 0.1 + 0.8 * dx) / n, (j + 0.1 + 0.8 * dz) / n);
        }
        indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
      }
    }
    const accessor = (
      type: "VEC3" | "VEC2" | "SCALAR",
      array: Float32Array<ArrayBuffer> | Uint32Array<ArrayBuffer>,
    ) =>
      document.createAccessor().setType(type).setArray(array).setBuffer(buffer);
    const prim = document
      .createPrimitive()
      .setAttribute("POSITION", accessor("VEC3", new Float32Array(positions)))
      .setAttribute("TEXCOORD_0", accessor("VEC2", new Float32Array(uvs)))
      .setIndices(accessor("SCALAR", new Uint32Array(indices)));
    const node = document
      .createNode()
      .setMesh(document.createMesh().addPrimitive(prim));
    document.getRoot().setDefaultScene(document.createScene().addChild(node));
    return document;
  }

  test("reaches the target even where every edge is a UV seam, and keeps the outline", async () => {
    const document = chartedGrid(40);
    expect(triangleCount(document)).toBe(3200);
    const before = sceneBounds(document);

    const result = await simplifyTo(document, 800);

    const triangles = triangleCount(result);
    expect(triangles).toBeLessThanOrEqual(800);
    expect(triangles).toBeGreaterThan(800 * 0.8);
    const after = sceneBounds(result);
    for (const axis of [0, 2]) {
      expect(after.min[axis]).toBeCloseTo(before.min[axis], 2);
      expect(after.max[axis]).toBeCloseTo(before.max[axis], 2);
    }
    expect(after.max[1]).toBeCloseTo(before.max[1], 1);
    // The source is left as it was: the full and LOD are both cut from it.
    expect(triangleCount(document)).toBe(3200);
  });

  test("prepare cuts the LOD from a master stored as --import stores it: meshopt, quantized", async () => {
    // Quantized UVs read back as integers; weighed as such, no collapse is cheap enough.
    await MeshoptEncoder.ready;
    const document = chartedGrid(40);
    document.createExtension(EXTMeshoptCompression).setRequired(true);
    document.createExtension(KHRMeshQuantization).setRequired(true);
    await document.transform(
      meshopt({
        encoder: MeshoptEncoder,
        quantizePosition: 16,
        quantizeTexcoord: 16,
      }),
    );
    const dir = test.info().outputPath();
    await mkdir(dir, { recursive: true });
    const master = path.join(dir, "grid.glb");
    const io = new NodeIO()
      .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
      .registerDependencies({
        "meshopt.decoder": MeshoptDecoder,
        "meshopt.encoder": MeshoptEncoder,
      });
    await writeFile(master, await io.writeBinary(document));

    const entry = await prepare(
      {
        id: "grid",
        kind: "landmark",
        step: null,
        model: "",
        licence: "",
        yaw: 0,
        pitch: 0,
        flattenShading: 0,
      },
      master,
      dir,
    );

    expect(entry.triangles).toBe(3200);
    const { lod } = DETAIL.landmark;
    expect(entry.lodTriangles).toBeLessThanOrEqual(lod.triangles);
    expect(entry.lodTriangles).toBeGreaterThan(lod.triangles * 0.8);
  });
});

test.describe("smoothNormals", () => {
  test("a flat quad split along a UV seam gets the plane's normal everywhere", () => {
    const document = new Document();
    const buffer = document.createBuffer();
    // Two triangles in z = 0 that share an edge through duplicated vertices.
    // prettier-ignore
    const positions = new Float32Array([
      0, 0, 0,  1, 0, 0,  1, 1, 0,
      0, 0, 0,  1, 1, 0,  0, 1, 0,
    ]);
    const prim = document
      .createPrimitive()
      .setAttribute(
        "POSITION",
        document
          .createAccessor()
          .setType("VEC3")
          .setArray(positions)
          .setBuffer(buffer),
      )
      .setIndices(
        document
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint32Array([0, 1, 2, 3, 4, 5]))
          .setBuffer(buffer),
      );
    smoothNormals(document, prim);
    const normal = prim.getAttribute("NORMAL")!;
    expect(normal.getCount()).toBe(6);
    for (let i = 0; i < 6; i++) {
      const [x, y, z] = normal.getElement(i, [] as number[]);
      expect([x, y, z].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([
        0, 0, 1,
      ]);
    }
  });

  test("a fold whose edge is split, as a UV seam splits it, shades smooth across the seam", () => {
    const document = new Document();
    const buffer = document.createBuffer();
    // A floor (y = 0) and a wall (x = 0) meeting along the z axis. Each face
    // has its own copy of the shared edge's two vertices, as a seam leaves them.
    // prettier-ignore
    const positions = new Float32Array([
      0, 0, 0,  0, 0, 1,  1, 0, 0,   // floor, normal +y
      0, 0, 0,  0, 1, 0,  0, 0, 1,   // wall, normal +x
    ]);
    const prim = document
      .createPrimitive()
      .setAttribute(
        "POSITION",
        document
          .createAccessor()
          .setType("VEC3")
          .setArray(positions)
          .setBuffer(buffer),
      )
      .setIndices(
        document
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint32Array([0, 1, 2, 3, 4, 5]))
          .setBuffer(buffer),
      );
    smoothNormals(document, prim);
    const normal = prim.getAttribute("NORMAL")!;
    const k = Math.SQRT1_2;
    // Both copies of the edge's (0, 0, 0) and (0, 0, 1): halfway between +x and +y.
    for (const i of [0, 1, 3, 5]) {
      const [x, y, z] = normal.getElement(i, [] as number[]);
      expect(x, `vertex ${i}`).toBeCloseTo(k, 5);
      expect(y, `vertex ${i}`).toBeCloseTo(k, 5);
      expect(z, `vertex ${i}`).toBeCloseTo(0, 5);
    }
    // The vertices off the edge keep their own face's normal.
    expect(normal.getElement(2, [] as number[])).toEqual([0, 1, 0]);
    expect(normal.getElement(4, [] as number[])).toEqual([1, 0, 0]);
  });
});

test.describe("flattenShading", () => {
  /* One texture, its left half painted in shadow at 40% of the right. */
  async function shadedHalves() {
    const width = 256;
    const height = 128;
    const data = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const lit = x >= width / 2 ? 1 : 0.4;
        const brick = (x + y) % 8 < 4 ? 200 : 160;
        const i = (y * width + x) * 3;
        data[i] = Math.round(brick * lit);
        data[i + 1] = Math.round(brick * 0.55 * lit);
        data[i + 2] = Math.round(brick * 0.4 * lit);
      }
    }
    return sharp(data, { raw: { width, height, channels: 3 } })
      .png()
      .toBuffer();
  }

  async function halfMeans(image: Uint8Array) {
    const { data, info } = await sharp(image)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let left = 0;
    let right = 0;
    for (let y = 0; y < info.height; y++) {
      // Sample away from the boundary, where the blur mixes both halves.
      for (let x = 0; x < info.width / 4; x++) left += data[y * info.width + x];
      for (let x = (3 * info.width) / 4; x < info.width; x++)
        right += data[y * info.width + x];
    }
    return { left, right };
  }

  test("evens out the baked light: the shaded half moves toward the lit one", async () => {
    const before = await halfMeans(await shadedHalves());
    const after = await halfMeans(
      await flattenShading(await shadedHalves(), 1),
    );
    expect(before.left / before.right).toBeLessThan(0.45);
    expect(after.left / after.right).toBeGreaterThan(0.8);
  });

  test("at strength 0 it changes nothing", async () => {
    const source = await shadedHalves();
    const raw = (image: Uint8Array) =>
      sharp(image).removeAlpha().raw().toBuffer();
    expect(
      (await raw(await flattenShading(source, 0))).equals(await raw(source)),
    ).toBe(true);
  });
});
