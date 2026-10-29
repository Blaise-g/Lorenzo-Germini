import {
  Color,
  DataTexture,
  DoubleSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  RepeatWrapping,
  RGBAFormat,
  ShaderChunk,
  Vector2,
  Vector3,
  Vector4,
  type IUniform,
  type Material,
  type Texture,
  type WebGLProgramParametersWithUniforms,
} from "three";

import { GRADE_GLSL, inkGrade } from "./grade";
import type { Palette, PaletteRole } from "./palette";

/* The board's one material treatment (v3; the benchmark's §4(b) item 3):
   every surface is a `MeshStandardMaterial` at high roughness, for a toy,
   painted-wood and card finish, coloured from the path tokens as v2's ink
   was. A material names a tone, a palette role mixed toward another and
   shaded, so a theme change repaints every surface from one palette and the
   colours stay in `globals.css` (ADR-0008). */

/** A colour from the palette: `base`, mixed `amount` toward `toward`, then
 *  multiplied by `shade`. */
export type Tone = Readonly<{
  base: PaletteRole;
  toward?: PaletteRole;
  amount?: number;
  shade?: number;
}>;

/** The tones the board is painted in, by what they are. */
export const TONES = {
  paper: { base: "paper" },
  /** The board under the tiles: a green baize, so the cream tiles stand
   *  off it as a game's pieces stand off its cloth. */
  boardTop: { base: "felt" },
  /** The frame round it: a lacquered walnut, the terracotta taken deep. */
  frame: { base: "ink-warm", toward: "felt", amount: 0.18, shade: 0.42 },
  sun: { base: "ink-sun" },
  sunDeep: { base: "ink-sun", toward: "ink-warm", amount: 0.35, shade: 0.85 },
  warm: { base: "ink-warm" },
  warmLight: { base: "ink-warm", toward: "paper", amount: 0.45 },
  warmDeep: { base: "ink-warm", shade: 0.72 },
  cool: { base: "ink-cool" },
  coolLight: { base: "ink-cool", toward: "paper", amount: 0.5 },
  coolDeep: { base: "ink-cool", shade: 0.55 },
  /** Plaster and stone: paper leaning warm. */
  stone: { base: "paper", toward: "ink-warm", amount: 0.12 },
  /** Foliage: the felt's green, lifted toward the stock, a sage. */
  leaf: { base: "felt", toward: "paper", amount: 0.2 },
  leafDark: { base: "felt", toward: "ink-cool", amount: 0.3, shade: 0.7 },
  grass: { base: "felt", toward: "ink-sun", amount: 0.3, shade: 1.05 },
  water: { base: "ink-cool", toward: "paper", amount: 0.08, shade: 0.95 },
  /** Window glass, dark by day. */
  pane: { base: "ink-cool", shade: 0.55 },
  /** The light a lamp gives: the third ink, warmed toward the stock. */
  lamp: { base: "ink-sun", toward: "paper", amount: 0.3 },
} as const satisfies Record<string, Tone>;

export type ToneName = keyof typeof TONES;

/** Mixes a tone from a palette. */
export function toneColour(palette: Palette, tone: Tone, out = new Color()) {
  out.copy(palette[tone.base]);
  if (tone.toward) out.lerp(palette[tone.toward], tone.amount ?? 0.5);
  if (tone.shade !== undefined) out.multiplyScalar(tone.shade);
  return out;
}

export type MaterialOptions = {
  roughness?: number;
  metalness?: number;
  flat?: boolean;
  /** Glows in its own tone at this strength, for screens and lit glass. */
  glow?: number;
  /** Glows this much more at night: in its own tone if it glows by day
   *  too, in lamplight if not. */
  lamp?: number;
  /** Takes the card-grain bump map, once loaded, and a mottled roughness. */
  grain?: boolean;
  /** Takes the felt's nap as a normal map. */
  felt?: boolean;
  doubleSided?: boolean;
  /** Sways on the wind, as a tree's crown does: for instanced crowns. */
  sway?: boolean;
};

/* ─── Shader patches ─── */

/** One change to a material's shader, and the name its programs share. */
export type ShaderPatch = Readonly<{
  key: string;
  apply(shader: WebGLProgramParametersWithUniforms): void;
}>;

/** `source` with `add` after `anchor`, or in its place with `replace`;
 *  throws when the anchor is not there, so a three.js upgrade that moves a
 *  chunk fails loudly rather than drawing the board unpatched. */
export function inject(
  source: string,
  anchor: string,
  add: string,
  replace = false,
): string {
  if (!source.includes(anchor)) {
    throw new Error(`Shader patch: no ${anchor.trim().slice(0, 60)}`);
  }
  return source.replace(anchor, replace ? add : `${anchor}\n${add}`);
}

/** Applies `patches` in order, and keys the program by them, so materials
 *  patched alike share one program. */
export function patchMaterial(
  material: Material,
  patches: readonly ShaderPatch[],
) {
  material.onBeforeCompile = (shader) => {
    for (const each of patches) each.apply(shader);
  };
  const key = patches.map((each) => each.key).join("+");
  material.customProgramCacheKey = () => key;
}

/** The anchor, in the directional lights' loop, where a sun's light is
 *  known and its shadow not yet applied. */
export const SUN_ANCHOR =
  "getDirectionalLightInfo( directionalLight, directLight );";
/** The anchor where an instanced vertex has its instance's transform and
 *  not yet the camera's. */
export const VIEW_ANCHOR = "mvPosition = modelViewMatrix * mvPosition;";

/** How much board one tile of the cloud cookie covers, in scene units. */
export const CLOUD_TILE = 15;
/** The wind the clouds drift on, in scene units a second. */
export const CLOUD_WIND = [0.34, 0.13] as const;
/** How much a cloud's shadow takes from the sun, by day and by night. */
export const CLOUD_SHADE = { day: 0.34, night: 0.18 } as const;

/** A tileable value noise, `size` square, summed over octaves of
 *  `[cells, weight]`: each octave a lattice of `cells` across. */
function valueNoise(
  size: number,
  octaves: readonly (readonly [number, number])[],
  seed: number,
): Float32Array {
  const height = new Float32Array(size * size);
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  for (const [cells, weight] of octaves) {
    const lattice = Array.from({ length: cells * cells }, random);
    const at = (x: number, y: number) =>
      lattice[((y + cells) % cells) * cells + ((x + cells) % cells)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells;
        const fy = (y / size) * cells;
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const sx = (fx - ix) ** 2 * (3 - 2 * (fx - ix));
        const sy = (fy - iy) ** 2 * (3 - 2 * (fy - iy));
        const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
        const bottom =
          at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
        height[y * size + x] += (top + (bottom - top) * sy) * weight;
      }
    }
  }
  return height;
}

/** A tiling, mipmapped RGBA texture from bytes. Made in code, so it costs
 *  no request. */
function dataTexture(data: Uint8Array, size: number): DataTexture {
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** A height field's slopes as a tangent-space normal map, `strength`
 *  steep. */
function normalsOf(height: Float32Array, size: number, strength: number) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = (dx: number, dy: number) =>
        height[((y + dy + size) % size) * size + ((x + dx + size) % size)];
      const nx = (h(-1, 0) - h(1, 0)) * strength;
      const ny = (h(0, -1) - h(0, 1)) * strength;
      const length = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      data[i] = ((nx / length) * 0.5 + 0.5) * 255;
      data[i + 1] = ((ny / length) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / length) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  return dataTexture(data, size);
}

/** The water's normals: two octaves of slow swell. */
function waterNormals() {
  const size = 64;
  return normalsOf(
    valueNoise(
      size,
      [
        [8, 0.65],
        [16, 0.35],
      ],
      7,
    ),
    size,
    3,
  );
}

/** The felt's nap: fine fibres over a soft unevenness, so a low sun rakes
 *  across it. */
function feltNormals() {
  const size = 128;
  return normalsOf(
    valueNoise(
      size,
      [
        [8, 0.2],
        [32, 0.35],
        [64, 0.45],
      ],
      29,
    ),
    size,
    2.2,
  );
}

/** A mottled roughness, read from green: patches 0.78–1 of a material's
 *  own, so the sheen breaks up across a surface rather than lying even. */
function roughnessMottle() {
  const size = 64;
  const height = valueNoise(
    size,
    [
      [4, 0.6],
      [12, 0.4],
    ],
    61,
  );
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const value = (0.78 + 0.22 * height[i]) * 255;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
  return dataTexture(data, size);
}

/** The cloud cookie: soft, tileable blobs, read from red. Its shadow is
 *  where it runs past about half. */
function cloudCookie() {
  const size = 96;
  const height = valueNoise(
    size,
    [
      [3, 0.55],
      [6, 0.3],
      [12, 0.15],
    ],
    83,
  );
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = Math.round(height[i] * 255);
    data[i * 4 + 3] = 255;
  }
  return dataTexture(data, size);
}

/** How much board one tile of the grain covers, in scene units. */
const GRAIN_TILE = 1.6;
/** How deep the grain reads: a light tooth, not a texture. */
const GRAIN_BUMP = 0.6;
/** How much board one tile of the felt's nap covers, and how deep it is. */
const FELT_TILE = 1.1;
const FELT_DEPTH = 0.55;
/** How much board one tile of the mottle covers. */
const MOTTLE_TILE = 5;

/** Every material the board makes, repainted together. */
export function createPaint(palette: Palette) {
  const painted = new Map<MeshStandardMaterial, Tone>();
  const grained = new Set<MeshStandardMaterial>();
  const time: IUniform<number> = { value: 0 };
  /** The water's own clock: it runs faster in a surge. */
  const waterTime: IUniform<number> = { value: 0 };
  const foam: IUniform<Color> = { value: new Color() };
  const lampColour: IUniform<Color> = { value: new Color() };
  const cookie = cloudCookie();
  /** The cookie's offset, its scale, and the shade it casts. */
  const cloudAt: IUniform<Vector4> = {
    value: new Vector4(0, 0, 1 / CLOUD_TILE, CLOUD_SHADE.day),
  };
  const cloudMap: IUniform<Texture> = { value: cookie };
  const inkShadow: IUniform<Color> = { value: new Color() };
  const inkMid: IUniform<Color> = { value: new Color() };
  const inkLight: IUniform<Color> = { value: new Color() };
  /** The grade's amount and lift. */
  const inkAmount: IUniform<Vector2> = { value: new Vector2() };
  /** Where water runs the pipe loop on a beat, 0 to 1 along it; -1 for
   *  none. */
  const pipeBeat: IUniform<number> = { value: -1 };
  /** The water's surge and calm, 0 to 1 (`beats.ts`). */
  const water$ = { surge: 0, calm: 0 };
  let grain: Texture | null = null;
  let current = palette;
  const normals = waterNormals();
  normals.repeat.set(0.7, 0.7);
  const nap = feltNormals();
  nap.repeat.set(1 / FELT_TILE, 1 / FELT_TILE);
  const mottle = roughnessMottle();
  mottle.repeat.set(1 / MOTTLE_TILE, 1 / MOTTLE_TILE);
  /** How far into night the board is, 0 to 1: lamps glow by it. */
  let night = 0;
  /** Each material that glows, its strength by day and its extra by
   *  night, and the tone it glows in. */
  const glowing = new Map<
    MeshStandardMaterial,
    { day: number; night: number; tone: Tone }
  >();

  /** Extra glow a beat lends a material, by material. */
  const boosts = new Map<MeshStandardMaterial, number>();

  function glowOf(made: MeshStandardMaterial) {
    const glow = glowing.get(made);
    if (!glow) return;
    made.emissiveIntensity =
      glow.day + glow.night * night + (boosts.get(made) ?? 0);
    toneColour(current, glow.tone, made.emissive);
  }

  /* Cloud shadows (§4(d)): a cookie scrolled across the board in world
     space and multiplied into the sun's light, so the shade passes over
     tiles, pieces and pawn alike. */
  const clouds: ShaderPatch = {
    key: "clouds",
    apply(shader) {
      shader.uniforms.uCloud = cloudMap;
      shader.uniforms.uCloudAt = cloudAt;
      shader.vertexShader = inject(
        inject(
          shader.vertexShader,
          "#include <common>",
          "varying vec2 vCloudXZ;",
        ),
        "#include <project_vertex>",
        /* glsl */ `{
          vec4 cloudWorld = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            cloudWorld = instanceMatrix * cloudWorld;
          #endif
          vCloudXZ = ( modelMatrix * cloudWorld ).xz;
        }`,
      );
      shader.fragmentShader = inject(
        inject(
          shader.fragmentShader,
          "#include <common>",
          /* glsl */ `varying vec2 vCloudXZ;
          uniform sampler2D uCloud;
          uniform vec4 uCloudAt;
          float pathCloud() {
            float cover = texture2D( uCloud, ( vCloudXZ + uCloudAt.xy ) * uCloudAt.z ).r;
            return 1.0 - uCloudAt.w * smoothstep( 0.46, 0.68, cover );
          }`,
        ),
        "#include <lights_fragment_begin>",
        inject(
          ShaderChunk.lights_fragment_begin,
          SUN_ANCHOR,
          "directLight.color *= pathCloud();",
        ),
        true,
      );
    },
  };

  /* A crown sways on the wind, about a degree, and breathes half a percent,
     each tree on its own phase (§4(d)). */
  const sway: ShaderPatch = {
    key: "sway",
    apply(shader) {
      shader.uniforms.uTime = time;
      shader.vertexShader = inject(
        inject(
          shader.vertexShader,
          "#include <common>",
          "uniform float uTime;",
        ),
        "#include <project_vertex>",
        inject(
          ShaderChunk.project_vertex,
          VIEW_ANCHOR,
          /* glsl */ `#ifdef USE_INSTANCING
            vec3 swayRoot = instanceMatrix[3].xyz;
            float swayPhase = swayRoot.x * 2.1 + swayRoot.z * 1.7;
            float swayRise = max( mvPosition.y, 0.0 );
            mvPosition.x += sin( uTime * 0.9 + swayPhase ) * 0.0175 * swayRise;
            mvPosition.z += sin( uTime * 0.7 + swayPhase * 1.3 ) * 0.009 * swayRise;
            mvPosition.xyz = swayRoot + ( mvPosition.xyz - swayRoot ) * ( 1.0 + 0.005 * sin( uTime * 0.45 + swayPhase ) );
          #endif
          ${VIEW_ANCHOR}`,
          true,
        ),
        true,
      );
    },
  };

  function material(tone: Tone, options: MaterialOptions = {}) {
    const made = new MeshStandardMaterial({
      roughness: options.roughness ?? 0.82,
      metalness: options.metalness ?? 0,
      flatShading: options.flat ?? false,
    });
    if (options.doubleSided) made.side = DoubleSide;
    made.color = toneColour(current, tone);
    if (options.glow || options.lamp) {
      glowing.set(made, {
        day: options.glow ?? 0,
        night: options.lamp ?? 0,
        tone: options.glow ? tone : TONES.lamp,
      });
      glowOf(made);
    }
    painted.set(made, tone);
    if (options.grain) {
      made.roughnessMap = mottle;
      grained.add(made);
      if (grain) applyGrain(made);
    }
    if (options.felt) {
      made.normalMap = nap;
      made.normalScale.set(FELT_DEPTH, FELT_DEPTH);
      made.roughnessMap = mottle;
    }
    patchMaterial(made, options.sway ? [clouds, sway] : [clouds]);
    return made;
  }

  const cache = new Map<string, MeshStandardMaterial>();
  /** One shared material per tone and finish. */
  function shared(name: ToneName, options: MaterialOptions = {}) {
    /* Only the options set count, so `{ grain: false }` and `{}` share. */
    const set = Object.entries(options).filter(
      ([, value]) => value !== undefined && value !== false,
    );
    const key = `${name}:${JSON.stringify(Object.fromEntries(set))}`;
    let made = cache.get(key);
    if (!made) {
      made = material(TONES[name], options);
      cache.set(key, made);
    }
    return made;
  }

  function applyGrain(made: MeshStandardMaterial) {
    made.bumpMap = grain;
    made.bumpScale = GRAIN_BUMP;
    made.needsUpdate = true;
  }

  /* Water: a calm surface whose normals scroll, with a pale foam line where
     it meets its banks. A river's or the lake's UVs run 0–1 across it, so the
     foam follows the banks however the water is shaped. The foam is mixed
     into the surface's colour before it is lit, so it is lit, tone-mapped
     and encoded as the paper is. */
  const water = material(TONES.water, { roughness: 0.28 });
  water.normalMap = normals;
  water.normalScale.set(0.35, 0.35);
  patchMaterial(water, [
    clouds,
    {
      key: "water",
      apply(shader) {
        shader.uniforms.uTime = waterTime;
        shader.uniforms.uFoam = foam;
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec2 vWaterUv;",
          )
          .replace(
            "#include <uv_vertex>",
            "#include <uv_vertex>\nvWaterUv = uv;",
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec2 vWaterUv;\nuniform float uTime;\nuniform vec3 uFoam;",
          )
          .replace(
            "#include <color_fragment>",
            /* glsl */ `#include <color_fragment>
        float bank = min( min( vWaterUv.y, 1.0 - vWaterUv.y ), min( vWaterUv.x, 1.0 - vWaterUv.x ) * 3.0 );
        float ripple = 0.5 + 0.5 * sin( vWaterUv.x * 40.0 + uTime * 1.6 + sin( vWaterUv.y * 9.0 ) * 2.0 );
        float foamLine = 1.0 - smoothstep( 0.04, 0.12 + 0.05 * ripple, bank );
        diffuseColor.rgb = mix( diffuseColor.rgb, uFoam, foamLine * 0.75 );`,
          );
      },
    },
  ]);

  /* Grass: blades that sway on a wind from their tips, each tuft on its own
     phase from where it stands. */
  /** A field of grass, growing out from `grow`'s point (x, z in its tile's
   *  frame) as far as its radius (z): igloo's materialise (§4(d)). */
  function makeGrass(grow: IUniform<Vector3>) {
    const made = material(TONES.grass, { doubleSided: true, roughness: 0.9 });
    patchMaterial(made, [
      clouds,
      {
        key: "grass",
        apply(shader) {
          shader.uniforms.uTime = time;
          shader.uniforms.uGrow = grow;
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              "#include <common>\nuniform float uTime;",
            )
            .replace(
              "#include <begin_vertex>",
              /* glsl */ `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 rooted = instanceMatrix[3].xz;
        #else
          vec2 rooted = vec2( 0.0 );
        #endif
        float gust = sin( uTime * 1.3 + rooted.x * 0.9 + rooted.y * 0.6 )
          + 0.4 * sin( uTime * 2.9 + rooted.x * 2.3 );
        transformed.x += gust * 0.05 * position.y * position.y * 6.0;
        transformed.z += gust * 0.025 * position.y * position.y * 6.0;
        float growEdge = uGrow.z - distance( rooted, uGrow.xy )
          + 0.22 * sin( rooted.x * 5.3 ) * cos( rooted.y * 4.1 );
        transformed *= smoothstep( 0.0, 0.55, growEdge );`,
            )
            .replace(
              "#include <common>",
              "#include <common>\nuniform vec3 uGrow;",
            );
        },
      },
    ]);
    return made;
  }
  /** The board's own grass, between the tiles: always grown. */
  const grass = makeGrass({ value: new Vector3(0, 0, 1e4) });

  /* The pipe loop's flow: by night, a pulse of lamplight runs along the
     tube, its UVs' u running the pipe's length. */
  const pipeFlow = material(TONES.warm, { roughness: 0.5, lamp: 1.8 });
  patchMaterial(pipeFlow, [
    clouds,
    {
      key: "flow",
      apply(shader) {
        shader.uniforms.uTime = time;
        shader.uniforms.uPipeBeat = pipeBeat;
        shader.uniforms.uLamp = lampColour;
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec2 vFlowUv;",
          )
          .replace(
            "#include <uv_vertex>",
            "#include <uv_vertex>\nvFlowUv = uv;",
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec2 vFlowUv;\nuniform float uTime;\nuniform float uPipeBeat;\nuniform vec3 uLamp;",
          )
          .replace(
            "#include <emissivemap_fragment>",
            /* glsl */ `#include <emissivemap_fragment>
        float pulse = pow( 0.5 + 0.5 * sin( ( vFlowUv.x * 5.0 - uTime * 0.35 ) * 6.2831853 ), 6.0 );
        totalEmissiveRadiance *= 0.15 + 0.85 * pulse;
        if ( uPipeBeat >= 0.0 ) {
          float slug = vFlowUv.x - uPipeBeat;
          totalEmissiveRadiance += uLamp * 2.4 * exp( -slug * slug * 160.0 );
        }`,
          );
      },
    },
  ]);

  /* Window glass: most panes lit by night, a few left dark, as a building
     at night has them. */
  const lit = material(TONES.pane, { roughness: 0.22, lamp: 3.2 });
  const unlit = material(TONES.pane, { roughness: 0.22 });

  /** Each generated landmark's material, graded, with how lit its beat has
   *  it, 0 to 1. */
  const graded = new Map<MeshStandardMaterial, IUniform<number>>();
  function gradeUniforms() {
    const grade = inkGrade(current, night);
    inkShadow.value.copy(grade.shadow);
    inkMid.value.copy(grade.mid);
    inkLight.value.copy(grade.light);
    inkAmount.value.set(grade.amount, grade.lift);
    toneColour(current, TONES.lamp, lampColour.value);
    cloudAt.value.w =
      CLOUD_SHADE.day + (CLOUD_SHADE.night - CLOUD_SHADE.day) * night;
  }
  gradeUniforms();

  return {
    material,
    shared,
    water,
    grass,
    /** The pipe loop's tube, its flow lit by night. */
    pipeFlow,
    /** Window glass, by turns: two lit at night to one dark. */
    panes: [lit, lit, unlit] as const,
    /** Seconds of motion so far; the water and the grass read it. */
    time,
    /** Where a beat's water runs the pipe loop (`pipeFlow`), 0 to 1; -1
     *  for none. */
    pipeBeat,
    /** The lamps' colour in the current mode, for light drawn outside the
     *  board's materials. */
    lampColour,
    /** A tile's own grass, grown out from `grow` (x, z in the tile's
     *  frame, radius). */
    tileGrass: makeGrass,
    /** Grades a generated landmark's material (`grade.ts`) and gives its
     *  clouds, once however many copies stand; returns how lit it is, for
     *  its beat to set. */
    landmark(made: MeshStandardMaterial): IUniform<number> {
      let lit = graded.get(made);
      if (lit) return lit;
      const uniform: IUniform<number> = { value: 0 };
      lit = uniform;
      graded.set(made, uniform);
      made.userData.inkLit = uniform;
      patchMaterial(made, [
        clouds,
        {
          key: "ink-grade",
          apply(shader) {
            Object.assign(shader.uniforms, {
              uInkShadow: inkShadow,
              uInkMid: inkMid,
              uInkLight: inkLight,
              uInkGrade: inkAmount,
              uLamp: lampColour,
              uLit: uniform,
            });
            shader.fragmentShader = inject(
              inject(
                inject(
                  shader.fragmentShader,
                  "#include <common>",
                  "uniform vec3 uInkShadow;\nuniform vec3 uInkMid;\nuniform vec3 uInkLight;\nuniform vec2 uInkGrade;\nuniform vec3 uLamp;\nuniform float uLit;",
                ),
                "#include <map_fragment>",
                GRADE_GLSL,
              ),
              "#include <emissivemap_fragment>",
              /* A building's lights warming on: lamplight, strongest where
                 its texture is light. */
              "totalEmissiveRadiance += uLamp * uLit * inkLum * inkLum;",
            );
          },
        },
      ]);
      made.needsUpdate = true;
      return uniform;
    },
    /** Lends `made` `amount` more glow, in lamplight if it has no glow of
     *  its own; 0 takes it back. */
    boost(made: MeshStandardMaterial, amount: number) {
      if (!glowing.has(made)) {
        glowing.set(made, { day: 0, night: 0, tone: TONES.lamp });
      }
      if (amount === 0) boosts.delete(made);
      else boosts.set(made, amount);
      glowOf(made);
    },
    /** Runs the water fast (`surge`) or stills it (`calm`), 0 to 1 each. */
    setWater(surge: number, calm: number) {
      water$.surge = surge;
      water$.calm = calm;
      water.normalScale.setScalar(0.35 * (1 - 0.85 * calm));
      water.roughness = 0.28 - 0.16 * calm;
    },
    /** Paints every material from `palette`. */
    repaint(next: Palette) {
      current = next;
      for (const [made, tone] of painted) {
        toneColour(next, tone, made.color);
        glowOf(made);
      }
      foam.value.copy(next.paper);
      gradeUniforms();
    },
    /** Lights the lamps `amount` of the way into night. */
    setNight(amount: number) {
      night = Math.min(Math.max(amount, 0), 1);
      for (const made of glowing.keys()) glowOf(made);
      gradeUniforms();
    },
    /** Moves the board's life on by `seconds`: the water, the grass and the
     *  trees, and the clouds' shadows. */
    flow(seconds: number) {
      time.value += seconds;
      waterTime.value += seconds * (1 + 3 * water$.surge);
      normals.offset.set(waterTime.value * 0.018, waterTime.value * 0.011);
      cloudAt.value.x -= seconds * CLOUD_WIND[0];
      cloudAt.value.y -= seconds * CLOUD_WIND[1];
    },
    /** The card-grain bump map, for the tiles and the board, once loaded. */
    setGrain(texture: Texture) {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.repeat.set(1 / GRAIN_TILE, 1 / GRAIN_TILE);
      grain = texture;
      for (const made of grained) applyGrain(made);
    },
    dispose() {
      for (const made of painted.keys()) made.dispose();
      normals.dispose();
      nap.dispose();
      mottle.dispose();
      cookie.dispose();
      grain?.dispose();
    },
  };
}

export type Paint = ReturnType<typeof createPaint>;
