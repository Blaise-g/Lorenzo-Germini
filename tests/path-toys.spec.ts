/* The toy props and the duo (v3-toys): each prop's model, fitted to the
   stand-in it replaces, carrying the parts its beat moves, and the index
   naming every model the board asks for. The models are read here as the
   board reads them, into three.js, with their textures left out: the fit,
   the parts and the coils' split are geometry. */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { NodeIO, type Node as GltfNode } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { expect, test, type Page } from "@playwright/test";
import { MeshoptDecoder } from "meshoptimizer";
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Texture,
  Vector3,
  type Object3D,
} from "three";

import { LOOP, piecesOf } from "@/components/path/scene/board";
import { createPaint } from "@/components/path/scene/paint";
import { PALETTE_ROLES, type Palette } from "@/components/path/scene/palette";
import { BEAT_NODE, hasOwnParts } from "@/components/path/scene/piece-beats";
import {
  PROP_INDEX,
  PROP_MODELS,
  PROP_PLACEMENTS,
  placementOf,
  propFile,
  SIDE_MODELS,
} from "@/components/path/scene/scene-assets";
import {
  prepareModel,
  toyMarker,
  toyPiece,
  toySide,
} from "@/components/path/scene/toys";
import { MARKER } from "@/components/path/scene/world";

const publicFile = (url: string) => path.join(process.cwd(), "public", url);

/* The board's specs draw on the machine's GPU, as `path-lille.spec.ts`
   explains. */
test.use({
  launchOptions: {
    args: [
      "--mute-audio",
      "--use-angle=metal",
      "--enable-gpu",
      "--ignore-gpu-blocklist",
    ],
  },
});

/** A model as three.js holds it once loaded: its node tree, each mesh
 *  with its geometry and a textured material. */
async function readModel(id: string): Promise<Object3D> {
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const document = await io.read(publicFile(propFile(id)));
  const toThree = (node: GltfNode): Object3D => {
    const mesh = node.getMesh();
    let object: Object3D = new Group();
    if (mesh) {
      const primitive = mesh.listPrimitives()[0];
      const positions = primitive.getAttribute("POSITION")!;
      const array = new Float32Array(positions.getCount() * 3);
      const point = [0, 0, 0];
      for (let i = 0; i < positions.getCount(); i++) {
        positions.getElement(i, point);
        array.set(point, i * 3);
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(array, 3));
      const indices = primitive.getIndices();
      if (indices) {
        geometry.setIndex(
          new BufferAttribute(Uint32Array.from(indices.getArray()!), 1),
        );
      }
      object = new Mesh(
        geometry,
        new MeshStandardMaterial({ map: new Texture() }),
      );
    }
    object.name = node.getName();
    object.position.fromArray(node.getTranslation());
    object.quaternion.copy(new Quaternion().fromArray(node.getRotation()));
    object.scale.fromArray(node.getScale());
    for (const child of node.listChildren()) object.add(toThree(child));
    return object;
  };
  const scene = new Group();
  for (const node of document.getRoot().getDefaultScene()!.listChildren()) {
    scene.add(toThree(node));
  }
  return scene;
}

/** The bounds of `object`'s meshes, instances included, in its frame. */
function boundsOf(object: Object3D) {
  object.updateMatrixWorld(true);
  const box = new Box3();
  object.traverse((node) => {
    if (node instanceof InstancedMesh) {
      node.computeBoundingBox();
      box.union(node.boundingBox!.clone().applyMatrix4(node.matrixWorld));
    } else if (node instanceof Mesh) {
      box.expandByObject(node, true);
    }
  });
  return box;
}

const palette = Object.fromEntries(
  PALETTE_ROLES.map((role, i) => [role, new Color(0.2 * i, 0.5, 0.4)]),
) as Palette;
const paint = createPaint(palette);

const models = new Map<string, Object3D>();
test.beforeAll(async () => {
  for (const id of PROP_MODELS) {
    const scene = await readModel(id);
    prepareModel(id, scene);
    models.set(id, scene);
  }
});

test.describe("the index", () => {
  /* A model the index does not list is never asked for, and its stand-in
     stands for good: every one the board places has to be listed. */
  test("lists every toy model the board places, and each file is shipped", async () => {
    const index = JSON.parse(
      await readFile(publicFile(PROP_INDEX), "utf8"),
    ) as Record<string, { file: string }>;
    for (const id of PROP_MODELS) {
      expect(index[id]?.file, id).toBe(propFile(id));
    }
    expect(PROP_MODELS).toContain(MARKER.figure);
    expect(PROP_MODELS).toContain(MARKER.buddy);
  });

  test("each placement names a prop on its own tile, once", () => {
    const seen = new Set<string>();
    for (const placement of PROP_PLACEMENTS) {
      const key = `${placement.step}:${placement.piece}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
      expect(
        piecesOf(placement.step).some((piece) => piece.id === placement.piece),
        key,
      ).toBe(true);
      expect(placementOf(placement.step, placement.piece)).toBe(placement);
    }
  });
});

test.describe("the toy props", () => {
  /* As the stand-ins are held to their boxes (`path-scene-contract`),
     with the same give. */
  test("each stands inside its piece's box, and fills it", () => {
    for (const slug of LOOP) {
      piecesOf(slug).forEach((piece, i) => {
        const placement = placementOf(slug, piece.id);
        if (!placement) return;
        const label = `${slug}: ${piece.id} (${placement.model})`;
        const built = toyPiece(
          paint,
          models.get(placement.model)!,
          placement,
          piece,
          i,
        );
        const box = boundsOf(built.object);
        const size = box.getSize(new Vector3());
        const give = 0.12 + 1e-6;
        expect(size.x, label).toBeLessThanOrEqual(piece.w + give);
        expect(size.z, label).toBeLessThanOrEqual(piece.d + give);
        expect(box.max.y, label).toBeLessThanOrEqual(piece.h + give);
        expect(box.min.y, label).toBeGreaterThanOrEqual(-0.02);
        expect(Math.max(size.x, size.z), label).toBeGreaterThan(
          Math.max(piece.w, piece.d) * 0.5,
        );
      });
    }
  });

  /* A toy without its parts swells whole: the beat would still play,
     but not as the one written for it. */
  test("each carries every part its beat moves", () => {
    const expected: Record<string, string[]> = {
      "ferraris-coils": [BEAT_NODE.coil, BEAT_NODE.rotor],
      "roche-dial": [BEAT_NODE.needle],
      "mvp-window": [BEAT_NODE.glass, BEAT_NODE.shutter],
      "clock-face": [BEAT_NODE.hand],
      "startup-desk": [BEAT_NODE.screen],
      "next-plinth": [BEAT_NODE.slot],
    };
    for (const placement of PROP_PLACEMENTS) {
      const names = expected[placement.model];
      if (!names) continue;
      const piece = piecesOf(placement.step).find(
        (each) => each.id === placement.piece,
      )!;
      const built = toyPiece(
        paint,
        models.get(placement.model)!,
        placement,
        piece,
        0,
      );
      const label = `${placement.step}: ${placement.piece}`;
      expect(hasOwnParts(placement.piece, built.object), label).toBe(true);
      for (const name of names) {
        expect(
          built.object.getObjectByName(name),
          `${label} ${name}`,
        ).toBeTruthy();
      }
    }
  });

  test("the coils are cut into three windings, round the middle", () => {
    const coils: Object3D[] = [];
    models.get("ferraris-coils")!.traverse((node) => {
      if (node.name === BEAT_NODE.coil) coils.push(node);
    });
    expect(coils).toHaveLength(3);
    const bearings = coils
      .map((coil) => Math.atan2(coil.position.z, coil.position.x))
      .sort((a, b) => a - b);
    /* About a third of a turn apart. */
    for (let i = 0; i < 3; i++) {
      const gap =
        (bearings[(i + 1) % 3] - bearings[i] + Math.PI * 2) % (Math.PI * 2);
      expect(gap).toBeGreaterThan(Math.PI / 3);
    }
  });

  test("the shutters stand open beside the glass and close over it", () => {
    const placement = placementOf("cuneo-2022", "mvp-window")!;
    const piece = piecesOf("cuneo-2022").find(
      (each) => each.id === "mvp-window",
    )!;
    const built = toyPiece(
      paint,
      models.get("mvp-window")!,
      placement,
      piece,
      0,
    );
    const glass = boundsOf(built.object.getObjectByName(BEAT_NODE.glass)!);
    const shutters: Object3D[] = [];
    built.object.traverse((node) => {
      if (node.name === BEAT_NODE.shutter) shutters.push(node);
    });
    expect(shutters).toHaveLength(2);
    for (const shutter of shutters) {
      const open = boundsOf(shutter);
      /* Open: off to the glass's side, in front of the wall. */
      expect(
        open.max.x <= glass.min.x + 0.01 || open.min.x >= glass.max.x - 0.01,
      ).toBe(true);
      expect(open.max.z).toBeGreaterThan(glass.max.z);
    }
    for (const shutter of shutters) shutter.rotation.y = 0;
    /* Shut, the two cover the glass, in front of it. */
    const shut = new Box3();
    for (const shutter of shutters) shut.union(boundsOf(shutter));
    expect(shut.min.x).toBeLessThanOrEqual(glass.min.x + 0.01);
    expect(shut.max.x).toBeGreaterThanOrEqual(glass.max.x - 0.01);
    expect(shut.min.z).toBeGreaterThan(glass.max.z);
  });
});

test.describe("the duo and the side props", () => {
  test("a marker stands the height asked, its foot on the ground", () => {
    for (const id of [MARKER.figure, MARKER.buddy]) {
      const box = boundsOf(toyMarker(models.get(id)!, 1.45));
      expect(box.max.y - box.min.y, id).toBeCloseTo(1.45, 2);
      expect(box.min.y, id).toBeCloseTo(0, 3);
    }
  });

  test("each side prop fits its box", () => {
    for (const side of Object.values(SIDE_MODELS)) {
      const size = boundsOf(toySide(models.get(side.model)!, side)).getSize(
        new Vector3(),
      );
      expect(size.x, side.model).toBeLessThanOrEqual(side.w + 1e-6);
      expect(size.z, side.model).toBeLessThanOrEqual(side.d + 1e-6);
      expect(size.y, side.model).toBeLessThanOrEqual(side.h + 1e-6);
    }
  });
});

/* ─── On the board ─── */

test.describe("on /path", () => {
  type Report = {
    step: string;
    piece: string;
    file: string | null;
    nodes: string[];
  };
  const pieces = (page: Page) =>
    page.evaluate(() =>
      (
        window as unknown as { __pathScene: { pieces(): Report[] } }
      ).__pathScene.pieces(),
    );
  const settled = (page: Page) =>
    expect(page.locator("[data-path-stage] canvas")).toHaveAttribute(
      "data-path-landmarks",
      "settled",
      { timeout: 0 },
    );

  test("once settled, every prop and both markers stand as their models", async ({
    page,
  }) => {
    await page.goto("/path#lille");
    await settled(page);
    const report = await pieces(page);
    for (const placement of PROP_PLACEMENTS) {
      const row = report.find(
        (each) =>
          each.step === placement.step && each.piece === placement.piece,
      );
      expect(row?.file, `${placement.step}: ${placement.piece}`).toBe(
        propFile(placement.model),
      );
    }
    for (const id of [MARKER.figure, MARKER.buddy]) {
      expect(report.find((each) => each.piece === id)?.file).toBe(propFile(id));
    }
  });

  /* One prop the index does not list is never asked for; one whose file
     fails keeps its stand-in; neither keeps the board from settling, and
     the duo still arrives. */
  test("a prop unlisted or failing keeps its code stand-in", async ({
    page,
  }) => {
    const index = JSON.parse(
      await readFile(publicFile(PROP_INDEX), "utf8"),
    ) as Record<string, unknown>;
    delete index["clock-face"];
    await page.route(`**${PROP_INDEX}`, (route) =>
      route.fulfill({ json: index }),
    );
    await page.route("**/path/models/sailboat.glb", (route) =>
      route.fulfill({ status: 500, body: "" }),
    );
    const asked: string[] = [];
    page.on("request", (request) => asked.push(request.url()));
    await page.goto("/path#lille");
    await settled(page);
    expect(asked.filter((url) => url.includes("clock-face"))).toEqual([]);
    const report = await pieces(page);
    const fileOf = (step: string, piece: string) =>
      report.find((each) => each.step === step && each.piece === piece)?.file;
    expect(fileOf("lille", "clock-face")).toBeNull();
    expect(fileOf("switzerland", "sailboat")).toBeNull();
    expect(fileOf("switzerland", "roche-dial")).toBe(propFile("roche-dial"));
    expect(fileOf("marker", MARKER.figure)).toBe(propFile(MARKER.figure));
    /* The code clock still carries its hand, for its beat. */
    expect(report.find((each) => each.piece === "clock-face")?.nodes).toContain(
      BEAT_NODE.hand,
    );
  });
});
