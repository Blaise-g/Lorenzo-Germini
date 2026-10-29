/* Turns a Hunyuan3D mesh into a `/path` scene model (#149): welds and
   decimates it with glTF-Transform, seats it on the origin at unit height,
   and writes the positions-and-triangles format the runtime reads
   (`src/components/path/scene/model-format.ts`) under `public/path/models`.
   The model keeps no texture or colour: the runtime paints it in a palette
   role, which is the recolour research §9 asks for.

     bun run prepare:path-model <in.glb> <name> [--ratio 0.05]

   `--ratio` is the share of triangles kept. glTF-Transform runs through
   `bunx` at a pinned version, so it adds nothing to the lockfile. */

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { bounds, encodeModel } from "../src/components/path/scene/model-format";

/* §9's budget for a Hunyuan3D prop. */
const MAX_BYTES = 300 * 1024;
const GLTF_TRANSFORM = "@gltf-transform/cli@4.5.1";

const [input, name, ...flags] = process.argv.slice(2);
if (!input || !name) {
  console.error(
    "Usage: bun run prepare:path-model <in.glb> <name> [--ratio r]",
  );
  process.exit(1);
}
const ratioFlag = flags.indexOf("--ratio");
const ratio = ratioFlag >= 0 ? Number(flags[ratioFlag + 1]) : 0.05;
if (!(ratio > 0 && ratio <= 1)) {
  console.error(
    "--ratio is the share of triangles kept, above 0 and at most 1",
  );
  process.exit(1);
}

function gltfTransform(...args: string[]) {
  const result = spawnSync("bunx", [GLTF_TRANSFORM, ...args], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  if (result.status !== 0) throw new Error(`gltf-transform ${args[0]} failed`);
}

const scratch = await mkdtemp(path.join(tmpdir(), "path-model-"));
const welded = path.join(scratch, "welded.glb");
const simplified = path.join(scratch, "simplified.glb");
gltfTransform("weld", input, welded);
gltfTransform(
  "simplify",
  welded,
  simplified,
  "--ratio",
  String(ratio),
  "--error",
  "0.01",
);

/* A GLB is a 12-byte header, a JSON chunk, then a binary chunk. */
const glb = await readFile(simplified);
await rm(scratch, { recursive: true });
const jsonLength = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString("utf8"));
const binStart = 20 + jsonLength + 8;

type Accessor = {
  bufferView: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
};
function read(index: number): Float32Array | Uint16Array | Uint32Array {
  const accessor: Accessor = gltf.accessors[index];
  const view = gltf.bufferViews[accessor.bufferView];
  const offset = binStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const width = { SCALAR: 1, VEC3: 3 }[accessor.type];
  if (!width) throw new Error(`Unhandled accessor type ${accessor.type}`);
  /* A stride that is the element's own size is tightly packed. */
  if (view.byteStride && view.byteStride !== width * 4) {
    throw new Error("Interleaved buffers are not handled");
  }
  const length = accessor.count * width;
  const bytes = glb.buffer.slice(glb.byteOffset + offset);
  switch (accessor.componentType) {
    case 5126:
      return new Float32Array(bytes, 0, length);
    case 5125:
      return new Uint32Array(bytes, 0, length);
    case 5123:
      return new Uint16Array(bytes, 0, length);
    default:
      throw new Error(`Unhandled component type ${accessor.componentType}`);
  }
}

if (gltf.meshes.length !== 1 || gltf.meshes[0].primitives.length !== 1) {
  throw new Error("Expected one mesh with one primitive");
}
const transformed = (gltf.nodes ?? []).some(
  (node: Record<string, unknown>) =>
    node.matrix || node.rotation || node.scale || node.translation,
);
if (transformed) throw new Error("Node transforms are not handled");

const primitive = gltf.meshes[0].primitives[0];
/* Mode 4 is triangles, glTF's default; weld always leaves an index. */
if ((primitive.mode ?? 4) !== 4 || primitive.indices === undefined) {
  throw new Error("Expected indexed triangles");
}
const positions = Float32Array.from(read(primitive.attributes.POSITION));
const indices = Uint32Array.from(read(primitive.indices));

/* Seated: its lowest point on y = 0, centred on x and z, one unit tall, so
   the scene places and scales it without knowing where Hunyuan put it. */
const { min, max } = bounds(positions);
const height = max[1] - min[1];
if (!(height > 0)) throw new Error("The mesh has no height to seat");
const origin = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
for (let i = 0; i < positions.length; i++) {
  positions[i] = (positions[i] - origin[i % 3]) / height;
}

const buffer = Buffer.from(encodeModel({ positions, indices }));
if (buffer.length > MAX_BYTES) {
  throw new Error(`${name} is ${buffer.length} bytes, over ${MAX_BYTES}`);
}
const file = path.join(
  process.cwd(),
  "public",
  "path",
  "models",
  `${name}.bin`,
);
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, buffer);
console.log(
  `${path.relative(process.cwd(), file)}  ${(buffer.length / 1024).toFixed(1)} KB, ` +
    `${indices.length / 3} triangles, ${positions.length / 3} vertices`,
);
