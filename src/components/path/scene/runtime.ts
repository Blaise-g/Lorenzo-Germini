import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShadowMaterial,
  Shape,
  ShapeGeometry,
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
  LOOP,
  MVP_INK_STRENGTH,
  MVP_WINDOW_LINES,
  pawnSpot,
  TILE,
  tileCentre,
  frameShapes,
  HOP_HEIGHT,
  PAWN_HEIGHT,
  tileName,
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
import { cardsForStep, type CardArt } from "./card-art";
import { drawingPixelRatio } from "./drawing-buffer";
import {
  centreOf,
  filled,
  framed,
  inRect,
  middleOf,
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
  drawnInk,
  inkMaterial,
  loadGrain,
  loadInk,
  type InkShared,
  type InkMaterial,
  type InkOptions,
  type InkPlates,
} from "./ink";
import { handAngle, LILLE_FIGURE_LINES } from "./lille";
import {
  easeInOut,
  foldPose,
  landingSquash,
  LANDING_MS,
  loopSteps,
  moveDuration,
  movePose,
} from "./motion";
import { isDarkMode, readPalette, type Palette } from "./palette";

/* The 3D path's board (GH-148; comp B, "Risograph Pop-up"): vanilla three.js,
   imported dynamically by the host on `/path` only, after the overlay has
   painted (GH-141, implementation decision 6). One printed board holds every
   step as a tile on a loop. Selecting a step hops the pawn there along the
   loop and folds that tile's cards up in the data's order, lighting the
   caption lines as they settle; then the board stops drawing until something
   moves again. Tiles already built stay built. */

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
/** A high three-quarter view, as comp B's: the camera's angle above the
 *  table. Steeper, the ring stands taller on a wide stage and fills more of
 *  the room the printed cards leave it. */
const CAMERA_ELEVATION = 0.8;
/** How much of the stage's free part the board may fill, either way. */
const FRAME_FILL = { x: 0.95, y: 0.9 } as const;
/** Each card after the first in a prop folds this much later. */
const CARD_STAGGER_MS = 110;
/** However many cards a prop has, the last starts with time left to fold. */
const MAX_CARD_DELAY_MS = PROP_DROP_MS * 0.6;
/** A tile already built, built again, folds from part-way back: it stays
 *  standing rather than vanishing and rising from nothing. */
const REFOLD_FROM = 0.42;
/** Printed text on the board, in pixels of texture per scene unit. */
const PRINT_PX = 150;
const TILE_PX = 84;
/** A card's cut edge, standing behind its face: the card's thickness. */
const CARD_THICKNESS = 0.02;
/** How far in from a tile's front edge its name is printed, in scene units,
 *  and how far its letters reach back from there. */
const NAME_STRIP = 0.58;
const NAME_REACH = 0.25;
/** How far a standing card's glued tab reaches in front of its fold, at
 *  most: never over the tile's name. A card too close to the name for a
 *  tab worth seeing has none. */
const TAB_DEPTH = 0.26;
const TAB_MIN_DEPTH = 0.1;
/** A tab is narrower than its card: its ends are cut back. */
const TAB_WIDTH_SHARE = 0.86;

export type SceneSnapshot = {
  buildState: BuildState;
  lit: readonly number[];
  /** The props standing or folding up on the board, in the data's order. */
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
  /** The step whose tile, or a card standing on it, is under a point on the
   *  canvas, in CSS pixels from its top-left corner; null for none. */
  pick(x: number, y: number): PathStepSlug | null;
  dispose(): void;
};

/** One card on a tile, hinged at its foot. */
type Piece = {
  hinge: Group;
  /** The glued tab a card standing on the tile folds up from, lying flat
   *  in front of it: shown and grown with the card, never turned. */
  tab?: Object3D;
  materials: InkMaterial[];
  /** Its delay after its prop starts to fold. */
  delay: number;
  motion?: (hinge: Object3D, progress: number) => void;
};

type Tile = {
  slug: PathStepSlug;
  group: Group;
  /** Its pieces by the prop they fold up with, in the data's order. */
  props: Map<string, Piece[]>;
};

function stepNamed(slug: PathStepSlug) {
  return PATH_STEPS.find((step) => step.slug === slug)!;
}

/** The chamfered outline every tile is cut to, centred on its origin. */
function tileShape() {
  const w = TILE.width / 2;
  const d = TILE.depth / 2;
  const c = TILE.chamfer;
  const shape = new Shape();
  shape.moveTo(-w + c, -d);
  shape.lineTo(w - c, -d);
  shape.lineTo(w, -d + c);
  shape.lineTo(w, d - c);
  shape.lineTo(w - c, d);
  shape.lineTo(-w + c, d);
  shape.lineTo(-w, d - c);
  shape.lineTo(-w, -d + c);
  shape.closePath();
  return shape;
}

function chamferPath(context: CanvasRenderingContext2D, w: number, h: number) {
  const c = (TILE.chamfer / TILE.width) * w;
  context.beginPath();
  context.moveTo(c, 0);
  context.lineTo(w - c, 0);
  context.lineTo(w, c);
  context.lineTo(w, h - c);
  context.lineTo(w - c, h);
  context.lineTo(c, h);
  context.lineTo(0, h - c);
  context.lineTo(0, c);
  context.closePath();
}

function flatGrain() {
  const texture = new DataTexture(Uint8Array.from([128, 128, 128, 255]), 1, 1);
  texture.needsUpdate = true;
  return texture;
}

export function createSceneRuntime(options: SceneRuntimeOptions): SceneRuntime {
  const { canvas, signals, onChange, onFallback } = options;
  let reducedMotion = options.reducedMotion;

  /* Throws when the browser refuses a context, including one with a major
     performance caveat that the host's probe did not see; the host catches it
     and shows the stills. */
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    failIfMajorPerformanceCaveat: true,
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.5, 200);
  const board = new Group();
  scene.add(board);

  /* Flat, even daylight with one sun for crisp contact shadows (comp B):
     the sky does most of the lighting, so a card facing the visitor prints
     close to its token colours. */
  const sky = new HemisphereLight(0xffffff, 0xffffff, 2.3);
  const sun = new DirectionalLight(0xffffff, 1.25);
  sun.position.set(-11, 13, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -15,
    right: 15,
    top: 13,
    bottom: -13,
    near: 1,
    far: 50,
  });
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  scene.add(sky, sun);

  /* The table the board lies on is the page: only the shadows show on it. */
  const tableMaterial = new ShadowMaterial({ opacity: 0.2 });
  const table = new Mesh(new PlaneGeometry(90, 90), tableMaterial);
  table.rotation.x = -Math.PI / 2;
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

  const colours: InkShared = {
    paper: { value: new Color() },
    ink1: { value: new Color() },
    ink2: { value: new Color() },
    /* Even grey until `grain.webp` arrives, which is no grain at all. */
    grain: { value: flatGrain() },
  };
  const background = new Color();

  function paint() {
    const mix = (role: keyof Palette) =>
      palettes.light[role].clone().lerp(palettes.dark[role], themeMix.value);
    colours.paper.value.copy(mix("paper"));
    colours.ink1.value.copy(mix("ink-warm"));
    colours.ink2.value.copy(mix("ink-cool"));
    background.copy(mix("fog"));
    scene.background = background;
    /* A shadow on dark stock reads with a little more weight. */
    tableMaterial.opacity = 0.2 + 0.2 * themeMix.value;
  }
  paint();

  /* Everything the board allocates, for `dispose`. */
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>([colours.grain.value!]);

  function own<T extends BufferGeometry>(geometry: T) {
    geometries.add(geometry);
    return geometry;
  }

  function surface(texture: Texture, options: InkOptions) {
    textures.add(texture);
    const made = inkMaterial(texture, colours, options);
    made.material.shadowSide = DoubleSide;
    made.depthMaterial.side = DoubleSide;
    materials.add(made.material);
    materials.add(made.depthMaterial);
    return made;
  }

  /** A die-cut card standing on its hinge: its printed face, and behind it
   *  its cut edge, which shows as the card's thickness. */
  function card(
    texture: Texture,
    size: readonly [number, number],
    anchor: { u: number; v: number },
    options: InkOptions,
  ): { hinge: Group; materials: InkMaterial[] } {
    const [width, height] = size;
    const geometry = own(new PlaneGeometry(width, height));
    geometry.translate((0.5 - anchor.u) * width, (0.5 - anchor.v) * height, 0);
    const face = surface(texture, { ...options, size });
    const edge = surface(texture, { ...options, size, edge: true });
    const front = new Mesh(geometry, face.material);
    front.castShadow = true;
    front.receiveShadow = true;
    front.customDepthMaterial = face.depthMaterial;
    const back = new Mesh(geometry, edge.material);
    back.position.z = -CARD_THICKNESS;
    back.position.y = -CARD_THICKNESS / 2;
    const hinge = new Group();
    hinge.add(front, back);
    return { hinge, materials: [face.material, edge.material] };
  }

  /* A card standing on the tile has a tab: paper, its ends chamfered and its cut edge
     ruled, and the crease it folds up along scored as a slate dashed line.
     One print for every tab; each card's tab has its own material, so it
     fades with its card. */
  const tabTexture = drawnInk(256, 40, (plates) => {
    const { cut, ink2 } = plates;
    const outline = new Path2D("M0 0 L256 0 L232 40 L24 40 Z");
    cut.fill(outline);
    ink2.lineWidth = 4;
    ink2.stroke(new Path2D("M2 0 L25 38 L231 38 L254 0"));
    ink2.lineWidth = 3;
    ink2.setLineDash([9, 7]);
    ink2.beginPath();
    ink2.moveTo(8, 4);
    ink2.lineTo(248, 4);
    ink2.stroke();
  });

  function tab(art: CardArt): { tab: Mesh; material: InkMaterial } | null {
    if (art.position.y !== 0 || art.anchor.v !== 0) return null;
    const depth = Math.min(
      TAB_DEPTH,
      TILE.depth / 2 - NAME_STRIP - NAME_REACH - art.position.z,
    );
    if (depth < TAB_MIN_DEPTH) return null;
    const tabWidth = art.width * TAB_WIDTH_SHARE;
    const geometry = own(new PlaneGeometry(tabWidth, depth));
    /* Flat on the tile, its scored edge along the card's foot. */
    geometry.rotateX(-Math.PI / 2);
    geometry.translate((0.5 - art.anchor.u) * art.width, 0.006, depth / 2);
    const { material } = surface(tabTexture, {
      seed: `${art.id}-tab`,
      size: [tabWidth, depth],
    });
    const mesh = new Mesh(geometry, material);
    mesh.receiveShadow = true;
    return { tab: mesh, material };
  }

  /* ─── Printed text ─── */

  function fontOf(variable: string, weight: number, px: number) {
    const family =
      getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim() || "serif";
    return `${weight} ${px}px ${family}`;
  }
  const displayFont = (px: number) => fontOf("--font-display", 600, px);
  const labelFont = (px: number) => fontOf("--font-label", 600, px);

  type Label = {
    lines: readonly string[];
    font: (px: number) => string;
    lineHeight: number;
    ink: "ink1" | "ink2";
    /** A die-cut plaque behind the text, ruled in its ink; without it the
     *  text is printed on whatever it overlays. */
    plaque?: boolean;
  };

  /** Lines of text printed in one ink, `lineHeight` scene units each, as a
   *  separation; returns its size in scene units. */
  function printed(label: Label) {
    const px = Math.round(label.lineHeight * PRINT_PX * 0.72);
    const leading = label.lineHeight * PRINT_PX;
    const measure = document.createElement("canvas").getContext("2d")!;
    measure.font = label.font(px);
    const textWidth = Math.max(
      ...label.lines.map((line) => measure.measureText(line).width),
    );
    const pad = label.plaque ? px * 0.9 : px * 0.2;
    const width = Math.ceil(textWidth + pad * 2);
    const height = Math.ceil(leading * label.lines.length + pad * 0.9);
    const texture = drawnInk(width, height, (plates) => {
      const ink = plates[label.ink];
      if (label.plaque) {
        plates.cut.fillRect(0, 0, width, height);
        ink.lineWidth = Math.max(2, px * 0.08);
        const inset = px * 0.28;
        ink.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
      }
      ink.font = label.font(px);
      ink.textAlign = "center";
      ink.textBaseline = "middle";
      label.lines.forEach((line, index) =>
        ink.fillText(
          line,
          width / 2,
          height / 2 + (index - (label.lines.length - 1) / 2) * leading,
        ),
      );
      if (!label.plaque) {
        plates.cut.font = ink.font;
        plates.cut.textAlign = "center";
        plates.cut.textBaseline = "middle";
        label.lines.forEach((line, index) =>
          plates.cut.fillText(
            line,
            width / 2,
            height / 2 + (index - (label.lines.length - 1) / 2) * leading,
          ),
        );
      }
    });
    return {
      texture,
      size: [width / PRINT_PX, height / PRINT_PX] as const,
    };
  }

  /* ─── The tiles ─── */

  const cardTextures = new Map<string, Texture>();
  const failedFiles = new Set<string>();
  const tiles = new Map<PathStepSlug, Tile>();
  /** Tiles that could not be made, and why; tried again on the next show. */
  const failedTiles = new Map<PathStepSlug, SceneFallbackReason>();
  let tileShapeGeometry: ShapeGeometry | undefined;
  let tileSlabGeometry: ExtrudeGeometry | undefined;
  let plainTexture: Texture | undefined;

  function cardTexture(art: CardArt) {
    const texture = cardTextures.get(art.file);
    if (!texture) throw new Error(`The card ${art.file} is not loaded`);
    return texture;
  }

  function tileTop(slug: PathStepSlug) {
    const width = Math.round(TILE.width * TILE_PX);
    const height = Math.round(TILE.depth * TILE_PX);
    const band = stepIndex(slug) % 2 === 0 ? "ink1" : "ink2";
    const other = band === "ink1" ? "ink2" : "ink1";
    return drawnInk(width, height, (plates: InkPlates) => {
      chamferPath(plates.cut, width, height);
      plates.cut.fill();
      /* A ruled border in the second ink, and the corners printed solid:
         the tile's own ink at the front, the other at the back, as a
         board's colour bands are laid. */
      const corner = 0.95 * TILE_PX;
      const wedge = (
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        dx: number,
        dy: number,
      ) => {
        context.save();
        chamferPath(context, width, height);
        context.clip();
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + dx * corner, y);
        context.lineTo(x, y + dy * corner);
        context.closePath();
        context.fill();
        context.restore();
      };
      wedge(plates[band], 0, height, 1, -1);
      wedge(plates[band], width, height, -1, -1);
      wedge(plates[other], 0, 0, 0.7, 0.7);
      wedge(plates[other], width, 0, -0.7, 0.7);
      plates.ink2.lineWidth = 0.03 * TILE_PX;
      const inset = 0.16 * TILE_PX;
      plates.ink2.save();
      plates.ink2.translate(inset, inset);
      chamferPath(plates.ink2, width - inset * 2, height - inset * 2);
      plates.ink2.stroke();
      plates.ink2.restore();
      /* The front strip carries the name, in the second ink. */
      const strip = NAME_STRIP * TILE_PX;
      plates.ink2.font = displayFont(Math.round(0.56 * TILE_PX));
      plates.ink2.textAlign = "center";
      plates.ink2.textBaseline = "middle";
      plates.ink2.fillText(tileName(slug), width / 2, height - strip);
    });
  }

  function stepIndex(slug: PathStepSlug) {
    return LOOP.indexOf(slug);
  }

  function tileBase(slug: PathStepSlug) {
    tileShapeGeometry ??= (() => {
      const shape = tileShape();
      const geometry = own(new ShapeGeometry(shape));
      /* A shape's UVs are its coordinates; the top's texture spans it. */
      const uv = geometry.getAttribute("uv");
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(
          i,
          uv.getX(i) / TILE.width + 0.5,
          uv.getY(i) / TILE.depth + 0.5,
        );
      }
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, TILE.thickness + 0.002, 0);
      return geometry;
    })();
    tileSlabGeometry ??= (() => {
      const geometry = own(
        new ExtrudeGeometry(tileShape(), {
          depth: TILE.thickness,
          bevelEnabled: false,
        }),
      );
      geometry.rotateX(-Math.PI / 2);
      return geometry;
    })();
    plainTexture ??= drawnInk(2, 2, (plates) =>
      plates.cut.fillRect(0, 0, 2, 2),
    );

    const top = new Mesh(
      tileShapeGeometry,
      surface(tileTop(slug), {
        seed: slug,
        size: [TILE.width, TILE.depth],
      }).material,
    );
    top.receiveShadow = true;
    const slab = new Mesh(
      tileSlabGeometry,
      surface(plainTexture, { edge: true }).material,
    );
    slab.castShadow = true;
    slab.receiveShadow = true;
    const group = new Group();
    group.add(slab, top);
    return group;
  }

  /** The pieces the board itself prints for a tile, beyond its cards: the
   *  labels and moving parts no card carries. */
  function extras(slug: PathStepSlug): { prop: string; piece: Piece }[] {
    const cards = cardsForStep(slug);
    const placed = (
      prop: string,
      made: { hinge: Group; materials: InkMaterial[] },
      x: number,
      y: number,
      z: number,
      motion?: Piece["motion"],
    ) => {
      made.hinge.position.set(x, y, z);
      return { prop, piece: { ...made, delay: 0, motion } };
    };

    if (slug === "lille") {
      const clock = cards.find((art) => art.prop === "clock-face");
      if (!clock) return [];
      const { x, y, z } = clock.position;
      /* The dial's hand: a slip of card pinned at the dial's centre, which
         turns inside a hinge that folds up with the dial. */
      const handTexture = drawnInk(8, 64, (plates) => {
        plates.cut.fillRect(0, 0, 8, 64);
        plates.ink2.fillRect(0, 0, 8, 64);
      });
      const blade = card(
        handTexture,
        [clock.width * 0.06, clock.height * 0.36],
        { u: 0.5, v: 0.12 },
        { seed: "hand" },
      );
      blade.hinge.name = "hand";
      blade.hinge.position.y = clock.height / 2;
      const hand = { hinge: new Group(), materials: blade.materials };
      hand.hinge.add(blade.hinge);
      /* The post the dial stands on, when it stands above the tile. */
      const post = card(
        plainTexture!,
        [0.07, Math.max(y, 0.01)],
        { u: 0.5, v: 0 },
        { seed: "post", edge: false },
      );
      const plaque = printed({
        lines: LILLE_FIGURE_LINES,
        font: displayFont,
        lineHeight: 0.3,
        ink: "ink1",
        plaque: true,
      });
      return [
        placed("clock-face", post, x, 0, z - 0.03),
        placed("clock-face", hand, x, y, z + 0.012, (hinge, progress) => {
          const pin = hinge.getObjectByName("hand");
          if (pin) pin.rotation.z = handAngle(progress);
        }),
        placed(
          "clock-face",
          card(
            plaque.texture,
            plaque.size,
            { u: 0.5, v: 0 },
            {
              seed: "plaque",
            },
          ),
          0.2,
          0,
          0.7,
        ),
      ];
    }

    if (slug === "cuneo-2022") {
      const tag = printed({
        lines: MVP_WINDOW_LINES,
        font: labelFont,
        lineHeight: 0.3,
        ink: "ink2",
        plaque: true,
      });
      return [
        placed(
          "mvp-window",
          card(
            tag.texture,
            tag.size,
            { u: 0.5, v: 0 },
            {
              seed: "mvp",
              inkStrength: MVP_INK_STRENGTH,
            },
          ),
          1.05,
          0,
          0.8,
        ),
      ];
    }

    return [];
  }

  function makeTile(slug: PathStepSlug): Tile {
    const group = tileBase(slug);
    const step = stepNamed(slug);
    const props = new Map<string, Piece[]>(
      step.props.map((prop) => [prop.id, []]),
    );
    const firstProp = step.props[0].id;
    for (const art of cardsForStep(slug)) {
      const made = card(cardTexture(art), [art.width, art.height], art.anchor, {
        seed: art.id,
        inkStrength: art.prop === "mvp-window" ? MVP_INK_STRENGTH : 1,
      });
      made.hinge.position.set(
        art.position.x,
        TILE.thickness + art.position.y,
        art.position.z,
      );
      /* Only a card folding up from the tile itself has a tab; one mounted
         on another card has none to lie on. */
      const standing = tab(art);
      if (standing) {
        standing.tab.position.copy(made.hinge.position);
        group.add(standing.tab);
      }
      /* A card that renders no prop, such as a tree, folds up with the
         tile's first. */
      const pieces = props.get(art.prop ?? firstProp) ?? props.get(firstProp)!;
      pieces.push({
        hinge: made.hinge,
        tab: standing?.tab,
        materials: standing
          ? [...made.materials, standing.material]
          : made.materials,
        delay: pieces.length * CARD_STAGGER_MS,
      });
      group.add(made.hinge);
    }
    for (const { prop, piece } of extras(slug)) {
      piece.hinge.position.y += TILE.thickness;
      const pieces = props.get(prop)!;
      piece.delay = pieces[0]?.delay ?? 0;
      pieces.push(piece);
      group.add(piece.hinge);
    }
    const [x, z] = tileCentre(slug);
    group.position.set(x, 0, z);
    group.scale.setScalar(tileScale(slug));
    group.userData.slug = slug;
    return { slug, group, props };
  }

  /* The paths between tiles: printed strips under the tiles' edges. */
  function makeConnectors() {
    const texture = drawnInk(256, 48, (plates) => {
      plates.cut.fillRect(0, 0, 256, 48);
      for (let i = 0; i < 4; i++) {
        plates[i % 2 === 0 ? "ink1" : "ink2"].fillRect(i * 64 + 6, 8, 52, 32);
      }
    });
    const material = surface(texture, { seed: "path", size: [3, 0.6] });
    LOOP.forEach((slug, index) => {
      const next = LOOP[(index + 1) % LOOP.length];
      const [ax, az] = tileCentre(slug);
      const [bx, bz] = tileCentre(next);
      const length = Math.hypot(bx - ax, bz - az);
      const strip = new Mesh(
        own(new BoxGeometry(length, 0.08, 0.7)),
        material.material,
      );
      strip.position.set((ax + bx) / 2, 0.04, (az + bz) / 2);
      strip.rotation.y = -Math.atan2(bz - az, bx - ax);
      strip.receiveShadow = true;
      board.add(strip);
    });
  }

  /* ─── The pawn: a folded paper cone ─── */

  const pawn = new Group();
  {
    const texture = drawnInk(64, 128, (plates) => {
      plates.cut.fillRect(0, 0, 64, 128);
      /* Terracotta all over but a paper collar, and a slate fold line:
         solid enough to read against any tile's print. */
      plates.ink1.fillRect(0, 0, 64, 128);
      plates.ink1.clearRect(0, 70, 64, 16);
      plates.ink2.fillRect(30, 0, 4, 128);
    });
    const cone = new Mesh(
      own(new ConeGeometry(0.55, PAWN_HEIGHT, 7, 1)),
      surface(texture, { seed: "pawn", size: [1.2, 1] }).material,
    );
    (cone.material as InkMaterial).flatShading = true;
    cone.position.y = PAWN_HEIGHT / 2;
    cone.castShadow = true;
    pawn.add(cone);
    pawn.visible = false;
    board.add(pawn);
  }

  function pawnBase(slug: PathStepSlug) {
    return TILE.thickness * tileScale(slug);
  }

  /* ─── Loading ─── */

  let prepared = false;
  /** The one `prepare` in flight: a second show while it runs waits on it. */
  let preparing: Promise<void> | undefined;

  async function loadFiles(files: readonly string[]) {
    /* Trees are shared between tiles: each file is fetched once. */
    await Promise.all(
      [...new Set(files)].map(async (file) => {
        if (cardTextures.has(file)) return;
        try {
          const texture = await loadInk(file);
          if (disposed) return texture.dispose();
          cardTextures.set(file, texture);
          failedFiles.delete(file);
        } catch {
          failedFiles.add(file);
        }
      }),
    );
  }

  function filesOf(slug: PathStepSlug) {
    return [...new Set(cardsForStep(slug).map((art) => art.file))];
  }

  /* Everything the board needs before it can show: the faces its labels
     are printed in, the stock's grain and every card's art. A face or a
     grain that does not load is printed without, not a reason to drop the
     board. */
  async function prepare() {
    await Promise.all([
      document.fonts.load(displayFont(32)).catch(() => undefined),
      document.fonts.load(labelFont(32)).catch(() => undefined),
      loadGrain().then(
        (texture) => {
          if (disposed) return texture.dispose();
          colours.grain.value = texture;
          textures.add(texture);
        },
        () => undefined,
      ),
      loadFiles(LOOP.flatMap(filesOf)),
    ]);
    prepared = true;
  }

  /** Makes every tile not yet made; a tile whose art did not load, or whose
   *  own code throws, is left off the board and tried again next time. */
  function makeTiles() {
    for (const slug of LOOP) {
      if (tiles.has(slug)) continue;
      if (filesOf(slug).some((file) => failedFiles.has(file))) {
        failedTiles.set(slug, "assets-failed");
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

  /** Tiles whose cards stand. */
  const built = new Set<PathStepSlug>();
  /** Tiles passed on a jump, folding up together at once, by elapsed ms. */
  const catchingUp = new Map<PathStepSlug, number>();
  let current: PathStepSlug | undefined;
  let plan: BuildPlan | undefined;
  /** Whether the current tile stood before this build began. */
  let refold = false;
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
    for (const [prop, pieces] of tile.props) {
      const elapsed = at(prop);
      for (const piece of pieces) {
        const local =
          elapsed === "up"
            ? 1
            : (elapsed - Math.min(piece.delay, MAX_CARD_DELAY_MS)) /
              (PROP_DROP_MS - Math.min(piece.delay, MAX_CARD_DELAY_MS));
        const pose = foldPose(local, PROP_DROP_MS);
        /* A tile built again never vanishes: it leans back part-way and
           springs up from there. */
        const again = refold && tile.slug === current;
        const opacity = again ? 1 : pose.opacity;
        piece.hinge.visible = opacity > 0;
        piece.hinge.rotation.x = again ? pose.angle * REFOLD_FROM : pose.angle;
        piece.hinge.scale.setScalar(again ? 1 : pose.scale);
        if (piece.tab) {
          piece.tab.visible = piece.hinge.visible;
          piece.tab.scale.setScalar(again ? 1 : pose.scale);
        }
        for (const material of piece.materials) {
          material.userData.opacity.value = opacity;
        }
        piece.motion?.(piece.hinge, Math.min(Math.max(local, 0), 1));
      }
    }
  }

  /** Puts every card and the pawn where the clocks say they are. */
  function pose() {
    for (const tile of tiles.values()) {
      const slug = tile.slug;
      if (slug === current && plan && buildState === "building") {
        const starts = new Map(
          plan.building.map((planned) => [planned.id, planned.startsAt]),
        );
        const folding = move ? -1 : buildElapsed;
        poseTile(tile, (prop) =>
          refold && move ? "up" : folding - (starts.get(prop) ?? 0),
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
          tile.props.get(prop.id)?.some((piece) => piece.hinge.visible),
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
      /* Leaning into the hop, as a flicked cone would. */
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
    refold = false;
    pose();
    /* Emitted even when already built: under reduced motion one step's end
       state cuts to another's, and the host has to hear the new step. */
    buildState = "built";
    emit();
    requestFrame();
  }

  /* ─── The camera ─── */

  const shapes = frameShapes().map(({ slug, outlines }) => ({
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

  type ClipFrame = { safe: ClipRect; clear: ClipRect[]; avoid: ClipRect[] };

  /** The stage's free part and the cards laid over it, in clip space. */
  function clipFrame(): ClipFrame {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    const frame = stageFrame ?? wholeStage(width, height);
    const clip = (rect: StageRect) => toClip(rect, width, height);
    return {
      safe: filled(clip(frame.safe), FRAME_FILL),
      clear: frame.clear.map(clip),
      avoid: frame.avoid.map(clip),
    };
  }

  /** Every tile's outlines, turned as the board is and seen from `distance`
   *  back, in clip space; null if any point is behind the camera. */
  function projected(distance: number) {
    placeCamera(distance);
    const out: { slug: PathStepSlug; outlines: ClipPoint[][] }[] = [];
    for (const { slug, outlines } of shapes) {
      const clipped: ClipPoint[][] = [];
      for (const outline of outlines) {
        const points: ClipPoint[] = [];
        for (const point of outline) {
          probe
            .copy(point)
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

  /** Whether, from `distance` back, the board stands inside the free part
   *  and clear of the cards over it: the selected tile clear of the panel
   *  too, any other tile's middle and name at least. With `selected` false only the
   *  stage's edge and the list count. */
  function fits(distance: number, frame: ClipFrame, selected = true) {
    const tiles = projected(distance);
    if (tiles === null) return false;
    return tiles.every(({ slug, outlines }) => {
      if (!framed(outlines, frame.safe, frame.clear)) return false;
      if (!selected) return true;
      if (slug === current) return framed(outlines, frame.safe, frame.avoid);
      /* Its middle, and the middle of its front edge, where its name is. */
      const [, , frontRight, frontLeft] = outlines[0];
      const name = middleOf([frontRight, frontLeft]);
      const middle = middleOf(outlines[0]);
      return frame.avoid.every(
        (rect) => !inRect(rect, middle) && !inRect(rect, name),
      );
    });
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
  function fitDistance(frame: ClipFrame, selected = true) {
    let near = 5;
    let far = 300;
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
  function aimAt(frame: ClipFrame, target: ClipPoint) {
    centring.set(0, 0, 0);
    let distance = 0;
    for (let pass = 0; pass < 3; pass++) {
      lookAt.copy(BOARD_TARGET).add(centring).add(focus);
      distance = fitDistance(frame);
      const [x, y] = boundsCentre(distance);
      const halfHeight = distance * Math.tan((CAMERA_FOV * Math.PI) / 360);
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      centring
        .addScaledVector(right, (x - target[0]) * halfHeight * camera.aspect)
        .addScaledVector(up, (y - target[1]) * halfHeight);
    }
    lookAt.copy(BOARD_TARGET).add(centring).add(focus);
    return fitDistance(frame);
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
    const key = JSON.stringify([frame, turnStep, current]);
    if (key === restKey) return;
    restKey = key;
    const [cx, cy] = centreOf(frame.safe);
    restTarget = [cx, cy];
    if (frame.clear.length + frame.avoid.length === 0) return;
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
      const distance = aimAt(frame, candidate);
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
     tile, the turn or the stage changes: the panel's corner only clears the
     selected tile, so the rest the camera comes to differs between steps,
     and a cut would jump. */
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
     than keeps every tile inside the stage and clear of the list, so the
     move crops nothing on the way. */
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
    if (posed) pose();
    if (turnElapsed < TURN_MS) {
      turnElapsed = Math.min(turnElapsed + step, TURN_MS);
      const t = easeInOut(turnElapsed / TURN_MS);
      board.rotation.y = (turnFrom + (turnStep - turnFrom) * t) * TURN_RADIANS;
      aim();
    }
    if (focusElapsed < FOCUS_MS) {
      focusElapsed = Math.min(focusElapsed + step, FOCUS_MS);
      aim();
    }
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
    if (buildState === "building" && refold && current) built.add(current);
    refold = false;
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
       Any not standing yet fold up together, at once. */
    for (const other of passed) {
      if (!built.has(other) && tiles.has(other) && !catchingUp.has(other)) {
        catchingUp.set(other, 0);
      }
    }
    refold = built.has(slug);
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

  makeConnectors();

  return {
    show(step) {
      const request = ++showing;
      const retry = filesOf(step.slug).filter((file) => failedFiles.has(file));
      if (prepared && retry.length === 0) return buildOrFail(step);
      /* Loading: the canvas is see-through, so the step's still shows until
         the art is in. */
      abandon();
      canvas.style.opacity = "0";
      stills = undefined;
      current = step.slug;
      plan = undefined;
      lit = [];
      shown = [];
      buildState = "loading";
      emit();
      const ready = prepared ? loadFiles(retry) : (preparing ??= prepare());
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
        /* A card not standing yet is not there to point at. */
        let node: Object3D | null = object;
        let shown = true;
        while (node && node.userData.slug === undefined) {
          shown &&= node.visible;
          node = node.parent;
        }
        if (node && shown) return node.userData.slug as PathStepSlug;
      }
      return null;
    },
    setFrame(frame) {
      stageFrame = frame;
      easeCamera(true);
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
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
      for (const texture of [...textures, ...cardTextures.values()]) {
        /* A decoded card is an ImageBitmap, which `dispose` leaves open. */
        const bitmap = texture.source.data as Partial<ImageBitmap> | null;
        bitmap?.close?.();
      }
      for (const texture of cardTextures.values()) texture.dispose();
      table.geometry.dispose();
      tableMaterial.dispose();
      sun.shadow.map?.dispose();
      renderer.dispose();
    },
  };
}
