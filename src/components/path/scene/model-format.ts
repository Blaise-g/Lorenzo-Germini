/* A scene model as `/path` ships it (GH-149): a Hunyuan3D silhouette reduced to
   positions and triangles, with no normals, no UVs and no colours — the
   runtime shades it flat in a palette role, so the model carries only its
   shape. Positions are quantised to 16 bits over the model's bounds, which
   at a few metres of scene is well under a millimetre. Written by
   `scripts/prepare-path-model.ts`, read by the runtime; no three.js here, so
   a spec reads it directly.

   Layout, little-endian:
     u32 magic, u32 vertex count, u32 index count,
     f32 × 3 minimum, f32 × 3 extent,
     u16 × 3 per vertex, padded to 4 bytes,
     u16 per index (u32 above 65 535 vertices). */

const MAGIC = 0x314d5450; // "PTM1"
const HEADER_BYTES = 36;
const STEPS = 0xffff;

export type ModelMesh = {
  positions: Float32Array;
  indices: Uint16Array | Uint32Array;
};

const pad4 = (bytes: number) => Math.ceil(bytes / 4) * 4;

/** The smallest and largest value on each axis of `x, y, z` triples. */
export function bounds(positions: ArrayLike<number>) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    min[i % 3] = Math.min(min[i % 3], positions[i]);
    max[i % 3] = Math.max(max[i % 3], positions[i]);
  }
  return { min, max };
}

export function encodeModel(mesh: ModelMesh): ArrayBuffer {
  const { positions, indices } = mesh;
  const vertexCount = positions.length / 3;
  const { min, max } = bounds(positions);
  const extent = max.map((value, axis) => value - min[axis]);

  const wide = vertexCount > STEPS;
  const positionBytes = pad4(vertexCount * 6);
  const buffer = new ArrayBuffer(
    HEADER_BYTES + positionBytes + indices.length * (wide ? 4 : 2),
  );
  const view = new DataView(buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, vertexCount, true);
  view.setUint32(8, indices.length, true);
  for (let axis = 0; axis < 3; axis++) {
    view.setFloat32(12 + axis * 4, min[axis], true);
    view.setFloat32(24 + axis * 4, extent[axis], true);
  }
  for (let i = 0; i < positions.length; i++) {
    const axis = i % 3;
    const t = extent[axis] > 0 ? (positions[i] - min[axis]) / extent[axis] : 0;
    view.setUint16(HEADER_BYTES + i * 2, Math.round(t * STEPS), true);
  }
  const indexStart = HEADER_BYTES + positionBytes;
  indices.forEach((index, i) => {
    if (wide) view.setUint32(indexStart + i * 4, index, true);
    else view.setUint16(indexStart + i * 2, index, true);
  });
  return buffer;
}

export function decodeModel(buffer: ArrayBuffer): ModelMesh {
  const view = new DataView(buffer);
  if (buffer.byteLength < HEADER_BYTES || view.getUint32(0, true) !== MAGIC) {
    throw new Error("Not a path model");
  }
  const vertexCount = view.getUint32(4, true);
  const indexCount = view.getUint32(8, true);
  const wide = vertexCount > STEPS;
  const positionBytes = pad4(vertexCount * 6);
  const expected = HEADER_BYTES + positionBytes + indexCount * (wide ? 4 : 2);
  if (buffer.byteLength !== expected) {
    throw new Error(
      `A path model of ${buffer.byteLength} bytes, expected ${expected}`,
    );
  }
  const min = [0, 1, 2].map((axis) => view.getFloat32(12 + axis * 4, true));
  const extent = [0, 1, 2].map((axis) => view.getFloat32(24 + axis * 4, true));
  const positions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < positions.length; i++) {
    const axis = i % 3;
    const t = view.getUint16(HEADER_BYTES + i * 2, true) / STEPS;
    positions[i] = min[axis] + t * extent[axis];
  }
  const indexStart = HEADER_BYTES + positionBytes;
  const indices = wide
    ? new Uint32Array(buffer.slice(indexStart))
    : new Uint16Array(buffer.slice(indexStart));
  /* A corrupt file fails here, into the stills, rather than drawing noise. */
  if (indices.some((index) => index >= vertexCount)) {
    throw new Error("A path model with a triangle past its vertices");
  }
  return { positions, indices };
}
