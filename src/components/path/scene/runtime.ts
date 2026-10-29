import {
  AgXToneMapping,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
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
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

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
  boardOutline,
  frameShapes,
  HOP_HEIGHT,
  LOOP,
  pawnSpot,
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
import { drawingPixelRatio } from "./drawing-buffer";
import {
  centreOf,
  filled,
  framed,
  toClip,
  wholeStage,
  type ClipPoint,
  type ClipRect,
  type StageFrame,
  type StageRect,
} from "./frame";
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
  moveDuration,
  movePose,
  risePose,
} from "./motion";
import { createPaint } from "./paint";
import { isDarkMode, readPalette, type Palette } from "./palette";
import { buildPiece } from "./props";
import { assetsForStep, SCENE_ASSETS } from "./scene-assets";
import { makeBoard, makePath, makePawn, makeTileBase } from "./world";

/* The 3D path's board (GH-148; v3, a solid tabletop board): vanilla
   three.js, imported dynamically by the host on `/path` only, after the
   overlay has painted (GH-141, implementation decision 6). One thick board
   holds every step as a tile on a loop, every piece on it modelled solid
   (`world.ts`, `props.ts`) or loaded (`scene-assets.ts`), and nothing on it
   is text. Selecting a step hops the pawn there along the loop and raises
   that tile's pieces in the data's order, lighting the caption lines as they
   settle; then the board stops drawing until something moves again. Tiles
   already built stay built. */

const TURN_RADIANS = 0.3;
const TURN_MS = 450;
const THEME_MS = 350;
/** The camera's slight lean toward the selected tile, as a share of the
 *  tile's distance from the board's centre, and how long it takes. */
const FOCUS_SHARE = 0.1;
const FOCUS_MS = 900;
/** How long a lost context may take to come back before the stills. */
const CONTEXT_RESTORE_MS = 3000;
/** Frames longer than this count as a pause (a hidden tab, a debugger), and
 *  the build's clock does not jump across them. */
const MAX_STEP_MS = 100;
const CAMERA_FOV = 26;
/** A high three-quarter view: the camera's angle above the table. */
const CAMERA_ELEVATION = 0.95;
/** How much of the stage's free part the board may fill, either way. */
const FRAME_FILL = { x: 0.93, y: 0.96 } as const;
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
/** The sun's shadow map, square: crisp contact shadows across the board. */
const SHADOW_MAP = 2048;

export type SceneSnapshot = {
  buildState: BuildState;
  lit: readonly number[];
  /** The props standing or rising on the board, in the data's order. */
  shown: readonly string[];
  turn: number;
  /** The step the board last settled, or is settling, on. */
  step?: PathStepSlug;
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

export type SceneRuntime = {
  /** Moves the pawn to `step`'s tile and builds it. */
  show(step: PathStep): void;
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
     and shows the stills. No multisampling: the buffer is drawn at twice
     the CSS size at least, which smooths edges at a third of the memory
     (`drawing-buffer.ts`, ADR-0009). */
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    failIfMajorPerformanceCaveat: true,
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  /* AgX keeps the inks' hue through the highlights, where the default
     clamps them to white (the benchmark's §4(c)). */
  renderer.toneMapping = AgXToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.5, 200);
  const board = new Group();
  scene.add(board);

  /* A soft room for fill and the lacquer's highlights, a sky over a
     terracotta ground, and one sun with soft shadows. Package W4 grades and
     lights the board properly; this is the baseline to judge the models
     by. */
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  room.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.35;
  const sky = new HemisphereLight(0xffffff, 0xffffff, 0.75);
  const sun = new DirectionalLight(0xffffff, 2.9);
  sun.position.set(-10, 16, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
  Object.assign(sun.shadow.camera, {
    left: -17,
    right: 17,
    top: 14,
    bottom: -14,
    near: 1,
    far: 50,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 2;
  scene.add(sky, sun);

  /* The table the board lies on is the page: only the board's shadow shows
     on it. */
  const tableMaterial = new ShadowMaterial({ opacity: 0.22 });
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
    background.copy(mixed.fog);
    scene.background = background;
    sky.color.copy(mixed.paper);
    sky.groundColor.copy(mixed["ink-warm"]).lerp(mixed.paper, 0.4);
    /* A shadow on a dark page reads with a little more weight. */
    tableMaterial.opacity = 0.18 + 0.2 * themeMix.value;
  }
  paint();

  /* ─── The tiles ─── */

  /** Each landmark's outcome, by its file. */
  const models = new Map<string, ModelResult>();
  const tiles = new Map<PathStepSlug, Tile>();
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
  pawn.visible = false;
  board.add(pawn);

  function pawnBase(slug: PathStepSlug) {
    return TILE.thickness * tileScale(slug) + liftOf(slug);
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

  /** Fetches the landmarks of `files` not yet loaded or known absent. */
  async function loadModels(files: readonly string[]) {
    await Promise.all(
      SCENE_ASSETS.filter((asset) => files.includes(asset.file)).map(
        async (asset) => {
          const known = models.get(asset.file);
          if (known && known.status !== "failed") return;
          const result = await loadModel(asset);
          if (disposed) return;
          models.set(asset.file, result);
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
  let move:
    | { from: PathStepSlug; steps: number; elapsed: number; duration: number }
    | undefined;
  let buildElapsed = 0;
  let landingElapsed = LANDING_MS;
  let buildState: BuildState = "idle";
  let lit: readonly number[] = [];
  let shown: readonly string[] = [];
  let turnStep = 0;
  let turnFrom = 0;
  let turnElapsed = TURN_MS;
  let focusFrom = new Vector3();
  let focusTo = new Vector3();
  let focusElapsed = FOCUS_MS;
  let stills: SceneSnapshot["stills"];

  function emit() {
    onChange({ buildState, lit, shown, turn: turnStep, step: current, stills });
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
        const pose = risePose(progress, PROP_DROP_MS);
        piece.riser.visible = pose.visible;
        piece.riser.scale.set(pose.width, pose.height, pose.width);
        piece.sinker.position.y = -pose.sink;
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

  function posePawn() {
    if (!pawnAt) {
      pawn.visible = false;
      return;
    }
    pawn.visible = true;
    let x: number;
    let z: number;
    let y: number;
    if (move) {
      const { along, lift } = movePose(
        move.steps,
        move.elapsed / move.duration,
      );
      const from = stepIndex(move.from);
      const base = Math.floor(Math.abs(along)) * Math.sign(along);
      const at = (offset: number) =>
        LOOP[(((from + offset) % LOOP.length) + LOOP.length) % LOOP.length];
      const a = at(base);
      const b = at(base + Math.sign(move.steps));
      const t = Math.abs(along - base);
      const [ax, az] = pawnSpot(a);
      const [bx, bz] = pawnSpot(b);
      x = ax + (bx - ax) * t;
      z = az + (bz - az) * t;
      y = pawnBase(a) + (pawnBase(b) - pawnBase(a)) * t + lift * HOP_HEIGHT;
      /* Leaning into the hop, as a flicked piece would. */
      pawn.rotation.z = -Math.sign(bx - ax) * lift * 0.18;
      pawn.scale.set(1, 1, 1);
    } else {
      [x, z] = pawnSpot(pawnAt);
      y = pawnBase(pawnAt);
      pawn.rotation.z = 0;
      const squash = landingSquash(landingElapsed);
      pawn.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    }
    pawn.position.set(x, y, z);
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

  /* Every tile's outlines, then the board's own rim, which has no tile:
     the board is framed whole, but may lie under the tabs. */
  const shapes = [
    ...frameShapes(),
    { slug: null, outlines: [boardOutline()] },
  ].map(({ slug, outlines }) => ({
    slug,
    outlines: outlines.map((outline) =>
      outline.map(([x, y, z]) => new Vector3(x, y, z)),
    ),
  }));
  let stageFrame: StageFrame | undefined;

  const BOARD_TARGET = new Vector3(0, 1, 0);
  const focus = new Vector3();
  const lookAt = new Vector3();
  const probe = new Vector3();

  function placeCamera(distance: number) {
    camera.position.set(
      lookAt.x,
      lookAt.y + distance * Math.sin(CAMERA_ELEVATION),
      lookAt.z + distance * Math.cos(CAMERA_ELEVATION),
    );
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();
  }

  type ClipFrame = { safe: ClipRect; clear: ClipRect[] };

  /** The stage's free part and the cards laid over it, in clip space. */
  function clipFrame(): ClipFrame {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    const frame = stageFrame ?? wholeStage(width, height);
    const clip = (rect: StageRect) => toClip(rect, width, height);
    return {
      safe: filled(clip(frame.safe), FRAME_FILL),
      clear: frame.clear.map(clip),
    };
  }

  /** Every tile's outlines, turned as the board is and seen from `distance`
   *  back, in clip space; null if any point is behind the camera. The
   *  selected tile's are lifted as it will stand once risen. */
  function projected(distance: number) {
    placeCamera(distance);
    const out: { slug: PathStepSlug | null; outlines: ClipPoint[][] }[] = [];
    for (const { slug, outlines } of shapes) {
      const rise = slug ? liftTarget(slug) * LIFT_HEIGHT * tileScale(slug) : 0;
      const clipped: ClipPoint[][] = [];
      for (const outline of outlines) {
        const points: ClipPoint[] = [];
        for (const point of outline) {
          probe.copy(point);
          probe.y += rise;
          probe
            .applyMatrix4(board.matrixWorld)
            .applyMatrix4(camera.matrixWorldInverse);
          if (probe.z > -camera.near) return null;
          probe.applyMatrix4(camera.projectionMatrix);
          points.push([probe.x, probe.y]);
        }
        clipped.push(points);
      }
      out.push({ slug, outlines: clipped });
    }
    return out;
  }

  /** Whether, from `distance` back, the board stands inside the stage and
   *  its tiles clear of the tabs laid over it: every tile and the pieces
   *  standing on it, and the pawn's hop onto the selected tile, the one hop
   *  the camera rests on. With `selected` false the hop does not count: the bound the
   *  camera keeps while it eases between two rests. */
  function fits(distance: number, frame: ClipFrame, selected = true) {
    const tiles = projected(distance);
    if (tiles === null) return false;
    return tiles.every(({ slug, outlines }) =>
      slug === null
        ? framed(outlines, frame.safe, [])
        : framed(
            selected && slug === current ? outlines : outlines.slice(0, -1),
            frame.safe,
            frame.clear,
          ),
    );
  }

  /** Where the board, seen from `distance` back, sits on the stage: the
   *  centre of its projected bounds, in clip space. */
  function boundsCentre(distance: number): ClipPoint {
    const points = (projected(distance) ?? []).flatMap(({ outlines }) =>
      outlines.flat(),
    );
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    return [
      (Math.min(...xs) + Math.max(...xs)) / 2,
      (Math.min(...ys) + Math.max(...ys)) / 2,
    ];
  }

  /** The closest the camera can come and keep the board framed: found by
   *  bisection, since how much fits only grows with distance. */
  function fitDistance(frame: ClipFrame, selected = true, limit = 300) {
    let near = 5;
    let far = limit;
    /* A place that cannot beat `limit` is not worth bisecting. */
    if (limit < 300 && !fits(far, frame, selected)) return far;
    for (let i = 0; i < 24; i++) {
      const middle = (near + far) / 2;
      if (fits(middle, frame, selected)) far = middle;
      else near = middle;
    }
    return far;
  }

  const centring = new Vector3();
  const right = new Vector3();
  const up = new Vector3();

  /** Points the camera so the board's bounds are centred on `target`, in
   *  clip space, from as close as keeps it framed; returns that distance. */
  function aimAt(frame: ClipFrame, target: ClipPoint, limit = 300) {
    centring.set(0, 0, 0);
    let distance = 0;
    for (let pass = 0; pass < 3; pass++) {
      lookAt.copy(BOARD_TARGET).add(centring).add(focus);
      distance = fitDistance(frame, true, limit);
      const [x, y] = boundsCentre(distance);
      const halfHeight = distance * Math.tan((CAMERA_FOV * Math.PI) / 360);
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      centring
        .addScaledVector(right, (x - target[0]) * halfHeight * camera.aspect)
        .addScaledVector(up, (y - target[1]) * halfHeight);
    }
    lookAt.copy(BOARD_TARGET).add(centring).add(focus);
    return fitDistance(frame, true, limit);
  }

  /* Where on the stage the board is centred once the camera rests. With
     nothing laid over it, the middle. With cards laid over it the board
     may stand larger off the middle, tucked past them: a grid of places
     round the middle is tried, at the lean and the turn the camera is
     heading for, and the one that lets it come closest kept. */
  const TARGET_SHIFTS = [-0.3, -0.15, 0, 0.15, 0.3]
    .flatMap((sx) => [-0.3, -0.15, 0, 0.15, 0.3].map((sy) => [sx, sy]))
    .sort(([ax, ay], [bx, by]) => ax * ax + ay * ay - (bx * bx + by * by));
  let restTarget: ClipPoint = [0, 0];
  let restKey = "";

  function chooseTarget(frame: ClipFrame) {
    const key = JSON.stringify([frame, turnStep, current, focusTo.toArray()]);
    if (key === restKey) return;
    restKey = key;
    const [cx, cy] = centreOf(frame.safe);
    restTarget = [cx, cy];
    if (frame.clear.length === 0) return;
    const leaning = focus.clone();
    const turned = board.rotation.y;
    focus.copy(focusTo);
    board.rotation.y = turnStep * TURN_RADIANS;
    board.updateMatrixWorld();
    const width = frame.safe.x1 - frame.safe.x0;
    const height = frame.safe.y1 - frame.safe.y0;
    let closest = Infinity;
    for (const [sx, sy] of TARGET_SHIFTS) {
      const candidate: ClipPoint = [cx + sx * width, cy + sy * height];
      const distance = aimAt(frame, candidate, Math.min(closest, 300));
      /* Near-ties go to the place nearest the middle, tried first. */
      if (distance < closest * 0.995) {
        closest = distance;
        restTarget = candidate;
      }
    }
    focus.copy(leaning);
    board.rotation.y = turned;
    board.updateMatrixWorld();
  }

  /* What the camera last showed, and what it eases from when the selected
     tile, the turn or the stage changes: the lean and the place the board
     rests differ between steps, and a cut would jump. */
  let shownTarget: ClipPoint = [0, 0];
  let shownDistance = 0;
  let fromTarget: ClipPoint = [0, 0];
  let fromDistance = 0;

  function easeCamera(instant: boolean) {
    focusFrom = focus.clone();
    fromTarget = shownTarget;
    fromDistance = shownDistance;
    focusElapsed = instant || shownDistance === 0 ? FOCUS_MS : 0;
  }

  /* The camera leans toward the selected tile and comes as close as keeps
     the board framed. While it eases between two rests, it is never closer
     than keeps every tile inside the stage and clear of the board's tabs,
     so the move crops nothing on the way. */
  function aim() {
    const t = easeInOut(focusElapsed / FOCUS_MS);
    focus.lerpVectors(focusFrom, focusTo, t);
    board.updateMatrixWorld();
    camera.far = 1000;
    camera.updateProjectionMatrix();
    const frame = clipFrame();
    chooseTarget(frame);
    shownTarget = [
      fromTarget[0] + (restTarget[0] - fromTarget[0]) * t,
      fromTarget[1] + (restTarget[1] - fromTarget[1]) * t,
    ];
    const resting = aimAt(frame, shownTarget);
    shownDistance =
      t >= 1
        ? resting
        : Math.max(
            fromDistance + (resting - fromDistance) * t,
            fitDistance(frame, false),
          );
    placeCamera(shownDistance);
    camera.far = shownDistance * 2.5;
    camera.updateProjectionMatrix();
  }

  function frame() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    /* One allocation at the new size; the canvas's CSS size is the page's. */
    renderer.setDrawingBufferSize(
      width,
      height,
      drawingPixelRatio(width, height, window.devicePixelRatio),
    );
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    aim();
  }

  function focusOn(slug: PathStepSlug, instant: boolean) {
    const [x, z] = tileCentre(slug);
    const target = new Vector3(x * FOCUS_SHARE, 0, z * FOCUS_SHARE);
    if (target.equals(focusTo)) return;
    focusTo = target;
    easeCamera(instant);
    /* An instant lean is no frame's job: aim now. */
    if (instant) aim();
  }

  const raycaster = new Raycaster();
  const pointer = new Vector2();

  /* ─── The frame loop: runs only while something is moving ─── */

  let frameRequest = 0;
  let lastTime: number | undefined;
  let paused = document.visibilityState === "hidden";
  let contextLost = false;
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;
  let fellBack = false;
  const frameTimes: number[] = [];

  /* Frames are drawn on demand: a move, a build, a turn or a theme change.
     The frame sample fills only from those, so a settled board draws
     nothing while it waits for a verdict. */
  function moving() {
    return (
      buildState === "building" ||
      catchingUp.size > 0 ||
      landingElapsed < LANDING_MS ||
      lifting() ||
      turnElapsed < TURN_MS ||
      focusElapsed < FOCUS_MS ||
      themeElapsed < THEME_MS
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

    const step = Math.min(delta, MAX_STEP_MS);
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
        if (move.elapsed >= move.duration) {
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
    /* A turn eases the camera too: one aim a frame for both. */
    const aiming = turnElapsed < TURN_MS || focusElapsed < FOCUS_MS;
    if (turnElapsed < TURN_MS) {
      turnElapsed = Math.min(turnElapsed + step, TURN_MS);
      const t = easeInOut(turnElapsed / TURN_MS);
      board.rotation.y = (turnFrom + (turnStep - turnFrom) * t) * TURN_RADIANS;
    }
    if (focusElapsed < FOCUS_MS) {
      focusElapsed = Math.min(focusElapsed + step, FOCUS_MS);
    }
    if (aiming) aim();
    /* The water and the grass move on with every frame drawn. */
    paintBox.flow(step / 1000);
    if (themeElapsed < THEME_MS) {
      themeElapsed = Math.min(themeElapsed + step, THEME_MS);
      const t = easeInOut(themeElapsed / THEME_MS);
      themeMix.value = themeFrom + (themeTarget - themeFrom) * t;
      paint();
    }

    renderer.render(scene, camera);
    canvas.dataset.pathSceneRendered = "true";
    if (moving()) requestFrame();
    else lastTime = undefined;
  }

  function render() {
    if (!frameRequest && !contextLost && !fellBack) {
      renderer.render(scene, camera);
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
    renderer.render(scene, camera);
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
      const { along } = movePose(move.steps, move.elapsed / move.duration);
      const from = stepIndex(move.from);
      const over = (from + Math.round(along)) % LOOP.length;
      pawnAt = LOOP[(over + LOOP.length) % LOOP.length];
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

  function build(step: PathStep) {
    abandon();
    canvas.style.opacity = "";
    stills = undefined;
    const slug = step.slug;
    const first = !pawnAt;
    plan = buildPlan(step);
    const passed = new Set(LOOP.slice(0, stepIndex(slug)));

    if (reducedMotion) {
      /* Reduced motion is a designed state: the whole board built, the pawn
         on its tile, at once (decision 12). */
      for (const tile of tiles.keys()) built.add(tile);
      catchingUp.clear();
      current = slug;
      focusOn(slug, true);
      finish();
      aim();
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
    const steps = pawnAt
      ? loopSteps(stepIndex(pawnAt), stepIndex(slug), LOOP.length)
      : 0;
    if (!pawnAt) pawnAt = slug;
    move =
      steps === 0
        ? undefined
        : {
            from: pawnAt,
            steps,
            elapsed: 0,
            duration: moveDuration(steps),
          };
    focusOn(slug, first);
    buildState = "building";
    pose();
    /* Emitted even when already building: a cut from one step's build to
       another's clears the lit lines too. */
    emit();
    requestFrame();
  }

  /** Builds `step` on a board that is ready, or shows its stills if its
   *  tile is not. */
  function buildOrFail(step: PathStep) {
    makeTiles();
    const failed = failedTiles.get(step.slug);
    if (failed) return failScene(step, failed);
    try {
      build(step);
    } catch (error) {
      console.error(error);
      failScene(step, "scene-failed");
    }
  }

  board.add(makeBoard(paintBox), makePath(paintBox));

  return {
    show(step) {
      const request = ++showing;
      const retry = failedFilesOf(step.slug);
      if (prepared && retry.length === 0) return buildOrFail(step);
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
          buildOrFail(step);
        },
        () => {
          if (!disposed && request === showing)
            failScene(step, "assets-failed");
        },
      );
    },
    skip() {
      if (buildState !== "building") return false;
      finish();
      return true;
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
      easeCamera(reducedMotion);
      if (reducedMotion) {
        board.rotation.y = turnStep * TURN_RADIANS;
        turnElapsed = TURN_MS;
        aim();
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
      /* A resize can land mid-ease: the camera heads for the new rest from
         where it is, rather than cutting. */
      aim();
      if (prepared) render();
    },
    setReducedMotion(reduced) {
      reducedMotion = reduced;
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
      environment.dispose();
      pmrem.dispose();
      sun.shadow.map?.dispose();
      renderer.dispose();
    },
  };
}
