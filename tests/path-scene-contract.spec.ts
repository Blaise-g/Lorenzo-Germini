/* The board runtime's contract without a browser (#148; v3's solid board):
   the fallback decision for each trigger storyboard §7.4 lists, what each
   step builds, the board's layout, its pieces, the path spline, the model
   manifest and the motion curves. #141's testing decisions
   ask for the pure functions to be tested directly; the browser halves are
   `path-scene.spec.ts` and `path-board.spec.ts`. */

import { expect, test } from "@playwright/test";

import {
  buildPlan,
  hasScene,
  litLines,
} from "@/components/path/scene/build-plan";
import {
  decideFallback,
  FALLBACK_REASON_LINES,
  SCENE_FALLBACK_LINES,
  type CapabilitySignals,
} from "@/components/path/scene/fallback";
import {
  DRAWING_BYTES_PER_PIXEL,
  drawingPixelRatio,
  MAX_DRAWING_PIXELS,
  MAX_PIXEL_RATIO,
  MIN_PIXEL_RATIO,
} from "@/components/path/scene/drawing-buffer";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Box3, Color, Mesh, Vector3 } from "three";

import {
  BOARD,
  boardOutline,
  frameShapes,
  LAYOUT,
  LOOP,
  PAWN_RADIUS,
  pawnSpot,
  pawnSpotOnTile,
  piecesOf,
  TILE,
  tileCentre,
  tileScale,
} from "@/components/path/scene/board";
import { HAND_END_ANGLE, handAngle } from "@/components/path/scene/lille";
import { createPaint } from "@/components/path/scene/paint";
import { PALETTE_ROLES, type Palette } from "@/components/path/scene/palette";
import { pathSpline, tileAnchors } from "@/components/path/scene/path-spline";
import { buildPiece } from "@/components/path/scene/props";
import { SCENE_ASSETS } from "@/components/path/scene/scene-assets";
import {
  framed,
  inConvex,
  overlaps,
  toClip,
  type ClipPoint,
  type ClipRect,
} from "@/components/path/scene/frame";
import {
  hopEase,
  loopSteps,
  movePose,
  RISE_FROM,
  risePose,
  spring,
} from "@/components/path/scene/motion";
import { MVP_WINDOW_LABEL, PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";

const capable: CapabilitySignals = {
  webgl2: true,
  context: "ok",
  saveData: false,
};

const frames = (count: number, ms: number) =>
  Array.from({ length: count }, () => ms);

const stepNamed = (slug: PathStepSlug) =>
  PATH_STEPS.find((step) => step.slug === slug)!;

test.describe("the fallback decision", () => {
  test("a capable browser keeps the scene, before and after its frames", () => {
    expect(decideFallback(capable)).toBeNull();
    expect(decideFallback(capable, frames(60, 16.7))).toBeNull();
  });

  test("each capability trigger shows the stills, with its own reason", () => {
    expect(decideFallback({ ...capable, webgl2: false })).toBe("no-webgl2");
    expect(decideFallback({ ...capable, context: "failed" })).toBe(
      "context-failed",
    );
    expect(
      decideFallback({ ...capable, context: "major-performance-caveat" }),
    ).toBe("performance-caveat");
    expect(decideFallback({ ...capable, saveData: true })).toBe("save-data");
  });

  test("the median of the first 60 frames above 33 ms shows the stills", () => {
    expect(decideFallback(capable, frames(60, 34))).toBe("slow-frames");
    /* "Above 33 ms": exactly 33 is not slow. */
    expect(decideFallback(capable, frames(60, 33))).toBeNull();
    /* A median, not a mean: a few long frames (shader compiles) do not tip
       it, and a majority of them does. */
    expect(
      decideFallback(capable, [...frames(29, 200), ...frames(31, 16)]),
    ).toBeNull();
    expect(
      decideFallback(capable, [...frames(31, 200), ...frames(29, 16)]),
    ).toBe("slow-frames");
  });

  test("fewer than 60 frames is no verdict, and later frames never reopen it", () => {
    expect(decideFallback(capable, frames(59, 100))).toBeNull();
    expect(
      decideFallback(capable, [...frames(60, 16), ...frames(200, 100)]),
    ).toBeNull();
  });

  test("every reason has a line saying why", () => {
    for (const line of Object.values(FALLBACK_REASON_LINES)) {
      expect(line).toMatch(/^Showing stills: /);
    }
    for (const line of Object.values(SCENE_FALLBACK_LINES)) {
      expect(line("Lille")).toMatch(/^Showing stills: /);
    }
  });

  test("a scene's failed assets are named as that scene's", () => {
    expect(SCENE_FALLBACK_LINES["assets-failed"]("Lille")).toContain(
      "Lille’s models",
    );
    expect(SCENE_FALLBACK_LINES["scene-failed"]("Lille")).toContain(
      "the scene failed to build",
    );
  });
});

test.describe("what each step builds", () => {
  /* Every step is a tile on the one board (v2's board ticket), so the host
     shows the canvas for every step. */
  test("every step has art", () => {
    expect(PATH_STEPS.every(hasScene)).toBe(true);
  });

  /* The runtime raises each prop's pieces when it lands: a prop with no
     piece would light its caption line over an empty tile. */
  test("every prop a step names has a piece on that step's tile", () => {
    for (const step of PATH_STEPS) {
      const pieces = piecesOf(step.slug).map((piece) => piece.prop);
      for (const prop of step.props) {
        expect(pieces, `${step.slug}'s ${prop.id}`).toContain(prop.id);
      }
      /* And no piece renders a prop its step does not name. */
      for (const piece of piecesOf(step.slug)) {
        if (piece.prop === null) continue;
        expect(
          step.props.map((prop) => prop.id),
          `${step.slug}'s ${piece.id}`,
        ).toContain(piece.prop);
      }
    }
  });

  /* The pawn has passed every earlier tile on its way here, so a step
     arrived at cold stands on every earlier step's props, in the data's
     order, and builds only its own. */
  test("a step stands on every earlier step's props and builds its own", () => {
    expect(buildPlan(stepNamed("home")).standing).toEqual([]);
    expect(buildPlan(stepNamed("cuneo-2022")).standing).toEqual([
      "plateau",
      "bisalta",
      "school",
      "mole",
      "coils",
      "lake",
      "roche-dial",
      "jet-d-eau",
    ]);
    expect(buildPlan(stepNamed("next")).standing).toEqual(
      PATH_STEPS.slice(0, -1).flatMap((step) => step.props.map((p) => p.id)),
    );

    for (const step of PATH_STEPS) {
      expect(
        buildPlan(step).building.map((p) => p.id),
        step.slug,
      ).toEqual(step.props.map((p) => p.id));
    }
  });

  test("every build lands its props in order over about 2–3 s", () => {
    for (const step of PATH_STEPS) {
      const { building } = buildPlan(step);
      const lands = building.map((prop) => prop.landsAt);
      expect(lands, step.slug).toEqual([...lands].sort((a, b) => a - b));
      expect(lands.at(-1)!, step.slug).toBeGreaterThanOrEqual(2000);
      expect(lands.at(-1)!, step.slug).toBeLessThanOrEqual(3000);
    }
  });

  test("a caption line lights when its prop lands, and stays lit", () => {
    const plan = buildPlan(stepNamed("now"));
    const [desk, office] = plan.building;
    expect(litLines(plan, 0)).toEqual([]);
    expect(litLines(plan, desk.landsAt - 1)).toEqual([]);
    expect(litLines(plan, desk.landsAt)).toEqual([0]);
    expect(litLines(plan, office.landsAt)).toEqual([0, 3]);
    expect(litLines(plan, office.landsAt + 10_000)).toEqual([0, 3]);
  });
});

/* GH-141's 64 MB GPU budget, against the stage sizes the measurement report
   estimates (docs/path-measurements.md): CSS width and height of the stage. */
test.describe("the drawing buffer", () => {
  /* The budget's MB is a million bytes; the report's uploads were measured
     in MiB. Mixing them is how 64.4 MB once passed as 61.4. */
  const MB = 1000 * 1000;
  const MiB = 1024 * 1024;
  /** The board's uploaded buffers and textures, shadow map included, from
   *  the report: 17.5 MiB measured, rounded up. */
  const UPLOADS = 18 * MiB;
  const bufferBytes = (width: number, height: number, dpr: number) => {
    const ratio = drawingPixelRatio(width, height, dpr);
    return (
      Math.floor(width * ratio) *
      Math.floor(height * ratio) *
      DRAWING_BYTES_PER_PIXEL
    );
  };

  /* The stage's CSS size at 1440×900, 1280×720, 1512×982, 2560×1440 and
     375×812, measured. */
  const STAGES = [
    [920, 678],
    [760, 498],
    [992, 760],
    [1336, 858],
    [1976, 1218],
    [375, 300],
  ] as const;

  test("every measured stage stays under the 64 MB budget, at ×1, ×2 and ×3", () => {
    for (const [width, height] of STAGES) {
      for (const dpr of [1, 2, 3]) {
        expect(
          bufferBytes(width, height, dpr) + UPLOADS,
          `${width}×${height} at ×${dpr}`,
        ).toBeLessThanOrEqual(64 * MB);
      }
    }
  });

  /* The cap at its fullest still leaves the budget room: no stage, however
     large, goes over. */
  test("the pixel cap alone keeps the budget", () => {
    expect(
      MAX_DRAWING_PIXELS * DRAWING_BYTES_PER_PIXEL + UPLOADS,
    ).toBeLessThanOrEqual(64 * MB);
  });

  test("no stage holds more than its pixel cap, at any density", () => {
    for (const [width, height] of [
      [342, 224],
      [976, 378],
      [2096, 640],
      [3376, 640],
      [7000, 640],
    ]) {
      for (const dpr of [1, 2, 3, 4]) {
        const ratio = drawingPixelRatio(width, height, dpr);
        expect(ratio).toBeLessThanOrEqual(MAX_PIXEL_RATIO);
        expect(width * ratio * height * ratio).toBeLessThanOrEqual(
          MAX_DRAWING_PIXELS + 1,
        );
      }
    }
  });

  /* No multisampling, so a screen at ratio 1 is drawn at 2 and averaged
     down; a screen at 2 or 3 is drawn at its own ratio. */
  test("a stage under the cap is drawn at the device's ratio, and never under 2", () => {
    expect(drawingPixelRatio(920, 678, 1)).toBe(MIN_PIXEL_RATIO);
    expect(drawingPixelRatio(920, 678, 2)).toBe(2);
    expect(drawingPixelRatio(375, 300, 3)).toBe(3);
    expect(drawingPixelRatio(375, 300, 4)).toBe(MAX_PIXEL_RATIO);
  });

  test("the stage of a 1440×900 screen at ×2 is drawn at ×2, and only stages past the cap are softer", () => {
    expect(drawingPixelRatio(920, 678, 2)).toBe(2);
    expect(drawingPixelRatio(992, 760, 2)).toBe(2);
    expect(drawingPixelRatio(1976, 1218, 2)).toBeLessThan(2);
  });
});

/* Decision 3: home's step 4 shows the dimmed "MVP — killed after customer
   discovery" window. The words come from the step's own line. */
test.describe("the MVP window", () => {
  const cuneo = PATH_STEPS.find((step) => step.slug === "cuneo-2022")!;
  const prop = cuneo.props.find((p) => p.id === "mvp-window")!;

  test("carries decision 3's label, from the line it captions", () => {
    expect(MVP_WINDOW_LABEL).toBe("MVP — killed after customer discovery");
    expect(prop.name).toBe(MVP_WINDOW_LABEL);
    expect(cuneo.lines[prop.captionLine]).toMatch(
      /MVP.*Killed it on the evidence after customer discovery\.$/,
    );
  });

  /* The owner's v3 decision: nothing on the board is text. The label is
     the prop's name in the data, for the overlay and the flat site; the
     scene's code draws no glyphs and reads no label. */
  test("is never written in the scene", async () => {
    const dir = path.join(process.cwd(), "src/components/path/scene");
    const files = (await readdir(dir)).filter((file) => file.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const source = await readFile(path.join(dir, file), "utf8");
      for (const sign of [
        "fillText",
        "strokeText",
        "MVP_WINDOW_LABEL",
        "TextGeometry",
        "FontLoader",
        "document.fonts",
      ]) {
        expect(source.includes(sign), `${file} uses ${sign}`).toBe(false);
      }
    }
  });
});

/* Seven tiles on a closed loop in the data's order, Lille and home the
   heroes, Lille at the front and "?" closing the loop beside home. */
test.describe("the board", () => {
  test("the loop is the data's steps, in order", () => {
    expect(LOOP).toEqual(PATH_STEPS.map((step) => step.slug));
    expect(LOOP).toEqual([
      "home",
      "turin",
      "switzerland",
      "cuneo-2022",
      "lille",
      "now",
      "next",
    ]);
  });

  test("Lille is front and centre, home at the back, and both are heroes", () => {
    const [lx, lz] = tileCentre("lille");
    expect(lx).toBeCloseTo(0, 6);
    for (const slug of LOOP)
      expect(tileCentre(slug)[1]).toBeLessThanOrEqual(lz);
    expect(tileCentre("home")[1]).toBeLessThan(0);
    expect(tileScale("lille")).toBeGreaterThan(1);
    expect(tileScale("home")).toBeGreaterThan(1);
    expect(tileScale("turin")).toBe(1);
  });

  /* Neighbours on the loop are neighbours on the table: each tile's
     nearest other tile is one of its two loop neighbours, so "?" sits
     beside home and the pawn's one-tile hop is to an adjacent tile. */
  test("each tile's nearest tile is a neighbour on the loop", () => {
    const distance = (a: string, b: string) => {
      const [ax, az] = tileCentre(a as (typeof LOOP)[number]);
      const [bx, bz] = tileCentre(b as (typeof LOOP)[number]);
      return Math.hypot(ax - bx, az - bz);
    };
    LOOP.forEach((slug, index) => {
      const neighbours = [
        LOOP[(index + 1) % LOOP.length],
        LOOP[(index + LOOP.length - 1) % LOOP.length],
      ];
      const nearest = LOOP.filter((other) => other !== slug).sort(
        (a, b) => distance(slug, a) - distance(slug, b),
      )[0];
      expect(neighbours, slug).toContain(nearest);
    });
    expect([LOOP[0], LOOP.at(-1)]).toEqual(["home", "next"]);
  });

  test("no two tiles overlap on the table", () => {
    const box = (slug: (typeof LOOP)[number]) => {
      const [x, z] = tileCentre(slug);
      const w = (TILE.width / 2) * tileScale(slug);
      const d = (TILE.depth / 2) * tileScale(slug);
      return { left: x - w, right: x + w, back: z - d, front: z + d };
    };
    for (const [i, a] of LOOP.entries()) {
      for (const b of LOOP.slice(i + 1)) {
        const p = box(a);
        const q = box(b);
        const overlap =
          p.left < q.right &&
          q.left < p.right &&
          p.back < q.front &&
          q.back < p.front;
        expect(overlap, `${a} and ${b}`).toBe(false);
      }
    }
  });

  /* Every piece stands on its own tile: inside the slab, so nothing
     overhangs into the path or a neighbour. */
  test("every piece's box stands inside its tile", () => {
    for (const slug of LOOP) {
      for (const piece of piecesOf(slug)) {
        const label = `${slug}: ${piece.id}`;
        expect(Math.abs(piece.x) + piece.w / 2, label).toBeLessThanOrEqual(
          TILE.width / 2 + 1e-9,
        );
        expect(Math.abs(piece.z) + piece.d / 2, label).toBeLessThanOrEqual(
          TILE.depth / 2 + 1e-9,
        );
        expect(piece.h, label).toBeGreaterThan(0);
      }
      const ids = piecesOf(slug).map((piece) => piece.id);
      expect(new Set(ids).size, slug).toBe(ids.length);
    }
  });

  /* The pawn stands where it covers nothing: on the tile's top, clear of its
     chamfered corners, behind its colour band, and clear of every piece. */
  test("the pawn stands clear of every piece and off the band", () => {
    for (const slug of LOOP) {
      const { x, z } = pawnSpotOnTile(slug);
      expect(Math.abs(x) + PAWN_RADIUS, slug).toBeLessThanOrEqual(
        TILE.width / 2,
      );
      expect(
        Math.abs(x) + Math.abs(z) + PAWN_RADIUS * Math.SQRT2,
        slug,
      ).toBeLessThanOrEqual(TILE.width / 2 + TILE.depth / 2 - TILE.chamfer);
      /* The band runs along the front edge, 0.4 deep. */
      expect(z + PAWN_RADIUS, slug).toBeLessThanOrEqual(TILE.depth / 2 - 0.4);
      for (const piece of piecesOf(slug)) {
        const dx = Math.max(Math.abs(x - piece.x) - piece.w / 2, 0);
        const dz = Math.max(Math.abs(z - piece.z) - piece.d / 2, 0);
        expect(
          Math.hypot(dx, dz),
          `${slug}: ${piece.id}`,
        ).toBeGreaterThanOrEqual(PAWN_RADIUS);
      }
    }
  });

  test("the camera frames every tile and every piece's top", () => {
    const points = frameShapes().flatMap(({ outlines }) => outlines.flat());
    const pieces = LOOP.flatMap(piecesOf).length;
    /* Four footprint corners and a hop top per tile, four corners a piece. */
    expect(points).toHaveLength(LOOP.length * 5 + pieces * 4);
    for (const [, y] of points) expect(y).toBeGreaterThanOrEqual(0);
  });

  test("the camera's outlines go tile by tile, footprint first", () => {
    const shapes = frameShapes();
    expect(shapes.map(({ slug }) => slug)).toEqual([...LOOP]);
    for (const { slug, outlines } of shapes) {
      const [footprint, ...rest] = outlines;
      /* The footprint lies on the table, round the tile's centre. */
      expect(footprint).toHaveLength(4);
      for (const [, y] of footprint) expect(y).toBe(0);
      const [cx, cz] = tileCentre(slug);
      const x = footprint.reduce((sum, [px]) => sum + px, 0) / 4;
      const z = footprint.reduce((sum, [, , pz]) => sum + pz, 0) / 4;
      expect(x).toBeCloseTo(cx, 6);
      expect(z).toBeCloseTo(cz, 6);
      /* Each piece's top stands above the tile's slab, at its full height. */
      expect(rest).toHaveLength(piecesOf(slug).length + 1);
      piecesOf(slug).forEach((piece, i) => {
        const top = rest[i];
        expect(top).toHaveLength(4);
        const expected =
          (TILE.thickness + (piece.y ?? 0) + piece.h) * tileScale(slug);
        for (const [, y] of top) expect(y).toBeCloseTo(expected, 6);
      });
    }
  });

  /* The camera frames the whole board by its rim: every tile lies inside
     it, inside its frame. */
  test("the board's rim holds every tile, inside its frame", () => {
    const rim = boardOutline();
    expect(rim).toHaveLength(8);
    const inner = {
      x: BOARD.halfWidth - BOARD.frameWidth,
      z: BOARD.halfDepth - BOARD.frameWidth,
    };
    for (const slug of LOOP) {
      const [footprint] = frameShapes().find(
        (shape) => shape.slug === slug,
      )!.outlines;
      for (const [x, , z] of footprint) {
        expect(Math.abs(x), slug).toBeLessThan(inner.x);
        expect(Math.abs(z), slug).toBeLessThan(inner.z);
        const corner = rim.map(([px, , pz]) => [px, pz] as const);
        expect(inConvex(corner, [x, z]), slug).toBe(true);
      }
    }
  });
});

/* The pieces, built: each fills about the box the layout gives it, which is
   what the camera frames and the pawn keeps clear of. A piece drawn larger
   than its box would be cropped or stood on. */
test.describe("the pieces", () => {
  const palette = Object.fromEntries(
    PALETTE_ROLES.map((role, i) => [role, new Color(0.2 * i, 0.5, 0.4)]),
  ) as Palette;
  const paint = createPaint(palette);

  test("every piece builds, and stays inside its box", () => {
    for (const slug of LOOP) {
      piecesOf(slug).forEach((piece, i) => {
        const label = `${slug}: ${piece.id}`;
        const built = buildPiece(paint, slug, piece, i);
        built.object.updateMatrixWorld(true);
        /* Home's rivers run on past the plateau to the tile's front edge:
           flat water, measured against the tile instead. */
        const box = new Box3();
        const water = new Box3();
        built.object.traverse((node) => {
          if (!(node instanceof Mesh)) return;
          const flat = piece.id === "plateau" && node.material === paint.water;
          (flat ? water : box).expandByObject(node, true);
        });
        if (!water.isEmpty()) {
          expect(Math.abs(water.min.x + piece.x), label).toBeLessThanOrEqual(
            TILE.width / 2,
          );
          expect(water.max.x + piece.x, label).toBeLessThanOrEqual(
            TILE.width / 2,
          );
          expect(water.max.z + piece.z, label).toBeLessThanOrEqual(
            TILE.depth / 2,
          );
        }
        const size = box.getSize(new Vector3());
        /* A little give for bevels, rims and a leaning plume. */
        const give = 0.12 + 1e-6;
        expect(size.x, label).toBeLessThanOrEqual(piece.w + give);
        expect(size.z, label).toBeLessThanOrEqual(piece.d + give);
        expect(box.max.y, label).toBeLessThanOrEqual(piece.h + give);
        expect(box.min.y, label).toBeGreaterThanOrEqual(-0.02);
        /* And fills it: no piece shrunk to a speck. */
        expect(Math.max(size.x, size.z), label).toBeGreaterThan(
          Math.max(piece.w, piece.d) * 0.5,
        );
      });
    }
  });

  test("a piece's motion starts still and ends where its rise ends", () => {
    const clock = buildPiece(
      paint,
      "lille",
      piecesOf("lille").find((piece) => piece.id === "clock-face")!,
      0,
    );
    expect(clock.motion).toBeDefined();
    /* The hand is the one node the motion turns. */
    const angles = () => {
      const turned: number[] = [];
      clock.object.traverse((node) => turned.push(node.rotation.z));
      return turned;
    };
    clock.motion!(0);
    const atStart = angles();
    clock.motion!(1);
    const atEnd = angles();
    const moved = atStart.flatMap((angle, i) =>
      angle === atEnd[i] ? [] : [i],
    );
    expect(moved).toHaveLength(1);
    expect(atStart[moved[0]]).toBeCloseTo(handAngle(0), 9);
    expect(atEnd[moved[0]]).toBeCloseTo(HAND_END_ANGLE, 9);
  });
});

/* The spline and the anchors the camera rig (W1) reads. */
test.describe("the path spline", () => {
  test("is closed, through every tile's centre in the loop's order", () => {
    const spline = pathSpline();
    const anchors = tileAnchors();
    expect(spline.closed).toBe(true);
    expect(anchors.map((anchor) => anchor.slug)).toEqual([...LOOP]);
    anchors.forEach((anchor, i) => {
      const [x, z] = tileCentre(anchor.slug);
      expect(anchor.centre.x).toBeCloseTo(x, 6);
      expect(anchor.centre.z).toBeCloseTo(z, 6);
      expect(anchor.t).toBeCloseTo(i / LOOP.length, 6);
      const at = spline.getPoint(anchor.t);
      expect(at.distanceTo(anchor.centre), anchor.slug).toBeLessThan(1e-6);
    });
  });

  test("each anchor's pawn stands on its tile's top", () => {
    for (const anchor of tileAnchors()) {
      const [x, z] = pawnSpot(anchor.slug);
      expect(anchor.pawn.x).toBeCloseTo(x, 6);
      expect(anchor.pawn.z).toBeCloseTo(z, 6);
      expect(anchor.pawn.y).toBeCloseTo(
        TILE.thickness * tileScale(anchor.slug),
        6,
      );
      expect(anchor.top).toBe(anchor.pawn.y);
    }
  });
});

/* The model manifest (`scene-assets.ts`): the seam W2's landmarks land on. */
test.describe("the model manifest", () => {
  test("names each landmark once, on its own tile's prop and piece", () => {
    const ids = SCENE_ASSETS.map((asset) => asset.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "home-school",
      "turin-mole",
      "switzerland-jet-d-eau",
      "cuneo-2022-schoolroom",
      "lille-belfry",
      "lille-bourse",
      "now-office",
    ]);
    for (const asset of SCENE_ASSETS) {
      expect(asset.id.startsWith(`${asset.step}-`), asset.id).toBe(true);
      expect(asset.file).toBe(`/path/models/${asset.id}.glb`);
      expect(asset.role).toBe("landmark");
      const prop = stepNamed(asset.step).props.find((p) => p.id === asset.prop);
      expect(prop, asset.id).toBeDefined();
      expect(asset.captionLine, asset.id).toBe(prop!.captionLine);
      const piece = LAYOUT[asset.step].pieces.find((p) => p.id === asset.piece);
      expect(piece?.prop, asset.id).toBe(asset.prop);
      expect(asset.anchor).toEqual({
        x: piece!.x,
        y: piece!.y ?? 0,
        z: piece!.z,
      });
      expect(asset.scale).toBeGreaterThan(0);
    }
  });
});

/* Where the board may stand under the tabs laid over it: clip-space arithmetic,
   so a wrong sign or a missed edge shows here rather than as a tile under
   the panel. */
test.describe("the frame", () => {
  const square = (x0: number, y0: number, size: number): ClipPoint[] => [
    [x0, y0],
    [x0 + size, y0],
    [x0 + size, y0 + size],
    [x0, y0 + size],
  ];
  const panel: ClipRect = { x0: 0.4, x1: 1, y0: -1, y1: 0 };

  test("a stage rectangle turns into clip space, up the right way", () => {
    expect(
      toClip({ left: 0, top: 0, right: 400, bottom: 100 }, 800, 200),
    ).toEqual({ x0: -1, x1: 0, y0: 0, y1: 1 });
  });

  test("inside a convex outline is inside, wound either way", () => {
    const outline = square(0, 0, 1);
    expect(inConvex(outline, [0.5, 0.5])).toBe(true);
    expect(inConvex([...outline].reverse(), [0.5, 0.5])).toBe(true);
    expect(inConvex(outline, [1.5, 0.5])).toBe(false);
  });

  test("an outline overlaps a card by a corner, by the card's corner, or by an edge alone", () => {
    /* A corner of the outline under the card. */
    expect(overlaps(square(0.3, -0.3, 0.2), panel)).toBe(true);
    /* The card's corner inside a large outline. */
    expect(overlaps(square(0, -0.5, 1), { ...panel, x1: 0.6 })).toBe(true);
    /* A thin card crossed by the outline's edges, no corner in either. */
    const thin: ClipRect = { x0: 0.45, x1: 0.55, y0: -1, y1: 1 };
    const wide: ClipPoint[] = [
      [0, 0],
      [1, 0],
      [1, 0.2],
      [0, 0.2],
    ];
    expect(overlaps(wide, thin)).toBe(true);
    /* Beside the card, clear of it. */
    expect(overlaps(square(-0.5, -0.5, 0.5), panel)).toBe(false);
  });

  test("framed means inside the free part and clear of every card", () => {
    const safe: ClipRect = { x0: -1, x1: 1, y0: -1, y1: 1 };
    expect(framed([square(-0.5, 0.2, 0.3)], safe, [panel])).toBe(true);
    expect(framed([square(0.5, -0.5, 0.2)], safe, [panel])).toBe(false);
    expect(framed([square(0.9, 0.5, 0.3)], safe, [])).toBe(false);
  });
});

/* The motion grammar (ticket: subtle-bounce spring, never from scale 0; a
   far jump under about 1.2 s; one arc per tile). */
test.describe("the motion", () => {
  test("a spring starts at 0, overshoots a little, and lands on 1", () => {
    expect(spring(0, 500, 0.2)).toBe(0);
    expect(spring(10_000, 500, 0.2)).toBeCloseTo(1, 6);
    expect(spring(600, 500, 0.2, 600)).toBe(1);
    const peak = Math.max(
      ...Array.from({ length: 200 }, (_, t) => spring(t * 5, 500, 0.2)),
    );
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.15);
  });

  test("a piece rises from squat, never from nothing, and ends whole", () => {
    expect(risePose(0, 800).visible).toBe(false);
    for (let progress = 0.01; progress < 1; progress += 0.01) {
      const pose = risePose(progress, 800);
      expect(pose.visible).toBe(true);
      expect(pose.height).toBeGreaterThanOrEqual(RISE_FROM.height - 1e-9);
      expect(pose.width).toBeGreaterThanOrEqual(RISE_FROM.width - 1e-9);
      expect(pose.width).toBeLessThanOrEqual(1);
      expect(pose.sink).toBeGreaterThanOrEqual(0);
    }
    expect(risePose(1, 800)).toEqual({
      visible: true,
      width: 1,
      height: 1,
      sink: 0,
    });
    /* Past full height, a little, on the way: the subtle bounce. */
    const heights = Array.from(
      { length: 99 },
      (_, i) => risePose((i + 1) / 100, 800).height,
    );
    expect(Math.max(...heights)).toBeGreaterThan(1);
    expect(Math.max(...heights)).toBeLessThan(1.15);
  });

  test("the pawn goes the short way round the loop", () => {
    expect(loopSteps(0, 1, 7)).toBe(1);
    expect(loopSteps(0, 3, 7)).toBe(3);
    expect(loopSteps(0, 4, 7)).toBe(-3);
    expect(loopSteps(0, 6, 7)).toBe(-1);
    expect(loopSteps(6, 0, 7)).toBe(1);
    expect(loopSteps(4, 4, 7)).toBe(0);
  });

  /** How many times a move of `steps` touches down before its end. */
  function landings(kind: "travel" | "skip", steps: number) {
    let count = 0;
    let last = 0;
    for (let i = 1; i < 2000; i++) {
      const { along, lift } = movePose(kind, steps, i / 2000);
      expect(Math.sign(along) * Math.sign(steps)).toBeGreaterThanOrEqual(0);
      expect(Math.abs(along)).toBeLessThanOrEqual(Math.abs(steps) + 1e-9);
      if (lift < 0.05 && last >= 0.05) count += 1;
      last = lift;
    }
    return count;
  }

  test("a travel hops once per tile and lands on the last", () => {
    for (const steps of [1, 3, -3]) {
      expect(movePose("travel", steps, 1)).toEqual({ along: steps, lift: 0 });
      for (let i = 1; i < 100; i++) {
        expect(movePose("travel", steps, i / 100).lift).toBeLessThanOrEqual(1);
      }
      /* Each tile on the way is touched down on, the last one included. */
      expect(landings("travel", steps), `${steps} tiles`).toBe(Math.abs(steps));
    }
  });

  test("a skip is one long hop, higher the farther, landing on its tile", () => {
    for (const steps of [1, 3, -3]) {
      expect(movePose("skip", steps, 1)).toEqual({ along: steps, lift: 0 });
      expect(landings("skip", steps), `${steps} tiles`).toBe(1);
    }
    expect(movePose("skip", 3, 0.5).lift).toBeGreaterThan(
      movePose("skip", 1, 0.5).lift,
    );
  });

  /* Still at take-off and touch-down, so a hop never skids. */
  test("a hop leaves and lands with no sideways speed", () => {
    expect(hopEase(0)).toBe(0);
    expect(hopEase(1)).toBeCloseTo(1, 12);
    expect(hopEase(0.001) / 0.001).toBeLessThan(0.01);
    expect((1 - hopEase(0.999)) / 0.001).toBeLessThan(0.01);
  });
});
