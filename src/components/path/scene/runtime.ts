import {
  Box3,
  Color,
  Frustum,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShadowMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type IUniform,
  type Material,
  type Object3D,
  type Texture,
} from "three";

import { PATH_STEPS } from "@/data/path";
import { PATH_NARRATION } from "@/data/path-narration";
import type { PathStep, PathStepSlug } from "@/data/path.types";

import {
  fitModel,
  loadGrain,
  loadIndex,
  loadLandmarkIndex,
  loadModel,
  type ModelResult,
  whenIdle,
} from "./assets";
import {
  BOARD,
  HOP_HEIGHT,
  LOOP,
  PAWN_HEIGHT,
  piecesOf,
  TILE,
  tileCentre,
  tileScale,
  type Piece,
} from "./board";
import {
  buildPlan,
  litLines,
  PROP_DROP_MS,
  TURN_LIMIT,
  type BuildPlan,
  type BuildState,
} from "./build-plan";
import { drawingPixelRatio, pixelRatioCap } from "./drawing-buffer";
import {
  CAMERA_MS,
  createCameraRig,
  driftMs,
  LEAN,
  LENS,
  transitTimeline,
  type CameraShot,
  type Transit,
} from "./camera-rig";
import { crossfade } from "./crossfade";
import { toClip, wholeStage, type StageFrame, type StageRect } from "./frame";
import {
  decideFallback,
  FRAME_SAMPLE_SIZE,
  type CapabilitySignals,
  type FallbackReason,
  type SceneFallbackReason,
} from "./fallback";

import { cueTurn } from "./beats";
import { createLife, type LifePiece, type SceneEvent } from "./life";
import {
  easeInOut,
  easeOutQuart,
  idleSquash,
  landingDip,
  landingSquash,
  squashScale,
  landmarkSink,
  landmarkWake,
  LANDING_MS,
  loopSteps,
  movePose,
  REVEAL_MS,
  risePose,
  smoothstep,
  wakePose,
  wrap,
} from "./motion";
import { createLighting } from "./lighting";
import { createPaint } from "./paint";
import { isDarkMode, readPalette, type Palette } from "./palette";
import { createGovernor, createPost, isPhone, startRung } from "./post";
import { buildPiece, jetPlume, type Built } from "./props";
import { pawnPathPoint } from "./path-spline";
import {
  assetsForStep,
  type LandmarkEntry,
  loadOrder,
  LOD_FROM_RUNG,
  modelFile,
  placementOf,
  PROP_INDEX,
  PROP_MODELS,
  propFile,
  propModelsOf,
  SCENE_ASSETS,
  SIDE_MODELS,
  type PropPlacement,
} from "./scene-assets";
import { BEAT_NODE, materialsOf } from "./piece-beats";
import { prepareModel, toyMarker, toyPiece, toySide } from "./toys";
import {
  type BuddyParts,
  makeBoard,
  makeBuddy,
  makePath,
  makePawn,
  makeTileBase,
  makeVeil,
  MARKER,
  PHONE_GRASS_SHARE,
  type PawnParts,
} from "./world";
import { createMoments, type MomentName, type MomentStage } from "./moments";
import { createConfetti } from "./confetti";
import { createPlay, SOFT, type Reactor } from "./play";

/* The 3D path's board (GH-148; v3, a solid tabletop board): vanilla
   three.js, imported dynamically by the host on `/path` only, after the
   overlay has painted (GH-141, implementation decision 6). One thick board
   holds every step as a tile on a loop, every piece on it modelled solid
   (`world.ts`, `props.ts`) or loaded (`scene-assets.ts`), and nothing on it
   is text. Selecting a step hops the pawn there along the loop and raises
   that tile's pieces in the data's order, lighting the caption lines as they
   settle. The camera rig (`camera-rig.ts`) holds each step close and travels
   with the pawn between them; the board draws while the rig moves or the
   tour plays, and stops when both are still. Tiles already built stay
   built. */

const TURN_RADIANS = 0.3;
const TURN_MS = 450;
const THEME_MS = 350;
/** How long a lost context may take to come back before the stills. */
const CONTEXT_RESTORE_MS = 3000;
/** Frames longer than this count as a pause (a hidden tab, a debugger), and
 *  the build's clock does not jump across them. */
const MAX_STEP_MS = 100;
/** Each piece after the first in a prop rises this much later. */
const PIECE_STAGGER_MS = 110;
/** The selected tile stands this much proud of the board, in its own
 *  units, as a tile picked up off a board does: its shadow says which. */
const LIFT_HEIGHT = 0.3;
/** How long a tile takes to rise or settle back. */
const LIFT_MS = 320;
/** However many pieces a prop has, the last starts with time left to
 *  rise. */
const MAX_PIECE_DELAY_MS = PROP_DROP_MS * 0.6;
/** A tile already built, built again, rises from part-way: it stays
 *  standing rather than vanishing and rising from nothing. */
const REBUILD_FROM = 0.42;
/** The moments that are the duo's gestures, which the camera leans in
 *  for. */
const DUO_MOMENTS: ReadonlySet<MomentName> = new Set(["wave", "spin", "jab"]);
/** The step that keeps its surprise: its piece stands under a lid until
 *  the tour reaches it (`makeVeil`). */
const VEILED: PathStepSlug = "next";
/** How long the lid takes to lift off, and how high it goes, in the
 *  tile's units: off before the piece under it has risen. */
const VEIL_MS = 280;
const VEIL_LIFT = 0.9;
/** The landing's thump: how far the tile dips under the pawn, in its own
 *  units (§4(d)'s "about 2 cm", judged by eye against the pawn). */
const LANDING_DIP = 0.07;
/** How far the ground grows out from a landmark's foot, in a tile's units:
 *  past its corners. */
const REVEAL_RADIUS = 3.6;

export type SceneSnapshot = {
  buildState: BuildState;
  lit: readonly number[];
  /** The props standing or rising on the board, in the data's order. */
  shown: readonly string[];
  turn: number;
  /** The step the board last settled, or is settling, on. */
  step?: PathStepSlug;
  /** Whether the camera has landed on `step`'s close-up with the pawn on
   *  its tile: the tour's cue to start the step's dwell. The build may still
   *  be rising (`buildState`). */
  settled: boolean;
  /** What the camera is doing (`camera-rig.ts`). */
  shot: CameraShot;
  /** The narration's last beat on the board, `<step>:<prop>:<nth>`, as
   *  the stage carries it (`data-scene-beat`); absent before any. */
  beat?: string;
  /** A piece's answer to the last click on it, `<piece>:<answer>:<count>`
   *  (`data-scene-reaction`); absent before any. */
  reaction?: string;
  /** The board's last moment (`moments.ts`), `<name>:<count>`
   *  (`data-scene-moment`). */
  moment?: string;
  /** Set when the shown step's tile shows its stills instead, and why; the
   *  board keeps running for the other steps. It names its step, so the host
   *  never pairs it with a step selected since. */
  stills?: { reason: SceneFallbackReason; slug: PathStepSlug };
};

export type SceneRuntimeOptions = {
  canvas: HTMLCanvasElement;
  signals: CapabilitySignals;
  reducedMotion: boolean;
  onChange(snapshot: SceneSnapshot): void;
  onFallback(reason: FallbackReason): void;
  /** Something the board did that makes a sound, for the Sound switch. */
  onEvent?(event: SceneEvent): void;
};

/** A cue of the narration (`stage-status.tsx`), as the board plays it. */
export type BoardCue = {
  slug: PathStepSlug;
  prop: string | null;
  /** The cue's index in its step's narration. */
  index: number;
};

/** How the tour stands, as the board follows it: playing (the close-up
 *  drifts), paused (whatever moves freezes where it is) or ended (the
 *  camera pulls back to the whole board). */
export type TourState = "playing" | "paused" | "ended";

export type ShowOptions = {
  /** The tour advanced here by itself: the pawn walks and the camera
   *  travels with it. Otherwise the step was picked and the camera flies. */
  advance: boolean;
  /** How long the step's narration lasts, which the close-up's drift
   *  spans. */
  narrationMs: number;
};

export type SceneRuntime = {
  /** Moves the pawn to `step`'s tile and builds it. */
  show(step: PathStep, options?: ShowOptions): void;
  setTourState(state: TourState): void;
  /** Jumps the move and the build to their end; false if nothing was
   *  moving. */
  skip(): boolean;
  /** Builds the shown step's tile again. */
  replay(): void;
  /** Plays the beat a narration cue's prop has (`beats.ts`). */
  cue(cue: BoardCue): void;
  /** Plays a tile's arrival again on the pieces it has now: for a landmark
   *  swapped in after its tile was built. */
  arriveTile(slug: PathStepSlug): void;
  turn(direction: -1 | 1): void;
  setReducedMotion(reduced: boolean): void;
  /** The part of the stage the page leaves the board, in CSS pixels; the
   *  whole stage until the host says otherwise. */
  setFrame(frame: StageFrame): void;
  /** The step whose tile, or a piece standing on it, is under a point on
   *  the canvas, in CSS pixels from its top-left corner; null for none. */
  pick(x: number, y: number): PathStepSlug | null;
  /** Plays the answer of the piece under a point, on the shown step's tile
   *  or the marker, even while the tour is paused; returns its name, or
   *  null with no such piece there. Decorative: the step does not change. */
  react(x: number, y: number): string | null;
  /** A fine pointer is over a point, or has left (null): lights the piece
   *  under it that answers a click, and says whether there is one. */
  hover(x: number | null, y?: number): boolean;
  /** Plays a moment now, on the shown step: for the clips. */
  moment(name: MomentName): void;
  /** Where a piece of the shown step's tile, or the marker's `figure` or
   *  `buddy`, is on the canvas, in CSS pixels; null if it is not shown. */
  locate(piece: string): { x: number; y: number } | null;
  /** What stands on each tile made so far, in the duo and beside the path:
   *  for the suite and the clips. */
  pieces(): PieceReport[];
  /** How far the shown tile's lid has lifted, 0 shut to 1 gone; null on a
   *  tile without one. For the suite. */
  lid(): number | null;
  dispose(): void;
};

/** One piece as it stands: from which file, or built in code, and the
 *  beat parts (`BEAT_NODE`) found under it. */
export type PieceReport = {
  step: PathStepSlug | "marker" | "side";
  piece: string;
  file: string | null;
  nodes: string[];
};

/** One piece on a tile, rising from its foot. */
type Riser = {
  /** Scaled as it rises; its piece stands inside, in `sinker`. */
  riser: Group;
  /** Lowered as it starts to rise. */
  sinker: Group;
  /** Its delay after its prop starts to rise. */
  delay: number;
  motion?: (progress: number) => void;
  /** A landmark comes up out of the tile rather than unfolding, this tall
   *  as built; undefined for any other piece. */
  landmark?: number;
  /** Whether its build has reached it: up, or rising. A dormant piece
   *  stands, but is not shown in `data-scene-props`' sense. */
  shown: boolean;
};

type Tile = {
  slug: PathStepSlug;
  group: Group;
  /** Its pieces by the prop they rise with, in the data's order. */
  props: Map<string, Riser[]>;
  /** Where its ground grows out from, and how far it has (`paint.ts`). */
  grow: IUniform<Vector3>;
  /** Each piece's beater, by its id: what a hop moves. */
  beaters: Map<string, Group>;
  /** The file each piece was made from, by its id; null for code. */
  files: Map<string, string | null>;
  /** The "?" step's lid (`makeVeil`), over its piece until it wakes. */
  veil?: Group;
};

function stepNamed(slug: PathStepSlug) {
  return PATH_STEPS.find((step) => step.slug === slug)!;
}

export function createSceneRuntime(options: SceneRuntimeOptions): SceneRuntime {
  const { canvas, signals, onChange, onFallback } = options;
  let reducedMotion = options.reducedMotion;

  /* Throws when the browser refuses a context, including one with a major
     performance caveat that the host's probe did not see; the host catches it
     and shows the stills. No multisampling, depth or stencil on the canvas:
     the post chain draws into its own buffers and smooths edges with SMAA
     (`post.ts`). */
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: true,
  });
  /* A phone takes §4(f)'s cuts: a lower pixel ratio, no AO, half-size
     bloom. */
  const phone = isPhone();

  const scene = new Scene();
  const camera = new PerspectiveCamera(LENS.long, 1, 0.5, 200);
  const board = new Group();
  scene.add(board);

  const lighting = createLighting(scene, renderer, TURN_LIMIT * TURN_RADIANS);
  const governor = createGovernor(startRung(phone));
  const post = createPost({
    renderer,
    scene,
    camera,
    phone,
    quality: governor.quality,
  });

  /* The table the board lies on is the page: only the board's shadow shows
     on it. */
  const tableMaterial = new ShadowMaterial({ opacity: 0.22 });
  /* No depth: the post chain reads an empty depth as the page, and hands
     the page's ground back there, shaded by this shadow (`post.ts`). */
  tableMaterial.depthWrite = false;
  const table = new Mesh(new PlaneGeometry(120, 120), tableMaterial);
  table.rotation.x = -Math.PI / 2;
  table.position.y = -BOARD.thickness;
  table.receiveShadow = true;
  scene.add(table);

  /* Light and dark mixed by one value that follows the site's class
     (storyboard §7.9): 0 is light, 1 is dark. Only the active mode's tokens
     can be read, so each mode's palette is read when the site is in it; the
     other starts as a copy and is never shown before it is read. */
  const themeMix = { value: isDarkMode() ? 1 : 0 };
  const firstPalette = readPalette();
  const palettes: { light: Palette; dark: Palette } = {
    light: firstPalette,
    dark: firstPalette,
  };
  let themeFrom = themeMix.value;
  let themeTarget = themeMix.value;
  let themeElapsed = THEME_MS;
  const paintBox = createPaint(firstPalette);
  const background = new Color();

  function paint() {
    const mixed = Object.fromEntries(
      (Object.keys(palettes.light) as (keyof Palette)[]).map((role) => [
        role,
        palettes.light[role].clone().lerp(palettes.dark[role], themeMix.value),
      ]),
    ) as Palette;
    paintBox.repaint(mixed);
    paintBox.setNight(themeMix.value);
    background.copy(mixed.fog);
    scene.background = background;
    lighting.setMix(mixed, themeMix.value);
    post.setMix(mixed, themeMix.value, background);
    /* A shadow on a dark page reads with a little more weight. */
    tableMaterial.opacity = 0.18 + 0.2 * themeMix.value;
  }
  paint();

  /* ─── The tiles ─── */

  /** Each landmark's outcome, by its id. */
  const models = new Map<string, ModelResult>();
  const tiles = new Map<PathStepSlug, Tile>();
  /** How tall each piece stands as built, by `<slug>:<piece>`. */
  const heights = new Map<string, number>();
  /** Tiles that could not be made, and why; tried again on the next show. */
  const failedTiles = new Map<PathStepSlug, SceneFallbackReason>();

  function stepIndex(slug: PathStepSlug) {
    return LOOP.indexOf(slug);
  }

  function makeTile(slug: PathStepSlug): Tile {
    const landmarks = assetsForStep(slug);
    /* The ground grows out from the tile's first landmark, or its middle. */
    const foot = landmarks[0]?.anchor ?? { x: 0, z: 0 };
    const grow: IUniform<Vector3> = { value: new Vector3(foot.x, foot.z, 0) };
    const group = makeTileBase(
      paintBox,
      slug,
      grow,
      phone ? PHONE_GRASS_SHARE : 1,
    );
    const step = stepNamed(slug);
    const lifePieces: LifePiece[] = [];
    const props = new Map<string, Riser[]>(
      step.props.map((prop) => [prop.id, []]),
    );
    const firstProp = step.props[0].id;
    const beaters = new Map<string, Group>();
    const files = new Map<string, string | null>();
    piecesOf(slug).forEach((piece, index) => {
      const asset = landmarks.find((each) => each.piece === piece.id);
      const model = asset && models.get(asset.id);
      const placement = placementOf(slug, piece.id);
      const toy = placement && toys.get(placement.model);
      const seed = index + stepIndex(slug) * 7;
      let built: Built;
      let file: string | null = null;
      if (asset && model?.status === "loaded") {
        built = loadedPiece(fitModel(model.scene, asset, piece), piece.id);
        file = model.file;
      } else if (placement && toy?.status === "loaded") {
        built = toyBuilt(toy.scene, placement, piece, seed);
        file = toy.file;
      } else {
        built = buildPiece(paintBox, slug, piece, seed);
      }
      files.set(piece.id, file);
      /* Measured before it is parented, so in its own frame: how tall it
         stands once up, for the camera's close-up (`pieceHeight`). */
      heights.set(
        `${slug}:${piece.id}`,
        new Box3().setFromObject(built.object).max.y,
      );
      /* The riser scales about the piece's foot; the sinker inside it
         lowers the piece as it starts, leaving the piece's own pose alone. */
      /* The beater inside the sinker is the narration's: beats and hops
         move it, and the rise never does. */
      const riser = new Group();
      const sinker = new Group();
      const beater = new Group();
      /* The handle inside the beater is a click's (`play.ts`): its own
         springs, apart from the beats'. */
      const handle = new Group();
      handle.add(built.object);
      handle.userData.reactor = {
        piece: piece.id,
        handle,
        root: beater,
      } satisfies Reactor;
      beater.add(handle);
      beaters.set(piece.id, beater);
      sinker.add(beater);
      riser.add(sinker);
      riser.position.set(piece.x, TILE.thickness + (piece.y ?? 0), piece.z);
      group.add(riser);
      /* A piece that renders no prop, such as a tree, rises with the
         tile's first. */
      const risers =
        props.get(piece.prop ?? firstProp) ?? props.get(firstProp)!;
      risers.push({
        riser,
        sinker,
        delay: risers.length * PIECE_STAGGER_MS,
        motion: built.motion,
        landmark: asset ? heights.get(`${slug}:${piece.id}`) : undefined,
        shown: false,
      });
      lifePieces.push({
        slug,
        piece: piece.id,
        beater,
        lit: () => litOf(beater),
        shown: () => riser.visible,
      });
    });
    const [x, z] = tileCentre(slug);
    group.position.set(x, 0, z);
    group.scale.setScalar(tileScale(slug));
    group.userData.slug = slug;
    life.setTile(slug, lifePieces);
    const veiled = slug === VEILED ? piecesOf(slug)[0] : undefined;
    const veil = veiled && makeVeil(paintBox, veiled);
    if (veil) group.add(veil);
    return { slug, group, props, grow, beaters, files, veil };
  }

  /** A toy prop as a built piece (`toys.ts`), graded as a landmark is. */
  function toyBuilt(
    scene: Object3D,
    placement: PropPlacement,
    piece: Piece,
    seed: number,
  ): Built {
    const built = toyPiece(paintBox, scene, placement, piece, seed);
    gradeLandmark(built.object);
    return built;
  }

  /** A generated landmark as a built piece: graded into the board's
   *  palette, and the Jet d'Eau's jetty given its plume, which the
   *  generated jetty does not have. */
  function loadedPiece(object: Object3D, piece: string): Built {
    gradeLandmark(object);
    if (piece !== "jet-d-eau") return { object };
    const jet = jetPlume(paintBox);
    /* Off the jetty's far end, as the stand-in stands it. */
    jet.position.set(0.18, 0.02, 0.1);
    const group = new Group();
    group.add(object, jet);
    return { object: group };
  }

  /** Grades every textured material of a generated landmark
   *  (`grade.ts`). The board's own materials carry no texture map, so a
   *  stand-in is never graded. */
  function gradeLandmark(object: Object3D) {
    for (const made of materialsOf(object)) {
      if (made.map) paintBox.landmark(made);
    }
  }

  /** How lit each graded material of `object` is, for its `light` beat. */
  function litOf(object: Object3D): IUniform<number>[] {
    return materialsOf(object).flatMap((made) =>
      made.userData.inkLit ? [made.userData.inkLit] : [],
    );
  }

  /* ─── The pawn ─── */

  const pawn = makePawn(paintBox);
  const pawnParts = pawn.userData.pawn as PawnParts;
  pawn.visible = false;
  board.add(pawn);
  /* The marker is two (the owner's ask): the figure, and its buddy
     travelling alongside, a beat behind and bouncier. Each is a handle a
     generated model goes inside (`MARKER`). */
  const figure = pawnParts.body.getObjectByName(MARKER.figure) as Group;
  figure.userData.reactor = {
    piece: "figure",
    handle: figure,
    root: figure,
  } satisfies Reactor;
  const buddy = makeBuddy(paintBox);
  const buddyParts = buddy.userData.buddy as BuddyParts;
  const buddyHandle = buddyParts.body.getObjectByName(MARKER.buddy) as Group;
  /** The handle's scale at rest, read before any squash moves it: a model
   *  inside it is drawn this much larger. */
  const BUDDY_DRAWN = buddyHandle.scale.y;
  buddyHandle.userData.reactor = {
    piece: "buddy",
    handle: buddyHandle,
    root: buddyHandle,
  } satisfies Reactor;
  buddy.visible = false;
  board.add(buddy);
  /** The buddy stands this share of the figure's height: the approved
   *  pair's ratio, its head at about his hip (`docs/path-assets.md`). */
  const BUDDY_SHARE = 0.58;
  /** A seen marker swap's hop (`swapMarker`): its kick, and when, after
   *  it, a SOFT spring reaches its top and comes back down. */
  const SWAP_HOP = 3.2;
  const SWAP_PEAK_MS = 90;
  const SWAP_LAND_MS = 280;
  /** The buddy follows the figure this far behind, in ms of its move. */
  const BUDDY_LAG_MS = 130;
  /** Where the buddy stands beside the figure, in the board's frame, before
   *  the tile's scale: to its left and a little in front. */
  const BUDDY_SIDE = new Vector3(-1.05, 0, 0.34);
  /** Its hop, against the figure's: higher for its size, so bouncier. */
  const BUDDY_HOP = 0.82;
  /** The move the buddy is still finishing after the figure has landed. */
  let trail: Move | undefined;
  const buddyFoot = new Vector3();

  /** A move of the pawn, timed by the camera's transit: it leaves at
   *  `hopStartMs` and lands at `landMs`. An opening drops it onto its tile
   *  instead. */
  type Move = {
    from: PathStepSlug;
    steps: number;
    elapsed: number;
    transit: Transit;
  };

  const loopAt = (index: number) => LOOP[wrap(index, LOOP.length)];

  /** How far through its hops `m` is at `ms`: 0 before it leaves, 1 on
   *  landing. */
  function hopProgress(m: Move, ms: number) {
    const { hopStartMs, landMs } = m.transit;
    return Math.min(Math.max((ms - hopStartMs) / (landMs - hopStartMs), 0), 1);
  }

  function moveAt(m: Move, ms: number) {
    if (m.transit.kind === "opening") {
      const p = hopProgress(m, ms);
      /* Dropped onto its tile: falling faster as it comes. */
      return { along: 0, lift: 2 * (1 - p * p) };
    }
    const kind = m.transit.kind === "skip" ? "skip" : "travel";
    return movePose(kind, m.steps, hopProgress(m, ms));
  }

  /** Where the pawn's foot is `ms` into `m`, on the path, in the board's
   *  frame: off its spot as it leaves, along the spline between tiles, and
   *  onto the next spot as it lands, standing as high as the tiles under it
   *  have risen. */
  function pawnFoot(m: Move, ms: number, out: Vector3) {
    const from = stepIndex(m.from);
    const { along } = moveAt(m, ms);
    pawnPathPoint(from, along, out);
    const base = Math.floor(along);
    const u = along - base;
    const blend = smoothstep(u);
    const [a, b] = [
      liftOf(loopAt(from + base)),
      liftOf(loopAt(from + base + 1)),
    ];
    out.y += a + (b - a) * blend;
    return out;
  }

  /** How far each tile has risen, 0 on the board to 1 lifted: the selected
   *  one rises, the rest settle. */
  const lifts = new Map<PathStepSlug, number>();
  const liftTarget = (slug: PathStepSlug) => (slug === current ? 1 : 0);
  /** How high `slug`'s tile stands off the board now, in scene units: as
   *  far as it has risen, less the landing's thump under the pawn. */
  const liftOf = (slug: PathStepSlug) =>
    (easeInOut(lifts.get(slug) ?? 0) * LIFT_HEIGHT -
      (slug === pawnAt && !move
        ? landingDip(landingElapsed) * LANDING_DIP
        : 0)) *
    tileScale(slug);

  /** Moves every tile's rise `step` ms toward where it is headed, or all
   *  the way at once; whether any moved. */
  function liftTiles(step: number) {
    let changed = false;
    for (const slug of LOOP) {
      const from = lifts.get(slug) ?? 0;
      const to = liftTarget(slug);
      if (from === to) continue;
      const next =
        reducedMotion || step === Infinity
          ? to
          : from +
            Math.sign(to - from) *
              Math.min(step / LIFT_MS, Math.abs(to - from));
      if (next === from) continue;
      lifts.set(slug, next);
      changed = true;
    }
    return changed;
  }

  function lifting() {
    return LOOP.some((slug) => (lifts.get(slug) ?? 0) !== liftTarget(slug));
  }

  /* ─── Loading ─── */

  let prepared = false;
  /** The one `prepare` in flight: a second show while it runs waits on it. */
  let preparing: Promise<void> | undefined;
  /** The landmarks the index lists, by id: none until it is read. */
  let listed: ReadonlyMap<string, LandmarkEntry> = new Map();
  /** Whether the idle load of the rest has started. */
  let loadingRest = false;

  /** Loads in flight, by id: a second ask while one runs waits on it, so a
   *  quick reselection never fetches, or orphans, a model twice. */
  const loading = new Map<string, Promise<void>>();

  const idsOf = (slug: PathStepSlug) =>
    assetsForStep(slug).map((asset) => asset.id);

  /** Whether a landmark of `slug`'s failed: its tile waits on it again. */
  const failedIn = (slug: PathStepSlug) =>
    idsOf(slug).some((id) => models.get(id)?.status === "failed");

  /** Marks the canvas `data-path-landmarks`: "settled" once every landmark
   *  the index lists, and every toy prop and marker, has arrived, failed or
   *  is known absent; "loading" until then. */
  function markLandmarks() {
    const pending =
      [...listed.keys()].some((id) => !models.has(id) || loading.has(id)) ||
      PROP_MODELS.some((id) => !toys.has(id)) ||
      toyLoading.size > 0;
    canvas.dataset.pathLandmarks = pending ? "loading" : "settled";
  }

  /* ─── The toys (v3-toys) ─── */

  /** Each toy prop's and marker's outcome, by its model id. One that does
   *  not arrive leaves its code stand-in standing: never a failure. */
  const toys = new Map<string, ModelResult>();
  const toyLoading = new Map<string, Promise<void>>();
  /** The prop index, read once the first tile has started to build: no
   *  prop or marker is any part of the first paint. */
  let toyIndex: Promise<ReadonlyMap<string, LandmarkEntry>> | undefined;
  /** The first landing's own props and the duo, which every later load
   *  waits behind. */
  let firstToys: Promise<void> = Promise.resolve();
  let toysStarted = false;

  /** Asks for the duo and `slug`'s own props, once, as the first tile to
   *  build starts: the opening's drop and the build's order give them time
   *  to swap in unseen, and each other step waits behind them. */
  function startToys(slug: PathStepSlug) {
    if (toysStarted) return;
    toysStarted = true;
    firstToys = loadToys([MARKER.figure, MARKER.buddy, ...propModelsOf(slug)]);
  }

  /** Fetches the toy models of `ids` not yet asked for: the LOD on a phone
   *  or a stepped-down board. One the index does not list is never asked
   *  for. Each that arrives takes its stand-ins' places (`placeToy`). */
  async function loadToys(ids: readonly string[]) {
    const index = await (toyIndex ??= loadIndex(PROP_INDEX));
    if (disposed) return;
    const lod = phone || governor.rung >= LOD_FROM_RUNG;
    await Promise.all(
      ids.map((id) => {
        if (toys.has(id)) return undefined;
        const entry = index.get(id);
        if (!entry) {
          toys.set(id, { status: "absent" });
          markLandmarks();
          return undefined;
        }
        let load = toyLoading.get(id);
        if (!load) {
          const file = modelFile({ file: propFile(id) }, entry, lod);
          load = loadModel(file).then((result) => {
            toyLoading.delete(id);
            if (disposed) return;
            let outcome = result;
            if (result.status === "loaded") {
              try {
                prepareModel(id, result.scene);
              } catch (error) {
                console.error(error);
                outcome = { status: "failed", reason: "scene-failed" };
              }
            }
            toys.set(id, outcome);
            if (outcome.status === "loaded") {
              /* A swap that throws leaves its stand-ins standing, and the
                 loads queued behind this one going. */
              try {
                placeToy(id, outcome.scene);
              } catch (error) {
                console.error(error);
              }
            }
            markLandmarks();
          });
          toyLoading.set(id, load);
          markLandmarks();
        }
        return load;
      }),
    );
  }

  /** A toy model has arrived: it takes the place of every stand-in it is
   *  for, on the tiles made so far, beside the path, or in the duo. */
  function placeToy(id: string, scene: Object3D) {
    for (const slug of LOOP) {
      if (propModelsOf(slug).includes(id)) swapTile(slug, id);
    }
    for (const [name, side] of Object.entries(SIDE_MODELS)) {
      if (side.model === id) swapSide(name, scene, side);
    }
    if (id === MARKER.figure) swapMarker(figure, toyMarker(scene, PAWN_HEIGHT));
    if (id === MARKER.buddy) {
      swapMarker(
        buddyHandle,
        toyMarker(scene, (PAWN_HEIGHT * BUDDY_SHARE) / BUDDY_DRAWN),
      );
    }
  }

  /** Whether a swap now would be seen moving: the board is showing, with
   *  motion. */
  const swapSeen = () => canvas.style.opacity !== "0" && !reducedMotion;

  /** Puts `model` in `holder` in place of what it held. */
  function replaceChildren(holder: Object3D, model: Object3D) {
    for (const child of [...holder.children]) {
      holder.remove(child);
      retire(child);
    }
    holder.add(model);
  }

  /** A side prop's model takes its holder's stand-in's place. */
  function swapSide(
    name: string,
    scene: Object3D,
    box: (typeof SIDE_MODELS)[keyof typeof SIDE_MODELS],
  ) {
    const holder = board.getObjectByName(name);
    if (!holder) return;
    const model = toySide(scene, box);
    gradeLandmark(model);
    replaceChildren(holder, model);
    if (swapSeen()) {
      life.hop(holder);
      requestFrame();
    } else render();
  }

  /** A marker's model takes its stand-in's place inside its handle, which
   *  keeps its own pose: every gesture moves the handle, so each plays on
   *  the model as it did on the stand-in. Unseen, it swaps at once; seen,
   *  the stand-in hops, the model takes its place at the top of the hop,
   *  stretched, and lands with a squash, so the change reads as a gesture
   *  rather than a cut. */
  function swapMarker(handle: Group, model: Object3D) {
    gradeLandmark(model);
    if (!pawn.visible || !swapSeen()) {
      replaceChildren(handle, model);
      render();
      return;
    }
    /* On the board's clock, so a pause holds the hop and the swap
       together; settled at once (`setReducedMotion`), it lands then. */
    pendingMarkers.set(handle, model);
    gestures.kick(handle, "y", SWAP_HOP, SOFT);
    gestures.after(SWAP_PEAK_MS, () => {
      if (!placePendingMarker(handle)) return;
      gestures.kick(handle, "squash", 1.2);
      gestures.after(SWAP_LAND_MS - SWAP_PEAK_MS, () =>
        gestures.kick(handle, "squash", -1.6),
      );
    });
    requestFrame();
  }

  /** A marker model waiting on its hop's top, by its handle. */
  const pendingMarkers = new Map<Group, Object3D>();

  /** Puts a marker's waiting model in; whether there was one. */
  function placePendingMarker(handle: Group) {
    const model = pendingMarkers.get(handle);
    if (!model) return false;
    pendingMarkers.delete(handle);
    replaceChildren(handle, model);
    return true;
  }

  /** Fetches the landmarks of `ids` not yet loaded or known absent: the
   *  LOD on a phone or a stepped-down board. One that arrives after its
   *  tile was made takes its stand-in's place there. */
  async function loadModels(ids: readonly string[]) {
    const lod = phone || governor.rung >= LOD_FROM_RUNG;
    await Promise.all(
      SCENE_ASSETS.filter((asset) => ids.includes(asset.id)).map((asset) => {
        const known = models.get(asset.id);
        if (known && known.status !== "failed") return undefined;
        let load = loading.get(asset.id);
        if (!load) {
          const file = modelFile(asset, listed.get(asset.id), lod);
          load = loadModel(file).then((result) => {
            loading.delete(asset.id);
            if (disposed) return;
            models.set(asset.id, result);
            if (result.status === "loaded") swapTile(asset.step);
            markLandmarks();
          });
          loading.set(asset.id, load);
          markLandmarks();
        }
        return load;
      }),
    );
  }

  /* What the board needs before any tile can show: the card grain and the
     landmark index. A landmark the index does not list stands in, asked for
     by no one. A grain that does not load is a board without it, not a
     reason to drop the board. */
  async function prepare() {
    await Promise.all([
      loadGrain().then(
        (texture) => {
          if (disposed) return texture.dispose();
          paintBox.setGrain(texture);
        },
        () => undefined,
      ),
      loadLandmarkIndex().then((index) => {
        listed = index;
        for (const asset of SCENE_ASSETS) {
          if (!listed.has(asset.id)) models.set(asset.id, { status: "absent" });
        }
        markLandmarks();
      }),
    ]);
    prepared = true;
  }

  /** The pawn is headed for `slug`: its landmarks and props and the next
   *  step's are fetched now, so the tour's next landing finds its own in. */
  function approach(slug: PathStepSlug) {
    const next = loopAt(stepIndex(slug) + 1);
    void loadModels([...idsOf(slug), ...idsOf(next)]);
    void firstToys.then(() =>
      loadToys([...propModelsOf(slug), ...propModelsOf(next)]),
    );
  }

  /** Once the first tile is up, the rest arrive when the page is idle, one
   *  step at a time, nearest first, after the side props: behind the first
   *  landing's own props and the duo. */
  function loadRest(from: PathStepSlug) {
    if (loadingRest) return;
    loadingRest = true;
    whenIdle(async () => {
      await firstToys;
      await loadToys(Object.values(SIDE_MODELS).map((side) => side.model));
      for (const slug of loadOrder(LOOP, from)) {
        if (disposed) return;
        await loadModels(idsOf(slug));
        await loadToys(propModelsOf(slug));
      }
    });
  }

  const frustum = new Frustum();
  const viewProjection = new Matrix4();
  const tileBox = new Box3();

  /** Whether any of `tile` is in the camera's view, on a canvas showing. */
  function onScreen(tile: Tile) {
    if (canvas.style.opacity === "0") return false;
    frustum.setFromProjectionMatrix(
      viewProjection.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );
    return frustum.intersectsBox(tileBox.setFromObject(tile.group));
  }

  /** Frees what a replaced tile, holder or marker alone held: its pieces'
   *  geometry. Its materials are the paint box's, and a loaded landmark's or
   *  toy's geometry is the model's, kept for whatever replaces it. */
  function retire(group: Object3D) {
    const kept = new Set<BufferGeometry>();
    for (const result of [...models.values(), ...toys.values()]) {
      if (result.status !== "loaded") continue;
      result.scene.traverse((node) => {
        if (node instanceof Mesh) kept.add(node.geometry);
      });
    }
    group.traverse((node) => {
      if (node instanceof InstancedMesh) node.dispose();
      if (node instanceof Mesh && !kept.has(node.geometry)) {
        node.geometry.dispose();
      }
    });
  }

  /** Remakes `slug`'s tile, if it is made, with the landmarks that have
   *  arrived since: each takes its stand-in's place, posed as the tile
   *  stood. On screen, the tile arrives (`arriveTile`); for a toy prop,
   *  `toy`, only its pieces already standing hop, and one not yet risen
   *  swaps unseen. */
  function swapTile(slug: PathStepSlug, toy?: string) {
    const old = tiles.get(slug);
    if (!old) return;
    let tile: Tile;
    try {
      tile = makeTile(slug);
    } catch (error) {
      /* The stand-in it had keeps standing. */
      console.error(error);
      return;
    }
    board.remove(old.group);
    board.add(tile.group);
    tiles.set(slug, tile);
    retire(old.group);
    pose();
    /* Its first draw compiles and uploads: not a measure of the board. */
    unmeasured = true;
    if (!onScreen(tile)) return;
    if (toy === undefined) {
      arriveTile(slug);
      return;
    }
    let hopped = false;
    for (const piece of piecesOf(slug)) {
      if (placementOf(slug, piece.id)?.model !== toy) continue;
      const beater = tile.beaters.get(piece.id);
      const standing = [...tile.props.values()]
        .flat()
        .some(
          (each) => each.riser.visible && each.sinker.children[0] === beater,
        );
      if (beater && standing && !reducedMotion) {
        life.hop(beater);
        hopped = true;
      }
    }
    if (hopped) requestFrame();
    else render();
  }

  /** Makes every tile not yet made; a tile whose landmark failed, or whose
   *  own code throws, is left off the board and tried again next time. */
  function makeTiles() {
    for (const slug of LOOP) {
      if (tiles.has(slug)) continue;
      const failed = assetsForStep(slug)
        .map((asset) => models.get(asset.id))
        .find((result) => result?.status === "failed");
      if (failed?.status === "failed") {
        failedTiles.set(slug, failed.reason);
        continue;
      }
      try {
        const tile = makeTile(slug);
        tiles.set(slug, tile);
        board.add(tile.group);
        failedTiles.delete(slug);
      } catch (error) {
        console.error(error);
        failedTiles.set(slug, "scene-failed");
      }
    }
  }

  /* ─── The build ─── */

  /** Tiles whose pieces stand. */
  const built = new Set<PathStepSlug>();
  /** Tiles passed on a jump, rising together at once, by elapsed ms. */
  const catchingUp = new Map<PathStepSlug, number>();
  /** The plan's start of each prop on a tile whose wake was cut short, so
   *  it rises on as it was rising (`abandon`). */
  const wakeStarts = new Map<PathStepSlug, Map<string, number>>();
  /** When a tile catching up stands whole: its last prop's rise done. */
  const catchUpEnd = (slug: PathStepSlug) =>
    Math.max(0, ...(wakeStarts.get(slug)?.values() ?? [])) + PROP_DROP_MS;
  let current: PathStepSlug | undefined;
  let plan: BuildPlan | undefined;
  /** When each of the plan's props starts to rise, by id. */
  let planStarts = new Map<string, number>();
  /** Whether the current tile stood before this build began. */
  let rebuild = false;
  let pawnAt: PathStepSlug | undefined;
  let move: Move | undefined;
  let buildElapsed = 0;
  let landingElapsed = LANDING_MS;
  let buildState: BuildState = "idle";
  let lit: readonly number[] = [];
  let shown: readonly string[] = [];
  let turnStep = 0;
  let turnFrom = 0;
  let turnElapsed = TURN_MS;
  let stills: SceneSnapshot["stills"];

  /** Whether the camera holds the current step's close-up with the pawn
   *  on its tile; what was last reported. */
  let settled = false;
  function isSettled() {
    return Boolean(current) && !move && rig.settledOn() === current;
  }

  /** The camera's shot as last reported. */
  let shot: CameraShot = "idle";

  function emit() {
    settled = isSettled();
    shot = rig.shot();
    onChange({
      buildState,
      lit,
      shown,
      turn: turnStep,
      step: current,
      settled,
      shot,
      beat: lastBeat,
      reaction: lastReaction,
      moment: lastMoment,
      stills,
    });
  }

  function poseTile(tile: Tile, at: (planned: string) => number | "up") {
    /* A tile built again never vanishes: it sinks part-way and springs up
       from there. */
    const again = rebuild && tile.slug === current;
    /* The lid lifts from the first piece's wake, on its own clock; over a
       tile built again it is already gone. */
    let lifted = again ? VEIL_MS : 0;
    for (const [prop, risers] of tile.props) {
      const elapsed = at(prop);
      for (const piece of risers) {
        const delay = Math.min(piece.delay, MAX_PIECE_DELAY_MS);
        const local =
          elapsed === "up" ? 1 : (elapsed - delay) / (PROP_DROP_MS - delay);
        const progress = again
          ? REBUILD_FROM + (1 - REBUILD_FROM) * Math.max(local, 0)
          : local;
        const window = PROP_DROP_MS - delay;
        piece.shown = again || local > 0;
        lifted = Math.max(lifted, elapsed === "up" ? VEIL_MS : elapsed - delay);
        if (piece.landmark !== undefined) {
          /* A landmark comes up out of its tile on a spring: igloo's
             materialise, not a fold (§4(d)); from where it stood dormant,
             unless it is built and arriving again. */
          const arriving = arrivals.get(tile.slug);
          const sink =
            arriving !== undefined
              ? landmarkSink(arriving / PROP_DROP_MS, window)
              : again
                ? landmarkSink(progress, window)
                : landmarkWake(local, window);
          piece.riser.visible = sink < 1;
          piece.riser.scale.set(1, 1, 1);
          piece.sinker.position.y = -sink * piece.landmark;
        } else {
          /* A piece not yet reached stands dormant, and wakes from there. */
          const pose = again
            ? risePose(progress, window)
            : wakePose(local, window);
          piece.riser.visible = pose.visible;
          piece.riser.scale.set(pose.width, pose.height, pose.width);
          /* The sinker sits inside the riser's scale: undo its height, so
             the sink is in the tile's units. */
          piece.sinker.position.y = pose.visible ? -pose.sink / pose.height : 0;
        }
        piece.motion?.(Math.min(Math.max(local, 0), 1));
      }
    }
    if (tile.veil) poseVeil(tile.veil, lifted);
  }

  /** Lifts the lid off, `ms` in: up and away on a quick ease-out, shrinking
   *  as it goes, faster than the piece under it rises. */
  function poseVeil(veil: Group, ms: number) {
    const t = easeOutQuart(Math.min(Math.max(ms / VEIL_MS, 0), 1));
    veil.visible = t < 1;
    veil.position.y = TILE.thickness + t * VEIL_LIFT;
    veil.scale.setScalar(1 - 0.6 * t);
  }

  /** Puts every piece and the pawn where the clocks say they are. */
  function pose() {
    if (reducedMotion) liftTiles(Infinity);
    for (const tile of tiles.values()) {
      const slug = tile.slug;
      tile.group.position.y = liftOf(slug);
      if (slug === current && plan && buildState === "building") {
        const rising = move ? -1 : buildElapsed;
        poseTile(tile, (prop) =>
          rebuild && move ? "up" : rising - (planStarts.get(prop) ?? 0),
        );
      } else if (catchingUp.has(slug)) {
        const elapsed = catchingUp.get(slug)!;
        const starts = wakeStarts.get(slug);
        poseTile(tile, (prop) => elapsed - (starts?.get(prop) ?? 0));
      } else if (built.has(slug)) {
        poseTile(tile, () => "up");
      } else {
        poseTile(tile, () => -1);
      }
      tile.grow.value.z = groundOf(slug);
    }
    posePawn();

    const nextLit = plan && !move ? litLines(plan, buildElapsed) : [];
    const nextShown = PATH_STEPS.flatMap((step) => {
      const tile = tiles.get(step.slug);
      if (!tile) return [];
      return step.props
        .filter((prop) => tile.props.get(prop.id)?.some((piece) => piece.shown))
        .map((prop) => prop.id);
    });
    if (nextLit.join() !== lit.join() || nextShown.join() !== shown.join()) {
      lit = nextLit;
      shown = nextShown;
      emit();
    }
  }

  const foot = new Vector3();
  const footAhead = new Vector3();

  function posePawn() {
    if (!pawnAt) {
      pawn.visible = false;
      buddy.visible = false;
      return;
    }
    const { body, contact, ring } = pawnParts;
    let lift = 0;
    if (move) {
      const now = moveAt(move, move.elapsed);
      lift = now.lift;
      pawnFoot(move, move.elapsed, foot);
      /* Leaning into the hop, as a flicked piece would. */
      const ahead = pawnFoot(move, move.elapsed + 30, footAhead).sub(foot);
      body.rotation.z = -Math.sign(ahead.x) * Math.min(lift, 1) * 0.18;
      body.rotation.x = Math.sign(ahead.z) * Math.min(lift, 1) * 0.18;
      body.scale.set(1, 1, 1);
      /* An opening's pawn shows once its drop starts. */
      pawn.visible =
        move.transit.kind !== "opening" ||
        move.elapsed >= move.transit.hopStartMs;
    } else {
      pawn.visible = true;
      pawnPathPoint(stepIndex(pawnAt), 0, foot).y += liftOf(pawnAt);
      body.rotation.set(0, 0, 0);
      const squash = landingSquash(landingElapsed) * idleSquash(restMs);
      body.scale.set(...squashScale(squash));
    }
    pawn.position.copy(foot);
    body.position.y = lift * HOP_HEIGHT;
    /* The ring and the shadow stay on the tile, fading as the pawn rises. */
    const away = Math.min(lift / 2, 1);
    for (const flat of [contact, ring]) {
      flat.material.opacity = flat.userData.opacity * (1 - 0.7 * away);
      flat.scale.setScalar(1 - 0.25 * away);
    }
    poseBuddy();
  }

  /** The buddy: on the figure's path a beat behind it, hopping higher and
   *  stretching in the air; at rest, beside it. */
  function poseBuddy() {
    buddy.visible = pawn.visible;
    if (!buddy.visible || !pawnAt) return;
    const following = move ?? trail;
    let lift = 0;
    if (following) {
      const ms = Math.max(following.elapsed - BUDDY_LAG_MS, 0);
      pawnFoot(following, ms, buddyFoot);
      lift = moveAt(following, ms).lift;
    } else {
      pawnPathPoint(stepIndex(pawnAt), 0, buddyFoot).y += liftOf(pawnAt);
    }
    buddyFoot.addScaledVector(BUDDY_SIDE, tileScale(pawnAt));
    buddy.position.copy(buddyFoot);
    const { body, contact } = buddyParts;
    body.position.y = lift * HOP_HEIGHT * BUDDY_HOP;
    body.scale.set(...squashScale(1 + 0.1 * Math.min(lift, 1)));
    const away = Math.min(lift / 2, 1);
    contact.material.opacity = contact.userData.opacity * (1 - 0.7 * away);
  }

  function finish() {
    move = undefined;
    trail = undefined;
    if (current) pawnAt = current;
    landingElapsed = LANDING_MS;
    for (const slug of catchingUp.keys()) built.add(slug);
    catchingUp.clear();
    wakeStarts.clear();
    if (plan) buildElapsed = plan.building.at(-1)?.landsAt ?? 0;
    if (current) built.add(current);
    rebuild = false;
    pose();
    /* Emitted even when already built: under reduced motion one step's end
       state cuts to another's, and the host has to hear the new step. */
    buildState = "built";
    emit();
    requestFrame();
  }

  /* ─── The camera ─── */

  const rig = createCameraRig({
    camera,
    board,
    liftHeight: LIFT_HEIGHT,
    pieceHeight: (slug, piece) => heights.get(`${slug}:${piece}`),
  });
  rig.setReducedMotion(reducedMotion);
  let stageFrame: StageFrame | undefined;

  /** The stage's free part and the tabs laid over it, in clip space. */
  function clipFrame() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    const frame = stageFrame ?? wholeStage(width, height);
    const clip = (rect: StageRect) => toClip(rect, width, height);
    return { safe: clip(frame.safe), clear: frame.clear.map(clip) };
  }

  function frame() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    /* One allocation at the new size; the canvas's CSS size is the page's. */
    renderer.setDrawingBufferSize(
      width,
      height,
      drawingPixelRatio(
        width,
        height,
        window.devicePixelRatio,
        pixelRatioCap(phone),
      ) * post.quality.pixelScale,
    );
    post.setSize(width, height);
    camera.aspect = width / height;
    rig.setFrame(clipFrame());
    rig.place();
  }

  const raycaster = new Raycaster();
  const pointer = new Vector2();

  /* ─── The frame loop: runs only while something is moving ─── */

  let frameRequest = 0;
  let lastTime: number | undefined;
  /** The next draw compiles or uploads something new — a landmark swapped
   *  in, a rung's changed chain — so its time is not the governor's. */
  let unmeasured = false;
  let paused = document.visibilityState === "hidden";
  /** The canvas scrolled out of view, or not laid out: nothing to draw.
   *  The clocks the tour waits on still run, undrawn, until the step is
   *  built and settled; then the board stops. */
  let offscreen = false;
  /** The tour as last reported, and whether its pause has frozen the
   *  board: set by a pause, cleared by play or by the next selection. */
  let tourState: TourState = "playing";
  let frozen = false;
  let contextLost = false;
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;
  let fellBack = false;
  const frameTimes: number[] = [];

  /* Frames are drawn on demand: a move, a build, a turn, a theme change,
     or the camera moving, which includes its close-up breathing while the
     tour plays, and the board's life while it lives (`alive()`). The frame
     sample fills only from those, so a settled board — paused, ended or
     under reduced motion — draws nothing while it waits for a verdict. A paused tour freezes the
     tour's own motion; a theme change or a turn, the visitor's, plays on. */
  function moving() {
    if (themeElapsed < THEME_MS || turnElapsed < TURN_MS) return true;
    if (reactions.active()) return true;
    if (frozen) return false;
    return (
      buildState === "building" ||
      catchingUp.size > 0 ||
      landingElapsed < LANDING_MS ||
      lifting() ||
      rig.moving(tourState === "playing") ||
      life.active() ||
      gestures.active() ||
      moments.active() ||
      confetti.active() ||
      trail !== undefined ||
      arrivals.size > 0 ||
      alive()
    );
  }

  function requestFrame() {
    if (frameRequest || paused || contextLost || fellBack) return;
    if (offscreen && isSettled() && buildState !== "building") return;
    frameRequest = requestAnimationFrame(tick);
  }

  function fallBack(reason: FallbackReason) {
    if (fellBack) return;
    fellBack = true;
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    onFallback(reason);
  }

  function tick(time: number) {
    frameRequest = 0;
    const delta = lastTime === undefined ? 0 : time - lastTime;
    lastTime = time;

    /* The first `FRAME_SAMPLE_SIZE` frame times decide the fallback; a frame
       that spans a pause, or the first after an idle stretch, is not a frame
       time. */
    if (delta > 0 && delta < 1000 && frameTimes.length < FRAME_SAMPLE_SIZE) {
      frameTimes.push(delta);
      if (frameTimes.length === FRAME_SAMPLE_SIZE) {
        const reason = decideFallback(signals, frameTimes);
        if (reason) return fallBack(reason);
      }
    }
    /* The visitor's own changes run on while the tour is paused. */
    const free = Math.min(delta, MAX_STEP_MS);
    const step = frozen ? 0 : free;
    let posed = false;
    for (const [slug, elapsed] of catchingUp) {
      if (elapsed + step >= catchUpEnd(slug)) {
        catchingUp.delete(slug);
        wakeStarts.delete(slug);
        built.add(slug);
      } else catchingUp.set(slug, elapsed + step);
      posed = true;
    }
    if (buildState === "building" && plan) {
      if (move) {
        const before = takeOffs(move, move.elapsed);
        move.elapsed += step;
        sound(takeOffs(move, move.elapsed) - before);
        if (move.elapsed >= move.transit.landMs) {
          trail = move;
          move = undefined;
          pawnAt = current;
          landingElapsed = 0;
          landed();
        }
      } else {
        buildElapsed += step;
      }
      if (!move && buildElapsed >= (plan.building.at(-1)?.landsAt ?? 0)) {
        finish();
      }
      posed = true;
    }
    if (landingElapsed < LANDING_MS) {
      landingElapsed = Math.min(landingElapsed + step, LANDING_MS);
      posed = true;
    }
    if (trail) {
      trail.elapsed += step;
      if (trail.elapsed - BUDDY_LAG_MS >= trail.transit.landMs) {
        trail = undefined;
        buddyLanded();
      }
      posed = true;
    }
    if (liftTiles(step)) posed = true;
    if (arrive(step)) posed = true;
    if (posed) pose();
    const turning = turnElapsed < TURN_MS;
    if (turning) {
      turnElapsed = Math.min(turnElapsed + free, TURN_MS);
      const t = easeInOut(turnElapsed / TURN_MS);
      board.rotation.y = (turnFrom + (turnStep - turnFrom) * t) * TURN_RADIANS;
    }
    rig.tick(step, tourState === "playing", turning ? free : step);
    /* A turn ended during a pause: no frame follows to close the follow's
       last gap, so close it now. */
    if (turning && frozen && turnElapsed >= TURN_MS) rig.place();
    if (isSettled() !== settled || rig.shot() !== shot) emit();
    stepLife(step);
    /* A click's answer runs on while the tour is paused: it was asked
       for. */
    reactions.tick(free);
    if (themeElapsed < THEME_MS) {
      themeElapsed = Math.min(themeElapsed + free, THEME_MS);
      const t = easeInOut(themeElapsed / THEME_MS);
      themeMix.value = themeFrom + (themeTarget - themeFrom) * t;
      paint();
    }

    /* Draws that run long shed AO, then pixels. Timed around the draw
       itself, not the gap between frames, which carries vsync and every
       stall of the page's own. */
    const drawn = offscreen ? 0 : draw(step / 1000);
    /* Nor the first draw after an idle stretch, which may compile. */
    const measured = delta > 0 && !unmeasured && !offscreen;
    unmeasured = false;
    const shed = measured ? governor.sample(drawn) : null;
    if (shed) {
      post.setQuality(shed);
      unmeasured = true;
      /* Resizing the canvas cleared what was just drawn: draw again. */
      frame();
      requestFrame();
    }
    canvas.dataset.pathSceneRendered = "true";
    if (moving()) requestFrame();
    else lastTime = undefined;
  }

  /** The shot's focus as last handed to the sun's shadow (`lighting.ts`):
   *  moved only when the shot has, and sized in steps of about 9%, so a
   *  breathing close-up does not make the shadow's texels swim. */
  const shadowFocus = { target: new Vector3(Infinity, 0, 0), radius: 0 };
  const focusOnScreen = new Vector3();

  /** Fits the sun's shadow and the tilt-shift's sharp band to the shot. */
  function followShot() {
    if (rig.shot() === "idle") return;
    const focus = rig.focus();
    const radius = 2 ** (Math.ceil(Math.log2(focus.radius) * 8) / 8);
    if (
      radius !== shadowFocus.radius ||
      focus.target.distanceTo(shadowFocus.target) > 0.01
    ) {
      shadowFocus.target.copy(focus.target);
      shadowFocus.radius = radius;
      lighting.setFocus(shadowFocus);
    }
    post.setFocus(
      focusOnScreen.copy(focus.target).project(camera).y,
      focus.wide,
    );
  }

  /** Draws a frame through the post chain; `seconds` moves the grain on,
   *  and under reduced motion it holds still. Returns how long the draw
   *  took, in ms: the CPU's share, as WebGL returns before the GPU is
   *  done. */
  function draw(seconds: number) {
    const start = performance.now();
    followShot();
    post.render(reducedMotion ? 0 : seconds);
    return performance.now() - start;
  }

  function render() {
    if (!frameRequest && !paused && !offscreen && !contextLost && !fellBack) {
      draw(0);
      unmeasured = false;
      canvas.dataset.pathSceneRendered = "true";
    }
  }

  /* A hidden tab pauses rendering; the build resumes where it stopped. */
  function onVisibility() {
    paused = document.visibilityState === "hidden";
    if (paused) {
      cancelAnimationFrame(frameRequest);
      frameRequest = 0;
    }
    lastTime = undefined;
    requestFrame();
  }

  /* A lost context pauses too, and one that does not come back drops to the
     stills (storyboard §7.4). three.js restores its own state on restore. */
  function onContextLost(event: Event) {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    restoreTimer = setTimeout(
      () => fallBack("context-lost"),
      CONTEXT_RESTORE_MS,
    );
  }

  function onContextRestored() {
    clearTimeout(restoreTimer);
    contextLost = false;
    lastTime = undefined;
    requestFrame();
    draw(0);
  }

  function onThemeChange() {
    const dark = isDarkMode();
    const target = dark ? 1 : 0;
    if (target === themeTarget) return;
    palettes[dark ? "dark" : "light"] = readPalette();
    themeFrom = themeMix.value;
    themeTarget = target;
    if (reducedMotion) {
      themeMix.value = target;
      themeElapsed = THEME_MS;
      paint();
      render();
      return;
    }
    themeElapsed = 0;
    requestFrame();
  }

  const themeObserver = new MutationObserver(onThemeChange);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  const resizeObserver = new ResizeObserver(() => {
    frame();
    if (prepared) render();
  });
  resizeObserver.observe(canvas);
  /* Out of view, the board stops drawing, and picks up where it is when
     it comes back. */
  const viewObserver = new IntersectionObserver(([entry]) => {
    offscreen = !entry.isIntersecting;
    if (offscreen) {
      cancelAnimationFrame(frameRequest);
      frameRequest = 0;
    }
    lastTime = undefined;
    requestFrame();
  });
  viewObserver.observe(canvas);
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  /* Counts `show` calls, so a load that finishes after another step was
     selected does not build over it. */
  let showing = 0;
  let disposed = false;

  /** Leaves a build that another selection cuts short: a tile being built
   *  again keeps standing, as it stood before, and a pawn in the air lands
   *  on the tile it is over, so the next move starts from there. */
  function abandon() {
    if (buildState === "building" && rebuild && current) built.add(current);
    /* A tile cut short in its wake rises on from where it is, as the tiles
       the pawn passed do, rather than sinking back to dormant. */
    if (
      buildState === "building" &&
      !rebuild &&
      current &&
      plan &&
      !move &&
      buildElapsed > 0
    ) {
      wakeStarts.set(current, planStarts);
      catchingUp.set(current, buildElapsed);
    }
    rebuild = false;
    if (move) {
      const { along } = moveAt(move, move.elapsed);
      pawnAt = loopAt(stepIndex(move.from) + Math.round(along));
      move = undefined;
    }
    trail = undefined;
  }

  /* This step's tile shows its stills: the canvas is see-through over them,
     and the next step with a tile builds as usual. */
  function failScene(step: PathStep, reason: SceneFallbackReason) {
    abandon();
    canvas.style.opacity = "0";
    stills = { reason, slug: step.slug };
    current = step.slug;
    plan = undefined;
    move = undefined;
    lit = [];
    buildState = "idle";
    emit();
  }

  function build(step: PathStep, options?: ShowOptions) {
    const shownBefore = Boolean(pawnAt) && canvas.style.opacity !== "0";
    const again = step.slug === current;
    abandon();
    canvas.style.opacity = "";
    stills = undefined;
    const slug = step.slug;
    const first = !pawnAt;
    plan = buildPlan(step);
    planStarts = new Map(
      plan.building.map((planned) => [planned.id, planned.startsAt]),
    );
    const passed = new Set(LOOP.slice(0, stepIndex(slug)));
    rig.setDriftSpan(driftMs(options?.narrationMs ?? 0));

    if (reducedMotion) {
      /* Reduced motion is a designed state: the whole board built, the pawn
         on its tile, and the camera cut to the step's close-up, the old
         frame crossfading out over the new one (decision 12, §4(f)). */
      if (shownBefore && !again) {
        crossfade(canvas, () => draw(0), CAMERA_MS.crossfade);
      }
      for (const tile of tiles.keys()) built.add(tile);
      catchingUp.clear();
      wakeStarts.clear();
      current = slug;
      liftTiles(Infinity);
      rig.cut(slug);
      finish();
      render();
      return;
    }

    /* Tiles before this one on the loop stand: the pawn has passed them.
       Any not standing yet rise together, at once. */
    for (const other of passed) {
      if (!built.has(other) && tiles.has(other) && !catchingUp.has(other)) {
        catchingUp.set(other, 0);
      }
    }
    /* A tile reselected while its cut-short wake runs on is built again
       from there, as a standing tile is. */
    if (catchingUp.delete(slug)) {
      wakeStarts.delete(slug);
      built.add(slug);
    }
    rebuild = built.has(slug);
    built.delete(slug);
    /* Its pieces stand as built, before any beat; its landmarks announce
       their rise again. */
    life.restTile(slug);
    life.startMove();
    /* A lean on the duo belongs to the step it was on. */
    duoHeldMs = undefined;
    arrivals.delete(slug);
    risen.clear();
    current = slug;
    buildElapsed = 0;
    lit = [];
    /* A selection plays its move even when paused: the visitor asked for
       it. */
    frozen = false;
    trail = undefined;
    if (first) {
      /* The opening: a visit entering at the first step swoops the whole
         way down; one entering at a fragment takes the shorter variant. */
      pawnAt = slug;
      const transit = transitTimeline("opening", 0, slug !== LOOP[0]);
      move = { from: slug, steps: 0, elapsed: 0, transit };
      rig.open(slug, transit);
    } else {
      const steps = loopSteps(stepIndex(pawnAt!), stepIndex(slug), LOOP.length);
      const kind = options?.advance && steps !== 0 ? "travel" : "skip";
      const transit = transitTimeline(kind, steps);
      move =
        steps === 0 ? undefined : { from: pawnAt!, steps, elapsed: 0, transit };
      if (kind === "travel") {
        const moving = move!;
        rig.travel(slug, transit, (ms, out) => pawnFoot(moving, ms, out));
      } else if (
        rig.settledOn() !== slug ||
        rig.shot() !== "close-up" ||
        steps !== 0
      ) {
        rig.skip(slug, transit);
        if (steps !== 0) event("skip");
      }
    }
    buildState = "building";
    pose();
    /* Emitted even when already building: a cut from one step's build to
       another's clears the lit lines too. */
    emit();
    requestFrame();
  }

  /** Builds `step` on a board that is ready, or shows its stills if its
   *  tile is not. */
  function buildOrFail(step: PathStep, options?: ShowOptions) {
    makeTiles();
    const failed = failedTiles.get(step.slug);
    if (failed) return failScene(step, failed);
    try {
      build(step, options);
    } catch (error) {
      console.error(error);
      failScene(step, "scene-failed");
    }
  }

  board.add(
    makeBoard(paintBox, phone ? PHONE_GRASS_SHARE : 1),
    makePath(paintBox),
  );

  /* ─── Life: ambient motion, the narration's beats, the arrival ─── */

  const life = createLife({
    board,
    camera,
    paint: paintBox,
    emit: (name) => event(name),
  });

  function event(name: SceneEvent) {
    options.onEvent?.(name);
  }

  /* Play: a click's answer, on the free clock; the duo's gestures and the
     moments, on the living one (`play.ts`, `moments.ts`). */
  const reactions = createPlay({ paint: paintBox, board });
  const gestures = createPlay({ paint: paintBox, board });
  const moments = createMoments({ board, paint: paintBox, play: gestures });
  const confetti = createConfetti({ board, paint: paintBox });
  let lastReaction: string | undefined;
  let reactionCount = 0;
  let lastMoment: string | undefined;
  let momentCount = 0;

  /** The buddy has landed beside the figure: a high five. */
  function buddyLanded() {
    if (reducedMotion) return;
    gestures.gestures.highFive(figure, buddyHandle, Math.sign(BUDDY_SIDE.x));
    gestures.kick(buddyHandle, "squash", -1.6);
  }

  /** A piece's click handle on `slug`'s tile, if it stands. */
  function handleOf(slug: PathStepSlug, piece: string): Group | undefined {
    if (piece === "figure") return figure;
    if (piece === "buddy") return buddyHandle;
    let found: Group | undefined;
    tiles.get(slug)?.group.traverse((node) => {
      const reactor = node.userData.reactor as Reactor | undefined;
      if (!found && reactor?.piece === piece) found = reactor.handle;
    });
    return found;
  }

  function momentStage(): MomentStage {
    const [x, z] = current ? tileCentre(current) : [0, 0];
    return {
      figure,
      buddy: buddyHandle,
      piece: (slug, id) => handleOf(slug, id),
      centre: new Vector3(x, liftOf(current ?? LOOP[0]), z),
    };
  }

  /** What lies under a point on the canvas, in `objects`, nearest first. */
  function castAt(x: number, y: number, objects: Object3D[]) {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    pointer.set((x / width) * 2 - 1, 1 - (y / height) * 2);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(objects, true);
  }

  /** The piece under a point that answers a click: on the shown step's
   *  tile, standing, or the marker. */
  function reactorAt(x: number, y: number): Reactor | null {
    const tile = current && tiles.get(current);
    if (!tile || stills) return null;
    for (const { object } of castAt(x, y, [tile.group, pawn, buddy])) {
      let node: Object3D | null = object;
      let shown = true;
      while (node && !node.userData.reactor) {
        shown &&= node.visible;
        node = node.parent;
      }
      if (!node) continue;
      for (let up: Object3D | null = node; up; up = up.parent) {
        shown &&= up.visible;
      }
      if (shown) return node.userData.reactor as Reactor;
    }
    return null;
  }

  /** The beat last played, for the snapshot. */
  let lastBeat: string | undefined;
  /** How long the pawn has stood at rest, while the board lives: its idle
   *  squash keeps time by it. */
  let restMs = 0;
  /** Tiles whose landmark is arriving again, out of turn (`arriveTile`),
   *  by elapsed ms. */
  const arrivals = new Map<PathStepSlug, number>();
  /** The current build's landmarks that have started to rise, so each
   *  rise sounds once. */
  const risen = new Set<Riser>();

  /** Whether the board lives: the water, the grass, the trees and the
   *  clouds move and the pawn breathes. Only while the tour plays, and
   *  through the end's pull-back, then at rest (WCAG 2.2.2: a pause stops
   *  it); never under reduced motion. */
  function alive() {
    if (reducedMotion || frozen || !prepared || !pawnAt) return false;
    return (
      tourState === "playing" || (tourState === "ended" && rig.moving(false))
    );
  }

  /** How far `slug`'s ground has grown out from its landmark's foot, in
   *  the tile's units: none before it is built, all once it stands. */
  function groundOf(slug: PathStepSlug) {
    const grown = (ms: number) =>
      ms >= REVEAL_MS ? 1e3 : REVEAL_RADIUS * easeOutQuart(ms / REVEAL_MS);
    const arriving = arrivals.get(slug);
    if (arriving !== undefined) return grown(arriving);
    if (slug === current && buildState === "building") {
      if (rebuild) return 1e3;
      return move ? 0 : grown(buildElapsed);
    }
    const catching = catchingUp.get(slug);
    if (catching !== undefined)
      return grown(catching * (REVEAL_MS / PROP_DROP_MS));
    return built.has(slug) ? 1e3 : 0;
  }

  /** Moves the out-of-turn arrivals on; whether any moved. */
  function arrive(step: number) {
    if (arrivals.size === 0) return false;
    const end = Math.max(PROP_DROP_MS, REVEAL_MS);
    for (const [slug, elapsed] of arrivals) {
      if (elapsed + step >= end) arrivals.delete(slug);
      else arrivals.set(slug, elapsed + step);
    }
    return true;
  }

  /** How many times the pawn has left a tile `ms` into `m`: once per tile
   *  on a walk, once on a skip's one long hop. */
  function takeOffs(m: Move, ms: number) {
    if (m.transit.kind === "opening" || ms < m.transit.hopStartMs) return 0;
    if (m.transit.kind === "skip") return 1;
    const tiles = Math.abs(m.steps);
    return Math.min(Math.floor(hopProgress(m, ms) * tiles) + 1, tiles);
  }

  function sound(hops: number) {
    for (let i = 0; i < hops; i++) event("hop");
  }

  /** The pawn has landed: the tile thumps, and dust puffs off it. */
  function landed() {
    if (!current) return;
    restMs = 0;
    const at = pawnPathPoint(stepIndex(current), 0, new Vector3());
    at.y += liftOf(current);
    life.landed(at, tileScale(current));
    event("land");
  }

  const footWorld = new Vector3();

  /** Over `slug`'s tile, at about the figure's height, in the board's
   *  frame: where the end's confetti is thrown from. */
  function burstOver(slug: PathStepSlug) {
    const [x, z] = tileCentre(slug);
    return new Vector3(
      x,
      liftOf(slug) + (TILE.thickness + PAWN_HEIGHT) * tileScale(slug),
      z,
    );
  }

  /** How long the camera has leaned in on the duo for one of their
   *  gestures, on the board's clock (`LEAN`); undefined when it is not. */
  let duoHeldMs: number | undefined;
  const duoMid = new Vector3();

  /** Between the figure and the buddy, at the figure's middle, in the
   *  board's frame. */
  function duoCentre() {
    return duoMid
      .copy(pawn.position)
      .add(buddy.position)
      .multiplyScalar(0.5)
      .setY(pawn.position.y + PAWN_HEIGHT * 0.5);
  }

  /** The board's life, `step` ms on: its ambient motion, its beats, the
   *  hops beside the pawn's path and its landmarks' rise. */
  function stepLife(step: number) {
    const living = alive() ? step : 0;
    paintBox.flow(living / 1000);
    if (living > 0 && pawnAt && !move) {
      restMs += living;
      posePawn();
    }
    if (move) life.passing(pawn.getWorldPosition(footWorld));
    life.tick(step);
    /* Gestures and a flock under way play out on the board's clock, so
       they freeze on Pause and finish after the end; a new moment waits
       for the board to be living, and quiet. */
    gestures.tick(step);
    confetti.tick(step);
    const played = moments.tick(
      step,
      living > 0 &&
        !life.active() &&
        !reactions.active() &&
        !gestures.active() &&
        !moments.active() &&
        !move &&
        !trail &&
        buildState !== "building",
      current,
      momentStage,
    );
    if (played) {
      lastMoment = `${played}:${++momentCount}`;
      emit();
    }
    if (played && DUO_MOMENTS.has(played)) duoHeldMs = 0;
    if (duoHeldMs !== undefined) {
      duoHeldMs += step;
      if (duoHeldMs >= LEAN.holdMs && !gestures.active()) duoHeldMs = undefined;
    }
    rig.lean(duoHeldMs !== undefined ? duoCentre() : null);
    /* Only the step shown rises with a sound. */
    const shown = current && tiles.get(current);
    for (const risers of shown ? shown.props.values() : []) {
      for (const piece of risers) {
        if (piece.landmark !== undefined && piece.shown && !risen.has(piece)) {
          risen.add(piece);
          if (buildState === "building" && !rebuild) event("rise");
        }
      }
    }
  }

  /** Plays `slug`'s arrival again on the pieces it has now: its landmark
   *  rises out of the tile and its ground grows back out from its foot.
   *  For a landmark swapped in once its file arrives (v3-harden's
   *  `swapTile`); it grades a newly loaded model first. */
  function arriveTile(slug: PathStepSlug) {
    const tile = tiles.get(slug);
    if (!tile) return;
    gradeLandmark(tile.group);
    if (!reducedMotion && built.has(slug)) {
      arrivals.set(slug, 0);
      event("rise");
      requestFrame();
    }
    pose();
    render();
  }

  return {
    show(step, options) {
      const request = ++showing;
      /* Once the board is up, a step builds at once: a landmark of its own
         still on its way takes its stand-in's place when it lands. Only one
         that failed is waited on, fetched again. */
      if (prepared && !failedIn(step.slug)) {
        /* A first landing overtaken before its own landmarks came never
           asked for the duo: this one does. */
        startToys(step.slug);
        approach(step.slug);
        buildOrFail(step, options);
        /* A first landing overtaken before its own landmarks came: the
           rest still follow (once only). */
        loadRest(step.slug);
        return;
      }
      /* Loading: the canvas is see-through, so the step's still shows until
         the board, and the step's own landmarks, are in. */
      abandon();
      canvas.style.opacity = "0";
      stills = undefined;
      current = step.slug;
      plan = undefined;
      lit = [];
      shown = [];
      buildState = "loading";
      emit();
      (preparing ??= prepare())
        .then(() => loadModels(idsOf(step.slug)))
        .then(
          () => {
            if (disposed || request !== showing) return;
            /* A landmark of its own that did not arrive takes its tile off
               the board, stand-in and all, so the step shows its stills,
               as a tile made without it would. */
            const tile = tiles.get(step.slug);
            if (tile && failedIn(step.slug)) {
              board.remove(tile.group);
              tiles.delete(step.slug);
              built.delete(step.slug);
              catchingUp.delete(step.slug);
              retire(tile.group);
            }
            failedTiles.delete(step.slug);
            frame();
            buildOrFail(step, options);
            startToys(step.slug);
            /* The next step's are the first of the rest: after the first
               paint, not competing with it. */
            loadRest(step.slug);
          },
          () => {
            if (!disposed && request === showing)
              failScene(step, "assets-failed");
          },
        );
    },
    skip() {
      if (buildState !== "building") return false;
      rig.finish();
      life.finish();
      finish();
      return true;
    },
    setTourState(state) {
      if (state === tourState) return;
      tourState = state;
      frozen = state === "paused";
      if (frozen) return;
      lastTime = undefined;
      /* The tour has played its last step: back to the whole board, on its
         closing chord. */
      if (state === "ended" && current === LOOP.at(-1)) {
        event("end");
        if (!reducedMotion) {
          rig.end();
          confetti.burst(burstOver(LOOP.at(-1)!));
        }
      }
      requestFrame();
    },
    cue({ slug, prop, index }) {
      if (slug !== current || stills) return;
      const turn = cueTurn(PATH_NARRATION[slug], index);
      const played = life.cue(slug, prop, turn, reducedMotion);
      if (!played) return;
      lastBeat = `${slug}:${prop}:${turn.nth}`;
      emit();
      if (reducedMotion) render();
      else requestFrame();
    },
    arriveTile,
    react(x, y) {
      const on = reactorAt(x, y);
      if (!on) return null;
      const answer = reactions.react(on, reducedMotion);
      lastReaction = `${on.piece}:${answer}:${++reactionCount}`;
      event(answer === "chime" ? "beat-low" : "beat-high");
      emit();
      requestFrame();
      return answer;
    },
    hover(x, y) {
      const on = x === null || y === undefined ? null : reactorAt(x, y);
      if (reactions.hover(on)) requestFrame();
      return on !== null;
    },
    moment(name) {
      if (!current || reducedMotion) return;
      moments.play(name, current, momentStage);
      if (DUO_MOMENTS.has(name)) duoHeldMs = 0;
      lastMoment = `${name}:${++momentCount}`;
      emit();
      requestFrame();
    },
    locate(piece) {
      const handle = current && handleOf(current, piece);
      if (!handle) return null;
      const centre = new Box3().setFromObject(handle).getCenter(new Vector3());
      centre.project(camera);
      if (Math.abs(centre.x) > 1 || Math.abs(centre.y) > 1) return null;
      return {
        x: ((centre.x + 1) / 2) * canvas.clientWidth,
        y: ((1 - centre.y) / 2) * canvas.clientHeight,
      };
    },
    lid() {
      const veil = current && tiles.get(current)?.veil;
      if (!veil) return null;
      return veil.visible ? (veil.position.y - TILE.thickness) / VEIL_LIFT : 1;
    },
    pieces() {
      const named = new Set<string>(Object.values(BEAT_NODE));
      const nodesOf = (root: Object3D) => {
        const found = new Set<string>();
        root.traverse((node) => {
          if (named.has(node.name)) found.add(node.name);
        });
        return [...found].sort();
      };
      const fileOf = (id: string) => {
        const result = toys.get(id);
        return result?.status === "loaded" ? result.file : null;
      };
      const report: PieceReport[] = [];
      for (const tile of tiles.values()) {
        for (const [piece, beater] of tile.beaters) {
          report.push({
            step: tile.slug,
            piece,
            file: tile.files.get(piece) ?? null,
            nodes: nodesOf(beater),
          });
        }
      }
      for (const [piece, handle] of [
        ["figure", figure],
        ["buddy", buddyHandle],
      ] as const) {
        const id = MARKER[piece];
        report.push({
          step: "marker",
          piece: id,
          file: fileOf(id),
          nodes: nodesOf(handle),
        });
      }
      for (const [piece, side] of Object.entries(SIDE_MODELS)) {
        report.push({
          step: "side",
          piece,
          file: fileOf(side.model),
          nodes: [],
        });
      }
      return report;
    },
    replay() {
      const step = current && stepNamed(current);
      if (step && plan && !stills) buildOrFail(step);
    },
    turn(direction) {
      if (!plan) return;
      const next = Math.max(
        -TURN_LIMIT,
        Math.min(TURN_LIMIT, turnStep + direction),
      );
      if (next === turnStep) return;
      turnFrom = board.rotation.y / TURN_RADIANS;
      turnStep = next;
      emit();
      if (reducedMotion) {
        board.rotation.y = turnStep * TURN_RADIANS;
        turnElapsed = TURN_MS;
        rig.place();
        render();
        return;
      }
      turnElapsed = 0;
      requestFrame();
    },
    pick(x, y) {
      const groups = [...tiles.values()].map((tile) => tile.group);
      for (const { object } of castAt(x, y, groups)) {
        /* A piece not standing yet is not there to point at. */
        let node: Object3D | null = object;
        let shown = true;
        while (node && node.userData.slug === undefined) {
          shown &&= node.visible;
          node = node.parent;
        }
        if (node && shown && node.visible) {
          return node.userData.slug as PathStepSlug;
        }
      }
      return null;
    },
    setFrame(frame) {
      stageFrame = frame;
      rig.setFrame(clipFrame());
      rig.place();
      if (prepared) render();
    },
    setReducedMotion(reduced) {
      reducedMotion = reduced;
      rig.setReducedMotion(reduced);
      if (reduced) {
        reactions.settle();
        gestures.settle();
        for (const handle of [...pendingMarkers.keys()]) {
          placePendingMarker(handle);
        }
        moments.finish();
        confetti.finish();
      }
      /* Turned off on a resting board, its life starts again. */
      if (!reduced || !plan) {
        requestFrame();
        return;
      }
      life.finish();
      arrivals.clear();
      /* Reduced motion's designed state is the whole board built. */
      for (const tile of tiles.keys()) built.add(tile);
      catchingUp.clear();
      wakeStarts.clear();
      finish();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameRequest);
      clearTimeout(restoreTimer);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      const geometries = new Set<{ dispose(): void }>();
      const materials = new Set<Material>();
      const owned: Object3D[] = [
        scene,
        ...[...models.values()].flatMap((result) =>
          result.status === "loaded" ? [result.scene] : [],
        ),
      ];
      for (const root of owned) {
        root.traverse((node) => {
          /* An instanced mesh's matrices are freed only by its own dispose. */
          if (node instanceof InstancedMesh) node.dispose();
          if (!(node instanceof Mesh)) return;
          geometries.add(node.geometry);
          for (const material of [node.material].flat())
            materials.add(material);
        });
      }
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if ((value as Texture | null)?.isTexture)
            (value as Texture).dispose();
        }
        material.dispose();
      }
      paintBox.dispose();
      lighting.dispose();
      post.dispose();
      renderer.dispose();
    },
  };
}
