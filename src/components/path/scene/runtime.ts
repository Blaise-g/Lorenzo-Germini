import {
  Box3,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShadowMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
  type Texture,
} from "three";

import { PATH_STEPS } from "@/data/path";
import type { PathStep, PathStepSlug } from "@/data/path.types";

import {
  fitModel,
  loadGrain,
  loadLandmarkIndex,
  loadModel,
  type ModelResult,
} from "./assets";
import {
  BOARD,
  HOP_HEIGHT,
  LOOP,
  piecesOf,
  TILE,
  tileCentre,
  tileScale,
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
import {
  easeInOut,
  landingSquash,
  LANDING_MS,
  loopSteps,
  movePose,
  risePose,
} from "./motion";
import { createLighting } from "./lighting";
import { createPaint } from "./paint";
import { isDarkMode, readPalette, type Palette } from "./palette";
import { createGovernor, createPost, isPhone, startRung } from "./post";
import { buildPiece } from "./props";
import { pawnPathPoint } from "./path-spline";
import { assetsForStep, SCENE_ASSETS } from "./scene-assets";
import {
  makeBoard,
  makePath,
  makePawn,
  makeTileBase,
  type PawnParts,
} from "./world";

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
  turn(direction: -1 | 1): void;
  setReducedMotion(reduced: boolean): void;
  /** The part of the stage the page leaves the board, in CSS pixels; the
   *  whole stage until the host says otherwise. */
  setFrame(frame: StageFrame): void;
  /** The step whose tile, or a piece standing on it, is under a point on
   *  the canvas, in CSS pixels from its top-left corner; null for none. */
  pick(x: number, y: number): PathStepSlug | null;
  dispose(): void;
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
};

type Tile = {
  slug: PathStepSlug;
  group: Group;
  /** Its pieces by the prop they rise with, in the data's order. */
  props: Map<string, Riser[]>;
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

  /** Each landmark's outcome, by its file. */
  const models = new Map<string, ModelResult>();
  const tiles = new Map<PathStepSlug, Tile>();
  /** How tall each piece stands as built, by `<slug>:<piece>`. */
  const heights = new Map<string, number>();
  /** Tiles that could not be made, and why; tried again on the next show. */
  const failedTiles = new Map<PathStepSlug, SceneFallbackReason>();

  function stepIndex(slug: PathStepSlug) {
    return LOOP.indexOf(slug);
  }

  /** The files of `slug`'s landmarks that failed, to fetch again. */
  function failedFilesOf(slug: PathStepSlug) {
    return assetsForStep(slug)
      .map((asset) => asset.file)
      .filter((file) => models.get(file)?.status === "failed");
  }

  function makeTile(slug: PathStepSlug): Tile {
    const group = makeTileBase(paintBox, slug);
    const step = stepNamed(slug);
    const props = new Map<string, Riser[]>(
      step.props.map((prop) => [prop.id, []]),
    );
    const firstProp = step.props[0].id;
    const landmarks = assetsForStep(slug);
    piecesOf(slug).forEach((piece, index) => {
      const asset = landmarks.find((each) => each.piece === piece.id);
      const model = asset && models.get(asset.file);
      const built =
        asset && model?.status === "loaded"
          ? { object: fitModel(model.scene, asset, piece) }
          : buildPiece(paintBox, slug, piece, index + stepIndex(slug) * 7);
      /* Measured before it is parented, so in its own frame: how tall it
         stands once up, for the camera's close-up (`pieceHeight`). */
      heights.set(
        `${slug}:${piece.id}`,
        new Box3().setFromObject(built.object).max.y,
      );
      /* The riser scales about the piece's foot; the sinker inside it
         lowers the piece as it starts, leaving the piece's own pose alone. */
      const riser = new Group();
      const sinker = new Group();
      sinker.add(built.object);
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
      });
    });
    const [x, z] = tileCentre(slug);
    group.position.set(x, 0, z);
    group.scale.setScalar(tileScale(slug));
    group.userData.slug = slug;
    return { slug, group, props };
  }

  /* ─── The pawn ─── */

  const pawn = makePawn(paintBox);
  const pawnParts = pawn.userData.pawn as PawnParts;
  pawn.visible = false;
  board.add(pawn);

  /** A move of the pawn, timed by the camera's transit: it leaves at
   *  `hopStartMs` and lands at `landMs`. An opening drops it onto its tile
   *  instead. */
  type Move = {
    from: PathStepSlug;
    steps: number;
    elapsed: number;
    transit: Transit;
  };

  const wrap = (index: number) =>
    LOOP[((index % LOOP.length) + LOOP.length) % LOOP.length];

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
    const blend = u * u * (3 - 2 * u);
    const [a, b] = [liftOf(wrap(from + base)), liftOf(wrap(from + base + 1))];
    out.y += a + (b - a) * blend;
    return out;
  }

  /** How far each tile has risen, 0 on the board to 1 lifted: the selected
   *  one rises, the rest settle. */
  const lifts = new Map<PathStepSlug, number>();
  const liftTarget = (slug: PathStepSlug) => (slug === current ? 1 : 0);
  /** How high `slug`'s tile stands off the board now, in scene units. */
  const liftOf = (slug: PathStepSlug) =>
    easeInOut(lifts.get(slug) ?? 0) * LIFT_HEIGHT * tileScale(slug);

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

  /** Loads in flight, by file: a second ask while one runs waits on it,
   *  so a quick reselection never fetches, or orphans, a model twice. */
  const loading = new Map<string, Promise<void>>();

  /** Fetches the landmarks of `files` not yet loaded or known absent. */
  async function loadModels(files: readonly string[]) {
    await Promise.all(
      SCENE_ASSETS.filter((asset) => files.includes(asset.file)).map(
        (asset) => {
          const known = models.get(asset.file);
          if (known && known.status !== "failed") return undefined;
          let load = loading.get(asset.file);
          if (!load) {
            load = loadModel(asset).then((result) => {
              loading.delete(asset.file);
              if (!disposed) models.set(asset.file, result);
            });
            loading.set(asset.file, load);
          }
          return load;
        },
      ),
    );
  }

  /* Everything the board needs before it can show: the card grain and every
     landmark the index lists. A landmark it does not list stands in, asked
     for by no one. A grain that does not load is a board without it, not a
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
      loadLandmarkIndex().then((listed) => {
        for (const asset of SCENE_ASSETS) {
          if (!listed.has(asset.id))
            models.set(asset.file, { status: "absent" });
        }
        return loadModels(
          SCENE_ASSETS.filter((asset) => listed.has(asset.id)).map(
            (asset) => asset.file,
          ),
        );
      }),
    ]);
    prepared = true;
  }

  /** Makes every tile not yet made; a tile whose landmark failed, or whose
   *  own code throws, is left off the board and tried again next time. */
  function makeTiles() {
    for (const slug of LOOP) {
      if (tiles.has(slug)) continue;
      const failed = assetsForStep(slug)
        .map((asset) => models.get(asset.file))
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
  let current: PathStepSlug | undefined;
  let plan: BuildPlan | undefined;
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
      stills,
    });
  }

  function poseTile(tile: Tile, at: (planned: string) => number | "up") {
    for (const [prop, risers] of tile.props) {
      const elapsed = at(prop);
      for (const piece of risers) {
        const delay = Math.min(piece.delay, MAX_PIECE_DELAY_MS);
        const local =
          elapsed === "up" ? 1 : (elapsed - delay) / (PROP_DROP_MS - delay);
        /* A tile built again never vanishes: it sinks part-way and springs
           up from there. */
        const again = rebuild && tile.slug === current;
        const progress = again
          ? REBUILD_FROM + (1 - REBUILD_FROM) * Math.max(local, 0)
          : local;
        const pose = risePose(progress, PROP_DROP_MS - delay);
        piece.riser.visible = pose.visible;
        piece.riser.scale.set(pose.width, pose.height, pose.width);
        /* The sinker sits inside the riser's scale: undo its height, so the
           sink is in the tile's units. */
        piece.sinker.position.y = pose.visible ? -pose.sink / pose.height : 0;
        piece.motion?.(Math.min(Math.max(local, 0), 1));
      }
    }
  }

  /** Puts every piece and the pawn where the clocks say they are. */
  function pose() {
    if (reducedMotion) liftTiles(Infinity);
    for (const tile of tiles.values()) {
      const slug = tile.slug;
      tile.group.position.y = liftOf(slug);
      if (slug === current && plan && buildState === "building") {
        const starts = new Map(
          plan.building.map((planned) => [planned.id, planned.startsAt]),
        );
        const rising = move ? -1 : buildElapsed;
        poseTile(tile, (prop) =>
          rebuild && move ? "up" : rising - (starts.get(prop) ?? 0),
        );
      } else if (catchingUp.has(slug)) {
        const elapsed = catchingUp.get(slug)!;
        poseTile(tile, () => elapsed);
      } else if (built.has(slug)) {
        poseTile(tile, () => "up");
      } else {
        poseTile(tile, () => -1);
      }
    }
    posePawn();

    const nextLit = plan && !move ? litLines(plan, buildElapsed) : [];
    const nextShown = PATH_STEPS.flatMap((step) => {
      const tile = tiles.get(step.slug);
      if (!tile) return [];
      return step.props
        .filter((prop) =>
          tile.props.get(prop.id)?.some((piece) => piece.riser.visible),
        )
        .map((prop) => prop.id);
    });
    if (nextLit.join() !== lit.join() || nextShown.join() !== shown.join()) {
      lit = nextLit;
      shown = nextShown;
      emit();
    }
  }

  const foot = new Vector3();

  function posePawn() {
    if (!pawnAt) {
      pawn.visible = false;
      return;
    }
    const { body, contact, ring } = pawnParts;
    let lift = 0;
    if (move) {
      const now = moveAt(move, move.elapsed);
      lift = now.lift;
      pawnFoot(move, move.elapsed, foot);
      /* Leaning into the hop, as a flicked piece would. */
      const ahead = pawnFoot(move, move.elapsed + 30, new Vector3()).sub(foot);
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
      const squash = landingSquash(landingElapsed);
      body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    }
    pawn.position.copy(foot);
    body.position.y = lift * HOP_HEIGHT;
    /* The ring and the shadow stay on the tile, fading as the pawn rises. */
    const away = Math.min(lift / 2, 1);
    for (const flat of [contact, ring]) {
      flat.material.opacity = flat.userData.opacity * (1 - 0.7 * away);
      flat.scale.setScalar(1 - 0.25 * away);
    }
  }

  function finish() {
    move = undefined;
    if (current) pawnAt = current;
    landingElapsed = LANDING_MS;
    for (const slug of catchingUp.keys()) built.add(slug);
    catchingUp.clear();
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
  let paused = document.visibilityState === "hidden";
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
     tour plays. The frame sample fills only from those, so a settled board
     draws nothing while it waits for a verdict. A paused tour freezes the
     tour's own motion; a theme change or a turn, the visitor's, plays on. */
  function moving() {
    if (themeElapsed < THEME_MS || turnElapsed < TURN_MS) return true;
    if (frozen) return false;
    return (
      buildState === "building" ||
      catchingUp.size > 0 ||
      landingElapsed < LANDING_MS ||
      lifting() ||
      rig.moving(tourState === "playing")
    );
  }

  function requestFrame() {
    if (frameRequest || paused || contextLost || fellBack) return;
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
    /* Frames that run long shed AO, then pixels. */
    const shed = governor.sample(delta);
    if (shed) {
      post.setQuality(shed);
      frame();
    }

    /* The visitor's own changes run on while the tour is paused. */
    const free = Math.min(delta, MAX_STEP_MS);
    const step = frozen ? 0 : free;
    let posed = false;
    for (const [slug, elapsed] of catchingUp) {
      if (elapsed + step >= PROP_DROP_MS) {
        catchingUp.delete(slug);
        built.add(slug);
      } else catchingUp.set(slug, elapsed + step);
      posed = true;
    }
    if (buildState === "building" && plan) {
      if (move) {
        move.elapsed += step;
        if (move.elapsed >= move.transit.landMs) {
          move = undefined;
          pawnAt = current;
          landingElapsed = 0;
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
    if (liftTiles(step)) posed = true;
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
    /* The water and the grass move on with every frame drawn. */
    paintBox.flow(step / 1000);
    if (themeElapsed < THEME_MS) {
      themeElapsed = Math.min(themeElapsed + free, THEME_MS);
      const t = easeInOut(themeElapsed / THEME_MS);
      themeMix.value = themeFrom + (themeTarget - themeFrom) * t;
      paint();
    }

    draw(step / 1000);
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
   *  and under reduced motion it holds still. */
  function draw(seconds: number) {
    followShot();
    post.render(reducedMotion ? 0 : seconds);
  }

  function render() {
    if (!frameRequest && !contextLost && !fellBack) {
      draw(0);
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
    rebuild = false;
    if (move) {
      const { along } = moveAt(move, move.elapsed);
      pawnAt = wrap(stepIndex(move.from) + Math.round(along));
      move = undefined;
    }
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
    rebuild = built.has(slug);
    built.delete(slug);
    current = slug;
    buildElapsed = 0;
    lit = [];
    /* A selection plays its move even when paused: the visitor asked for
       it. */
    frozen = false;
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

  board.add(makeBoard(paintBox), makePath(paintBox));

  return {
    show(step, options) {
      const request = ++showing;
      const retry = failedFilesOf(step.slug);
      if (prepared && retry.length === 0) return buildOrFail(step, options);
      /* Loading: the canvas is see-through, so the step's still shows until
         the board is in. */
      abandon();
      canvas.style.opacity = "0";
      stills = undefined;
      current = step.slug;
      plan = undefined;
      lit = [];
      shown = [];
      buildState = "loading";
      emit();
      const ready = prepared ? loadModels(retry) : (preparing ??= prepare());
      ready.then(
        () => {
          if (disposed || request !== showing) return;
          failedTiles.delete(step.slug);
          frame();
          buildOrFail(step, options);
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
      finish();
      return true;
    },
    setTourState(state) {
      if (state === tourState) return;
      tourState = state;
      frozen = state === "paused";
      if (frozen) return;
      lastTime = undefined;
      /* The tour has played its last step: back to the whole board. */
      if (state === "ended" && !reducedMotion && current === LOOP.at(-1)) {
        rig.end();
      }
      requestFrame();
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
      const width = canvas.clientWidth || 1;
      const height = canvas.clientHeight || 1;
      pointer.set((x / width) * 2 - 1, 1 - (y / height) * 2);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(
        [...tiles.values()].map((tile) => tile.group),
        true,
      );
      for (const { object } of hits) {
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
      if (!reduced || !plan) return;
      /* Reduced motion's designed state is the whole board built. */
      for (const tile of tiles.keys()) built.add(tile);
      catchingUp.clear();
      finish();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameRequest);
      clearTimeout(restoreTimer);
      themeObserver.disconnect();
      resizeObserver.disconnect();
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
