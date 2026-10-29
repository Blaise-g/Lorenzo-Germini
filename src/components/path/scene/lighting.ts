import {
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  PointLight,
  PCFShadowMap,
  PMREMGenerator,
  Vector3,
  type Scene,
  type WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { BOARD } from "./board";
import type { Palette } from "./palette";

/* The board's light (v3; the benchmark's §4(c)): a soft sky over a
   terracotta ground, one sun with soft shadows, and a small room through
   PMREM for fill and the lacquer's highlights. Dark mode is night, not a
   darker print: the same board under a low moon and a cool sky, its windows
   lit (`paint.ts`) and carried by bloom (`post.ts`), and a lantern hung
   over the step in view so it keeps its colours. Both presets are mixed
   from the path tokens by one value, 0 day to 1 night, so a theme change
   crossfades the light with the paint. Tone mapping is the post chain's
   (AgX, `post.ts`): a composer draws into its own buffer, where the
   renderer's own tone mapping does not run. */

/** What the sun's shadow has to cover: a shot's focus, as a sphere. */
export type ShotFocus = Readonly<{ target: Vector3; radius: number }>;

/** The tallest anything stands on the board: the Mole's spire and the
 *  Bisalta's peaks, with the pawn's hop above a lifted tile. */
const TALLEST = 3.4;

/** The box the sun's shadow covers until a camera rig names its shot: the
 *  whole board, from the table under it to its tallest piece, at any yaw
 *  up to `maxTurn` radians either way, since the board turns under the
 *  light. The one function the rig's focus swaps for (`shadowBounds`). */
export function boardBounds(maxTurn = 0): Box3 {
  const cos = Math.cos(maxTurn);
  const sin = Math.abs(Math.sin(maxTurn));
  const x = BOARD.halfWidth * cos + BOARD.halfDepth * sin;
  const z = BOARD.halfWidth * sin + BOARD.halfDepth * cos;
  return new Box3(
    new Vector3(-x, -BOARD.thickness, -z),
    new Vector3(x, TALLEST, z),
  );
}

/** The box the shadow covers: the shot's focus when there is one, so a
 *  close-up gets the map's every texel, and the board otherwise. */
export function shadowBounds(focus?: ShotFocus, maxTurn = 0): Box3 {
  if (!focus) return boardBounds(maxTurn);
  return new Box3().setFromCenterAndSize(
    focus.target,
    new Vector3().setScalar(focus.radius * 2),
  );
}

/** The sun's shadow map, square. 2048 gives a close-up's contact shadows a
 *  texel to every few millimetres of board; its colour and depth cost
 *  33.6 MB of the raised GPU budget (`docs/path-measurements.md`). */
export const SHADOW_MAP = 2048;

/** Where the light comes from, as unit vectors toward it: the day's sun
 *  high over the camera's left shoulder, the moon low and behind on the
 *  right, so the night rakes and rims what the day lights flat. */
const SUN_FROM = new Vector3(-0.6, 0.62, 0.42).normalize();
const MOON_FROM = new Vector3(0.74, 0.34, -0.58).normalize();

export type LightPreset = {
  /** Toward the sun, unit length. */
  from: Vector3;
  sunColour: Color;
  sunIntensity: number;
  skyColour: Color;
  groundColour: Color;
  skyIntensity: number;
  environmentIntensity: number;
  /** How dark the sun's shadow is, 0 to 1. */
  shadowIntensity: number;
  /** The lantern over the shot's focus: lamplight, at night only. */
  lanternColour: Color;
  lanternIntensity: number;
};

/** The light at `night` (0 day, 1 night), mixed from the palette. Day: a
 *  warm sun at about 2.7 on a cream sky over a terracotta ground (§4(c)).
 *  Night: a cool, low moon, a slate sky and the room turned down, so the
 *  lit windows carry the scene. */
export function lightPreset(palette: Palette, night: number): LightPreset {
  const t = Math.min(Math.max(night, 0), 1);
  const white = new Color(1, 1, 1);
  const sunDay = palette.paper.clone().lerp(white, 0.55);
  const moon = palette["ink-cool"].clone().lerp(white, 0.45);
  const skyDay = palette.paper.clone().lerp(white, 0.3);
  const skyNight = palette["ink-cool"].clone().multiplyScalar(0.85);
  const groundDay = palette["ink-warm"].clone().lerp(palette.paper, 0.45);
  const groundNight = palette.fog.clone().lerp(palette["ink-cool"], 0.25);
  return {
    from: SUN_FROM.clone().lerp(MOON_FROM, t).normalize(),
    sunColour: sunDay.lerp(moon, t),
    sunIntensity: 2.7 + (0.85 - 2.7) * t,
    skyColour: skyDay.lerp(skyNight, t),
    groundColour: groundDay.lerp(groundNight, t),
    skyIntensity: 0.45 + (0.4 - 0.45) * t,
    environmentIntensity: 0.36 + (0.13 - 0.36) * t,
    shadowIntensity: 0.92 + (0.8 - 0.92) * t,
    lanternColour: palette["ink-sun"].clone().lerp(white, 0.55),
    lanternIntensity: LANTERN.intensity * t,
  };
}

/** The night's lantern: a warm lamp hung over the step the camera holds,
 *  so the pieces there read in their own colours, and the duo's faces
 *  with them, while the rest of the board stays moonlit. Present by day
 *  at no strength, so a theme change never recompiles a program. */
export const LANTERN = { intensity: 5, height: 2.4, reach: 3.2 } as const;

/** How far back the sun stands from the box it lights, past its corners. */
const SUN_STANDOFF = 4;

/** Lights `scene` for a board that turns up to `maxTurn` radians. */
export function createLighting(
  scene: Scene,
  renderer: WebGLRenderer,
  maxTurn: number,
) {
  renderer.shadowMap.enabled = true;
  /* r186 folded PCF-soft into PCF; `radius` softens its edge. */
  renderer.shadowMap.type = PCFShadowMap;

  /* The room is blurred at 128 (a 384×512 half-float map, 1.6 MB) and the
     generator freed at once, its ping-pong target with it: a rough board
     reads no detail in it. */
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 128 });
  pmrem.dispose();
  room.dispose();
  scene.environment = environment.texture;

  const sky = new HemisphereLight();
  const sun = new DirectionalLight();
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  const lantern = new PointLight();
  lantern.decay = 1.2;
  scene.add(sky, sun, sun.target, lantern);
  /** Hangs the lantern over a focus, or the board's middle, sized to it. */
  function hang(focus?: ShotFocus) {
    const radius = focus?.radius ?? BOARD.halfWidth;
    lantern.distance = Math.max(LANTERN.reach, radius * 1.6);
    lantern.position.set(0, LANTERN.height + radius * 0.25, 0);
    if (focus) lantern.position.add(focus.target);
  }
  hang();

  let from = SUN_FROM.clone();
  let bounds = shadowBounds(undefined, maxTurn);

  const corner = new Vector3();
  const centre = new Vector3();
  const lightSpace = new Box3();

  /** Points the sun at `bounds` from where it shines, and fits its shadow
   *  camera to the box's corners as the sun sees them. */
  function fit() {
    bounds.getCenter(centre);
    const reach = bounds.getSize(corner).length() / 2 + SUN_STANDOFF;
    sun.target.position.copy(centre);
    sun.position.copy(centre).addScaledVector(from, reach);
    sun.target.updateMatrixWorld();
    sun.updateMatrixWorld();
    const camera = sun.shadow.camera;
    camera.position.copy(sun.position);
    camera.lookAt(centre);
    camera.updateMatrixWorld();
    lightSpace.makeEmpty();
    for (let i = 0; i < 8; i++) {
      corner.set(
        i & 1 ? bounds.max.x : bounds.min.x,
        i & 2 ? bounds.max.y : bounds.min.y,
        i & 4 ? bounds.max.z : bounds.min.z,
      );
      lightSpace.expandByPoint(corner.applyMatrix4(camera.matrixWorldInverse));
    }
    camera.left = lightSpace.min.x;
    camera.right = lightSpace.max.x;
    camera.bottom = lightSpace.min.y;
    camera.top = lightSpace.max.y;
    /* The camera looks down -z: the box's near face is its largest z. */
    camera.near = Math.max(-lightSpace.max.z, 0.1);
    camera.far = -lightSpace.min.z;
    camera.updateProjectionMatrix();
  }
  fit();

  return {
    /** Lights the board as `night` says, from `palette`. */
    setMix(palette: Palette, night: number) {
      const preset = lightPreset(palette, night);
      sun.color.copy(preset.sunColour);
      sun.intensity = preset.sunIntensity;
      sun.shadow.intensity = preset.shadowIntensity;
      sky.color.copy(preset.skyColour);
      sky.groundColor.copy(preset.groundColour);
      sky.intensity = preset.skyIntensity;
      scene.environmentIntensity = preset.environmentIntensity;
      lantern.color.copy(preset.lanternColour);
      lantern.intensity = preset.lanternIntensity;
      if (!preset.from.equals(from)) {
        from = preset.from;
        fit();
      }
    },
    /** Fits the shadow to a shot's focus, or to the board with none. */
    setFocus(focus?: ShotFocus) {
      bounds = shadowBounds(focus, maxTurn);
      fit();
      hang(focus);
    },
    dispose() {
      environment.dispose();
      sun.shadow.dispose();
    },
  };
}
