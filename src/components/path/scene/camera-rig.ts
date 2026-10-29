import { PerspectiveCamera, Quaternion, Vector3, type Object3D } from "three";

import type { PathStepSlug } from "@/data/path.types";

import {
  boardOutline,
  frameShapes,
  PAWN_HEIGHT,
  pawnSpotOnTile,
  piecesOf,
  TILE,
  tileCentre,
  tileScale,
} from "./board";
import { framed, type ClipRect } from "./frame";
import { easeInOut, easeInOutCubic, easeOutQuart } from "./motion";

/* The camera rig for the self-playing tour (v3, the benchmark's §4(a)): the
   owner's grammar made into shots. The board is seen close, a step's
   diorama filling the frame, and the camera travels with the pawn between
   steps rather than holding one view of the loop:

   - the opening swoops from high over the whole board down to the first
     step's close-up;
   - at a step it holds the close-up, drifting slowly round and breathing in
     and out while the narration plays;
   - the tour's advance pulls back to travel height, trucks along the path
     behind the pawn as it hops, and pushes in to the next close-up;
   - a step picked out of order flies there in one arc over the board;
   - after the last step it pulls back to the whole board and holds.

   A shot is where the camera looks, from how far, how high and from which
   side, through which lens. Every phase blends shots on an authored curve,
   and a critically damped follow on top keeps the move smooth when another
   selection cuts a curve short. The timings and the framing are pure
   functions, so a spec checks them without a GPU. */

const DEG = Math.PI / 180;

/** The lenses: long for the model-railway look of the owner's clip, wider
 *  for the opening's overview and for a portrait phone's close-up. */
export const LENS = { long: 24, wide: 30 } as const;

/** How far above the table the camera looks down, in radians. */
export const ELEVATION = {
  overview: 70 * DEG,
  travel: 35 * DEG,
  closeUp: 28 * DEG,
} as const;

/** The side the camera looks from, a fixed turn off the board's front:
 *  the owner's three-quarter view. The layout puts every backdrop at the
 *  back of its tile and the pawn at its front-right (`board.ts`), so the
 *  camera looks from the front-left: the pawn stands beside the diorama
 *  rather than in front of it. */
export const YAW = -30 * DEG;

/** Every phase's duration, in ms (the benchmark's §4(a), tuned by eye). */
export const CAMERA_MS = {
  opening: 2400,
  /** The opening for a visit that enters at a step's fragment. */
  openingShort: 1200,
  pull: 900,
  /** One hop of the pawn's travel, per tile. */
  hop: 560,
  push: 1200,
  /** The pawn's drop onto its tile at the end of the opening. */
  drop: 350,
  skipHold: 300,
  skipFlight: 1100,
  end: 2000,
  /** Reduced motion's cut, crossfaded. */
  crossfade: 150,
} as const;

/** The follow's half-life, and how far behind the pawn the travel shot
 *  looks. */
export const FOLLOW = { halfLifeMs: 120, lagMs: 250 } as const;

/** The close-up's life while the step is told: a slow orbit across the
 *  narration and a breathing dolly. */
export const DRIFT = {
  radians: 6 * DEG,
  breath: 0.01,
  hz: 0.15,
  minMs: 5000,
  tailMs: 800,
} as const;

/** The close-up's lean toward the duo while one of their gestures plays
 *  (v3-emil-polish): how much nearer it comes, how far toward them it
 *  looks, and how long it takes in and back out. A gesture is rare, so it
 *  may move the camera, a little; in on a gentle ease, out a touch slower,
 *  and retargeted from wherever it is if another gesture starts. */
export const LEAN = {
  closer: 0.3,
  toward: 0.6,
  inMs: 700,
  outMs: 900,
  /** It holds at least this long, however short the gesture, so it reads
   *  as a closer look rather than a bob. */
  holdMs: 2400,
} as const;

/** Travel height, as a share of the close-up's distance, and a portrait
 *  phone's extra. */
export const TRAVEL_DISTANCE = 2.2;
export const PORTRAIT_TRAVEL = 1.3;
/** How far ahead of the pawn the travel shot looks, in scene units: the
 *  pawn sits a little behind centre in its direction of travel. */
const TRAVEL_LEAD = 1.2;
/** How much higher and farther a skip's arc carries the camera at its
 *  middle. */
const SKIP_ARC = { distance: 0.35, elevation: 10 * DEG } as const;

/** The drift's whole span for a step whose narration lasts `narrationMs`:
 *  its clip and a tail, never shorter than `DRIFT.minMs`. */
export function driftMs(narrationMs: number): number {
  return Math.max(narrationMs + DRIFT.tailMs, DRIFT.minMs);
}

/** The orbit `elapsed` ms into a dwell of `span` ms, in radians: linear,
 *  the one move with no ease, held where it ends. */
export function driftAngle(elapsed: number, span: number): number {
  return DRIFT.radians * Math.min(Math.max(elapsed / span, 0), 1);
}

/** The breathing dolly's distance factor `elapsed` ms into a dwell: 1 at
 *  its start, so the hold begins where the push-in landed. */
export function breathing(elapsed: number): number {
  return 1 + DRIFT.breath * Math.sin(2 * Math.PI * DRIFT.hz * (elapsed / 1000));
}

/* ─── The timeline ─── */

export type TransitKind = "opening" | "travel" | "skip";

/** What the camera is doing: one of the moves, holding a step's close-up,
 *  pulling back after the last step, or holding the whole board. */
export type CameraShot = TransitKind | "close-up" | "end" | "overview" | "idle";

/** One move to a step's close-up, in ms from its start: when the pawn
 *  leaves and lands (it builds the tile on landing), when the camera starts
 *  pushing in, and `end`, when the close-up has landed and the step is
 *  settled. */
export type Transit = Readonly<{
  kind: TransitKind;
  hopStartMs: number;
  landMs: number;
  pushStartMs: number;
  endMs: number;
}>;

/** The timeline of a move of `tiles` tiles of the kind given; `short` for
 *  the opening of a visit that enters at a step's fragment.
 *
 *  - Opening: the camera swoops in; the pawn drops onto its tile as the
 *    shot settles, its landing beat overlapping the shot's last 0.3 s.
 *  - Travel: the camera pulls back while the pawn waits, then the pawn hops
 *    tile by tile and the camera follows; the push-in starts with the last
 *    hop, so the landing falls inside it and the camera arrives just after.
 *  - Skip: a held beat, then one arc; the pawn's one long hop lands
 *    before the camera does, so the build is underway as the shot lands. */
export function transitTimeline(
  kind: TransitKind,
  tiles: number,
  short = false,
): Transit {
  const count = Math.abs(tiles);
  if (kind === "opening") {
    const endMs = short ? CAMERA_MS.openingShort : CAMERA_MS.opening;
    const landMs = endMs - 300;
    return {
      kind,
      hopStartMs: landMs - CAMERA_MS.drop,
      landMs,
      pushStartMs: 0,
      endMs,
    };
  }
  if (kind === "skip") {
    const endMs = CAMERA_MS.skipHold + CAMERA_MS.skipFlight;
    return {
      kind,
      hopStartMs: CAMERA_MS.skipHold + 150,
      landMs: endMs - 200,
      pushStartMs: CAMERA_MS.skipHold,
      endMs,
    };
  }
  const hopStartMs = CAMERA_MS.pull * 0.7;
  const landMs = hopStartMs + CAMERA_MS.hop * Math.max(count, 1);
  const pushStartMs = landMs - CAMERA_MS.hop;
  return {
    kind,
    hopStartMs,
    landMs,
    pushStartMs,
    endMs: pushStartMs + CAMERA_MS.push,
  };
}

/* ─── Shots ─── */

/** Where the camera looks, `target`, in the board's own frame (so a turned
 *  board carries the shot with it), and from where. */
export type Shot = {
  target: Vector3;
  distance: number;
  elevation: number;
  yaw: number;
  fov: number;
};

export function copyShot(shot: Shot): Shot {
  return { ...shot, target: shot.target.clone() };
}

/** `a` blended `t` of the way to `b`. Distance blends geometrically, so a
 *  zoom keeps one pace from far to near. */
export function mixShots(a: Shot, b: Shot, t: number): Shot {
  return {
    target: a.target.clone().lerp(b.target, t),
    distance: a.distance * (b.distance / a.distance) ** t,
    elevation: a.elevation + (b.elevation - a.elevation) * t,
    yaw: a.yaw + (b.yaw - a.yaw) * t,
    fov: a.fov + (b.fov - a.fov) * t,
  };
}

/** Where on the stage, in clip space, a step's close-up puts its diorama:
 *  about 60% of the frame's height, lifted off centre so the caption bar
 *  and the board's tabs below stay clear of it, and on a landscape stage
 *  nudged right, away from the tabs in the bottom-left corner. A portrait
 *  phone's is narrower than tall, so its diorama fills the width instead,
 *  and sits higher. */
export function closeUpSlot(safe: ClipRect, portrait: boolean): ClipRect {
  const width = safe.x1 - safe.x0;
  const height = safe.y1 - safe.y0;
  const cx = (safe.x0 + safe.x1) / 2 + (portrait ? 0 : 0.06 * width);
  const cy = (safe.y0 + safe.y1) / 2 + (portrait ? 0.1 : 0.06) * height;
  const halfW = ((portrait ? 0.92 : 0.84) * width) / 2;
  const halfH = (0.66 * height) / 2;
  return { x0: cx - halfW, x1: cx + halfW, y0: cy - halfH, y1: cy + halfH };
}

/** The whole board's slot: nearly all of the stage. */
export function overviewSlot(safe: ClipRect): ClipRect {
  const cx = (safe.x0 + safe.x1) / 2;
  const cy = (safe.y0 + safe.y1) / 2;
  const halfW = ((safe.x1 - safe.x0) / 2) * 0.93;
  const halfH = ((safe.y1 - safe.y0) / 2) * 0.94;
  return { x0: cx - halfW, x1: cx + halfW, y0: cy - halfH, y1: cy + halfH };
}

/** `slot` moved by a share of its own size and scaled about its centre:
 *  the places tried when the first one runs under a tab. */
const SLOT_TRIES = [
  [0, 0, 1],
  [0.08, 0.06, 1],
  [0, 0.1, 0.92],
  [0.12, 0.1, 0.9],
  [0, 0.12, 0.82],
  [0.1, 0.14, 0.74],
] as const;

function moved(slot: ClipRect, [dx, dy, scale]: readonly number[]): ClipRect {
  const w = slot.x1 - slot.x0;
  const h = slot.y1 - slot.y0;
  const cx = (slot.x0 + slot.x1) / 2 + dx * w;
  const cy = (slot.y0 + slot.y1) / 2 + dy * h;
  return {
    x0: cx - (w * scale) / 2,
    x1: cx + (w * scale) / 2,
    y0: cy - (h * scale) / 2,
    y1: cy + (h * scale) / 2,
  };
}

/** The stage as the rig frames it, in clip space: `safe`, the part the
 *  board may use, and `clear`, the tabs laid over it. */
export type RigFrame = { safe: ClipRect; clear: readonly ClipRect[] };

export type CameraRigOptions = {
  camera: PerspectiveCamera;
  /** The board's group: shots are in its frame, so they turn with it. */
  board: Object3D;
  /** How far the selected tile stands proud of the board, in its units. */
  liftHeight: number;
  /** How tall a piece stands as built, in its tile's units, where known:
   *  a landmark fills its layout box only as far as its proportions allow,
   *  so a close-up framed on the box would hold empty sky above it. */
  pieceHeight?: (slug: PathStepSlug, piece: string) => number | undefined;
};

export type CameraRig = {
  /** The first shot: from over the whole board down to `slug`'s close-up. */
  open(slug: PathStepSlug, transit: Transit): void;
  /** The tour's advance to `slug`: pull back, follow the pawn, push in.
   *  `pawnAt` is where the pawn's foot is `ms` into the move, in the
   *  board's frame. */
  travel(
    slug: PathStepSlug,
    transit: Transit,
    pawnAt: (ms: number, out: Vector3) => Vector3,
  ): void;
  /** A step picked out of order: one arc to its close-up. */
  skip(slug: PathStepSlug, transit: Transit): void;
  /** After the last step: back to the whole board, and hold. */
  end(): void;
  /** Straight to `slug`'s close-up, as reduced motion has it. */
  cut(slug: PathStepSlug): void;
  /** Lands a move in progress on its close-up at once. */
  finish(): void;
  /** Moves the rig on `ms` and places the camera. `playing` is whether the
   *  tour runs, which the close-up's drift follows; `followMs`, when the
   *  follow runs on while the rig is frozen (a turn during a pause). */
  tick(ms: number, playing: boolean, followMs?: number): void;
  /** Places the camera where the rig is, without moving it on: after a
   *  resize, a turn or a new frame. */
  place(): void;
  setFrame(frame: RigFrame): void;
  /** The drift's span for the step being told (`driftMs`). */
  setDriftSpan(ms: number): void;
  /** Leans the close-up in toward `target` (in the board's frame), or back
   *  out with null (`LEAN`). Only a dwell leans, and never under reduced
   *  motion. */
  lean(target: Vector3 | null): void;
  setReducedMotion(reduced: boolean): void;
  /** Whether anything in the rig still moves, given whether the tour
   *  plays. */
  moving(playing: boolean): boolean;
  /** The step whose close-up the rig has landed on, or null while it moves
   *  to one. Pulling back to the whole board after the last step keeps it:
   *  the tour has finished with that step, not left it. */
  settledOn(): PathStepSlug | null;
  /** What the camera is doing now. */
  shot(): CameraShot;
  /** The current shot's focus, for the light's shadow frustum and the
   *  tilt-shift's band (v3-light): where the camera looks, in world space;
   *  the radius about it that the frame holds; and that radius as a share
   *  of the whole-board shot's, about 0.3 to 0.5 at a close-up and 1 at
   *  the overview. */
  focus(): { target: Vector3; radius: number; wide: number };
};

type Phase =
  | { kind: "idle" }
  | {
      kind: "transit";
      slug: PathStepSlug;
      transit: Transit;
      from: Shot;
      elapsed: number;
      pawnAt?: (ms: number, out: Vector3) => Vector3;
      /** The travel's heading, in the board's frame. */
      heading?: Vector3;
    }
  | { kind: "dwell"; slug: PathStepSlug; elapsed: number }
  | { kind: "end"; slug: PathStepSlug; from: Shot; elapsed: number }
  | { kind: "overview"; slug: PathStepSlug };

export function createCameraRig(options: CameraRigOptions): CameraRig {
  const { camera, board, liftHeight, pieceHeight } = options;
  let frame: RigFrame = {
    safe: { x0: -1, x1: 1, y0: -1, y1: 1 },
    clear: [],
  };
  let reducedMotion = false;
  let driftSpan: number = DRIFT.minMs;
  let phase: Phase = { kind: "idle" };
  /** The shot the curves last gave, unsmoothed: a new move starts here. */
  let shot: Shot | null = null;

  /* ─── Fitting ─── */

  const probe = new PerspectiveCamera();
  const world = new Vector3();
  const point = new Vector3();
  const right = new Vector3();
  const up = new Vector3();
  const unturn = new Quaternion();

  const portrait = () => camera.aspect < 1;

  function placeOn(target: PerspectiveCamera, at: Shot) {
    board.updateMatrixWorld();
    world.copy(at.target).applyMatrix4(board.matrixWorld);
    const flat = Math.cos(at.elevation) * at.distance;
    target.position.set(
      world.x + Math.sin(at.yaw) * flat,
      world.y + Math.sin(at.elevation) * at.distance,
      world.z + Math.cos(at.yaw) * flat,
    );
    target.fov = at.fov;
    target.near = Math.max(at.distance * 0.05, 0.2);
    target.far = at.distance * 3 + 60;
    target.lookAt(world);
    target.updateProjectionMatrix();
    target.updateMatrixWorld();
  }

  /** `points` in the board's frame, seen from `at`, in clip space; null if
   *  any is behind the camera. */
  function project(points: readonly Vector3[], at: Shot) {
    placeOn(probe, at);
    const out: [number, number][] = [];
    for (const local of points) {
      point.copy(local).applyMatrix4(board.matrixWorld);
      point.applyMatrix4(probe.matrixWorldInverse);
      if (point.z > -probe.near) return null;
      point.applyMatrix4(probe.projectionMatrix);
      out.push([point.x, point.y]);
    }
    return out;
  }

  /** The shot at `elevation`, `yaw` and `fov` that fits `points` inside
   *  `slot` as large as it can, centred in it. Perspective makes one pass
   *  approximate, so it refines a few times. */
  function fitInto(
    points: readonly Vector3[],
    lens: Omit<Shot, "target" | "distance">,
    slot: ClipRect,
  ): Shot {
    const at: Shot = { ...lens, target: new Vector3(), distance: 40 };
    for (const each of points) at.target.add(each);
    at.target.divideScalar(points.length);
    const slotW = slot.x1 - slot.x0;
    const slotH = slot.y1 - slot.y0;
    probe.aspect = camera.aspect;
    for (let pass = 0; pass < 7; pass++) {
      const projected = project(points, at);
      if (!projected) {
        at.distance *= 1.6;
        continue;
      }
      const xs = projected.map(([x]) => x);
      const ys = projected.map(([, y]) => y);
      const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
      const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
      /* A clip-space offset at the target's depth, in world units. */
      const halfH = at.distance * Math.tan((at.fov * DEG) / 2);
      right.setFromMatrixColumn(probe.matrixWorld, 0);
      up.setFromMatrixColumn(probe.matrixWorld, 1);
      const shift = right
        .multiplyScalar(
          ((x0 + x1) / 2 - (slot.x0 + slot.x1) / 2) * halfH * probe.aspect,
        )
        .addScaledVector(up, ((y0 + y1) / 2 - (slot.y0 + slot.y1) / 2) * halfH);
      board.getWorldQuaternion(unturn).invert();
      at.target.add(shift.applyQuaternion(unturn));
      at.distance *= Math.max((x1 - x0) / slotW, (y1 - y0) / slotH);
    }
    return at;
  }

  /** As `fitInto`, then clear of the tabs: the first of a few places,
   *  each a little higher, righter or smaller, where `outlines` stay inside
   *  the stage and off every tab. */
  function fitClear(
    points: readonly Vector3[],
    outlines: readonly (readonly Vector3[])[],
    lens: Omit<Shot, "target" | "distance">,
    slot: ClipRect,
  ): Shot {
    let last: Shot | undefined;
    for (const attempt of SLOT_TRIES) {
      last = fitInto(points, lens, moved(slot, attempt));
      if (frame.clear.length === 0) return last;
      const clipped = outlines.map((outline) => project(outline, last!));
      if (clipped.some((each) => each === null)) continue;
      if (framed(clipped as [number, number][][], frame.safe, frame.clear)) {
        return last;
      }
    }
    return last!;
  }

  /** What a step's close-up holds: its tile, raised as the selected tile
   *  stands, every piece on it, and the pawn standing on its spot. */
  function diorama(slug: PathStepSlug) {
    const rise = liftHeight * tileScale(slug);
    const [cx, cz] = tileCentre(slug);
    const scale = tileScale(slug);
    const spot = pawnSpotOnTile(slug);
    const shapes = frameShapes().find((each) => each.slug === slug)!;
    /* The outlines are the footprint, then each piece's top, then the hop:
       a piece's top is moved to where it stands as built. */
    const pieces = piecesOf(slug);
    const tops = shapes.outlines.slice(1, -1).map((outline, index) => {
      const piece = pieces[index];
      const built = pieceHeight?.(slug, piece.id);
      const top =
        built === undefined
          ? undefined
          : (TILE.thickness + (piece.y ?? 0) + built) * scale;
      return outline.map(([x, y, z]) => [x, top ?? y, z] as const);
    });
    const outlines = [
      ...[shapes.outlines[0], ...tops].map((outline) =>
        outline.map(([x, y, z]) => new Vector3(x, y + rise, z)),
      ),
      [
        new Vector3(
          cx + spot.x * scale,
          (TILE.thickness + PAWN_HEIGHT) * scale + rise,
          cz + spot.z * scale,
        ),
      ],
    ];
    return { outlines, points: outlines.flat() };
  }

  /** The whole board: its rim and everything standing on its tiles. */
  function wholeBoard() {
    const outlines = frameShapes().flatMap(({ outlines }) =>
      outlines.map((outline) =>
        outline.map(([x, y, z]) => new Vector3(x, y, z)),
      ),
    );
    const rim = boardOutline().map(([x, y, z]) => new Vector3(x, y, z));
    return { outlines, points: [...rim, ...outlines.flat()] };
  }

  /* Shots are fitted once per stage, lens and turn of the board. */
  const shots = new Map<string, Shot>();
  function cached(key: string, make: () => Shot): Shot {
    board.updateMatrixWorld();
    const full = JSON.stringify([
      key,
      camera.aspect.toFixed(3),
      frame,
      board.rotation.y.toFixed(4),
    ]);
    let found = shots.get(full);
    if (!found) {
      if (shots.size > 64) shots.clear();
      found = make();
      shots.set(full, found);
    }
    return found;
  }

  function closeUp(slug: PathStepSlug): Shot {
    const built = piecesOf(slug).map(
      (piece) => pieceHeight?.(slug, piece.id)?.toFixed(2) ?? "",
    );
    return cached(`close:${slug}:${built.join()}`, () => {
      const { points, outlines } = diorama(slug);
      return fitClear(
        points,
        outlines,
        {
          elevation: ELEVATION.closeUp,
          yaw: YAW,
          fov: portrait() ? LENS.wide : LENS.long,
        },
        closeUpSlot(frame.safe, portrait()),
      );
    });
  }

  function overview(): Shot {
    return cached("overview", () => {
      const { points, outlines } = wholeBoard();
      return fitClear(
        points,
        outlines,
        { elevation: ELEVATION.overview, yaw: 0, fov: LENS.wide },
        overviewSlot(frame.safe),
      );
    });
  }

  /* ─── The curves ─── */

  const foot = new Vector3();

  /** The travel shot `ms` into a move: looking a little ahead of where the
   *  pawn was a moment ago, from travel height. */
  function following(
    phase: Extract<Phase, { kind: "transit" }>,
    ms: number,
  ): Shot {
    const close = closeUp(phase.slug);
    phase.pawnAt!(Math.max(ms - FOLLOW.lagMs, 0), foot);
    return {
      target: foot
        .clone()
        .addScaledVector(phase.heading!, TRAVEL_LEAD)
        .setY(foot.y + PAWN_HEIGHT * 0.5),
      distance:
        close.distance * TRAVEL_DISTANCE * (portrait() ? PORTRAIT_TRAVEL : 1),
      elevation: ELEVATION.travel,
      yaw: YAW,
      fov: close.fov,
    };
  }

  /** The shot the curves give now. */
  function current(): Shot | null {
    switch (phase.kind) {
      case "idle":
        return null;
      case "overview":
        return overview();
      case "dwell": {
        const close = closeUp(phase.slug);
        if (reducedMotion) return close;
        const leaning = easeInOutCubic(leanAmount);
        return {
          ...close,
          target: close.target.clone().lerp(leanTarget, LEAN.toward * leaning),
          yaw: close.yaw + driftAngle(phase.elapsed, driftSpan),
          distance:
            close.distance *
            breathing(phase.elapsed) *
            (1 - LEAN.closer * leaning),
        };
      }
      case "end":
        return mixShots(
          phase.from,
          overview(),
          easeInOutCubic(phase.elapsed / CAMERA_MS.end),
        );
      case "transit": {
        const { transit, elapsed, from } = phase;
        const close = closeUp(phase.slug);
        if (transit.kind === "opening") {
          return mixShots(from, close, easeInOutCubic(elapsed / transit.endMs));
        }
        if (transit.kind === "skip") {
          const u = Math.min(
            Math.max((elapsed - CAMERA_MS.skipHold) / CAMERA_MS.skipFlight, 0),
            1,
          );
          const flown = mixShots(from, close, easeInOut(u));
          const arc = Math.sin(Math.PI * u);
          flown.distance *= 1 + SKIP_ARC.distance * arc;
          flown.elevation += SKIP_ARC.elevation * arc;
          return flown;
        }
        const pulled = mixShots(
          from,
          following(phase, elapsed),
          easeInOutCubic(elapsed / CAMERA_MS.pull),
        );
        return mixShots(
          pulled,
          close,
          easeOutQuart((elapsed - transit.pushStartMs) / CAMERA_MS.push),
        );
      }
    }
  }

  /* ─── The follow ─── */

  /** Where the camera is and looks, smoothed toward the curves. */
  const eye = new Vector3();
  const look = new Vector3();
  let fov: number = LENS.long;
  let placed = false;
  const goal = new PerspectiveCamera();
  const goalLook = new Vector3();

  function apply(ms: number) {
    const next = current();
    if (!next) return;
    shot = next;
    goal.aspect = camera.aspect;
    placeOn(goal, next);
    goalLook.copy(next.target).applyMatrix4(board.matrixWorld);
    if (!placed || reducedMotion || ms === Infinity) {
      eye.copy(goal.position);
      look.copy(goalLook);
      fov = next.fov;
      placed = true;
    } else if (ms > 0) {
      const keep = 0.5 ** (ms / FOLLOW.halfLifeMs);
      eye.lerp(goal.position, 1 - keep);
      look.lerp(goalLook, 1 - keep);
      fov += (next.fov - fov) * (1 - keep);
    }
    camera.position.copy(eye);
    camera.fov = fov;
    camera.near = goal.near;
    camera.far = goal.far;
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  /* The lean: where toward, how far in now (0 to 1), and whether in. */
  const leanTarget = new Vector3();
  let leanAmount = 0;
  let leanIn = false;

  /** Moves the lean on `ms` toward in or out, linearly in time: the shot
   *  eases it (`current`). */
  function stepLean(ms: number) {
    if (phase.kind !== "dwell" || reducedMotion) {
      leanAmount = 0;
      leanIn = false;
      return;
    }
    leanAmount = leanIn
      ? Math.min(leanAmount + ms / LEAN.inMs, 1)
      : Math.max(leanAmount - ms / LEAN.outMs, 0);
  }

  function settleDistance() {
    return eye.distanceTo(goal.position) + look.distanceTo(goalLook);
  }

  /** The shot to start a new move from: the curves' last, or, before any,
   *  the whole board. */
  function startShot(): Shot {
    return shot ? copyShot(shot) : copyShot(overview());
  }

  function landTransit() {
    if (phase.kind === "transit") {
      phase = { kind: "dwell", slug: phase.slug, elapsed: 0 };
    } else if (phase.kind === "end") {
      phase = { kind: "overview", slug: phase.slug };
    }
  }

  return {
    open(slug, transit) {
      const from = copyShot(overview());
      phase = { kind: "transit", slug, transit, from, elapsed: 0 };
      placed = false;
      apply(Infinity);
    },
    travel(slug, transit, pawnAt) {
      const start = pawnAt(0, new Vector3());
      const heading = pawnAt(transit.landMs, new Vector3()).sub(start).setY(0);
      if (heading.lengthSq() > 0) heading.normalize();
      phase = {
        kind: "transit",
        slug,
        transit,
        from: startShot(),
        elapsed: 0,
        pawnAt,
        heading,
      };
    },
    skip(slug, transit) {
      phase = {
        kind: "transit",
        slug,
        transit,
        from: startShot(),
        elapsed: 0,
      };
    },
    end() {
      if (phase.kind !== "dwell") return;
      phase = { kind: "end", slug: phase.slug, from: startShot(), elapsed: 0 };
    },
    cut(slug) {
      phase = { kind: "dwell", slug, elapsed: 0 };
      apply(Infinity);
    },
    finish() {
      landTransit();
      apply(Infinity);
    },
    tick(ms, playing, followMs = ms) {
      if (phase.kind === "transit") {
        phase.elapsed += ms;
        if (phase.elapsed >= phase.transit.endMs) landTransit();
      } else if (phase.kind === "end") {
        phase.elapsed += ms;
        if (phase.elapsed >= CAMERA_MS.end) landTransit();
      } else if (phase.kind === "dwell" && playing && !reducedMotion) {
        phase.elapsed += ms;
      }
      stepLean(ms);
      apply(followMs);
    },
    place() {
      apply(0);
      if (reducedMotion) return;
      /* A resize or a turn moves the goal; a settled camera with nothing
         else moving follows at once rather than drifting there unseen. */
      if (phase.kind !== "transit" && phase.kind !== "end") apply(Infinity);
    },
    setFrame(next) {
      frame = next;
    },
    setDriftSpan(ms) {
      driftSpan = ms;
    },
    lean(target) {
      leanIn = target !== null && phase.kind === "dwell" && !reducedMotion;
      if (target && leanIn) leanTarget.copy(target);
    },
    setReducedMotion(reduced) {
      reducedMotion = reduced;
      if (reduced) {
        landTransit();
        apply(Infinity);
      }
    },
    moving(playing) {
      if (phase.kind === "transit" || phase.kind === "end") return true;
      /* The close-up breathes for as long as the tour plays on it. */
      if (phase.kind === "dwell" && playing && !reducedMotion) return true;
      if (leanAmount !== (leanIn ? 1 : 0)) return true;
      return placed && settleDistance() > 1e-3;
    },
    settledOn() {
      return phase.kind === "idle" || phase.kind === "transit"
        ? null
        : phase.slug;
    },
    shot() {
      if (phase.kind === "transit") return phase.transit.kind;
      if (phase.kind === "dwell") return "close-up";
      return phase.kind;
    },
    focus() {
      const across = Math.max(camera.aspect, 1);
      const radius =
        camera.position.distanceTo(look) *
        Math.tan((camera.fov * DEG) / 2) *
        across;
      const whole = overview();
      const wholeRadius =
        whole.distance * Math.tan((whole.fov * DEG) / 2) * across;
      return { target: look.clone(), radius, wide: radius / wholeRadius };
    },
  };
}
