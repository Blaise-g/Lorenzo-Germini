import {
  Color,
  DataTexture,
  DoubleSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  RepeatWrapping,
  RGBAFormat,
  type IUniform,
  type Texture,
} from "three";

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
  /** The board under the tiles: kraft board, a shade under the stock, so
   *  the tiles stand off it. */
  boardTop: { base: "paper", toward: "ink-warm", amount: 0.2, shade: 0.9 },
  frame: { base: "ink-cool", shade: 0.7 },
  warm: { base: "ink-warm" },
  warmLight: { base: "ink-warm", toward: "paper", amount: 0.45 },
  warmDeep: { base: "ink-warm", shade: 0.72 },
  cool: { base: "ink-cool" },
  coolLight: { base: "ink-cool", toward: "paper", amount: 0.5 },
  coolDeep: { base: "ink-cool", shade: 0.55 },
  /** Plaster and stone: paper leaning warm. */
  stone: { base: "paper", toward: "ink-warm", amount: 0.12 },
  /** Foliage: slate leaning to the stock, a sage. */
  leaf: { base: "ink-cool", toward: "paper", amount: 0.12, shade: 0.88 },
  leafDark: { base: "ink-cool", shade: 0.55 },
  grass: { base: "ink-cool", toward: "paper", amount: 0.42, shade: 0.88 },
  water: { base: "ink-cool", toward: "paper", amount: 0.08, shade: 0.95 },
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
  /** Takes the card-grain bump map, once loaded. */
  grain?: boolean;
  doubleSided?: boolean;
};

/** A tileable noise, as a normal map for the water: two octaves of value
 *  noise turned into slopes. Made in code, so it costs no request. */
function waterNormals(size = 64): DataTexture {
  const height = new Float32Array(size * size);
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (const [cells, weight] of [
    [8, 0.65],
    [16, 0.35],
  ] as const) {
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
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = (dx: number, dy: number) =>
        height[((y + dy + size) % size) * size + ((x + dx + size) % size)];
      const nx = (h(-1, 0) - h(1, 0)) * 3;
      const ny = (h(0, -1) - h(0, 1)) * 3;
      const length = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      data[i] = ((nx / length) * 0.5 + 0.5) * 255;
      data[i + 1] = ((ny / length) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / length) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** How much board one tile of the grain covers, in scene units. */
const GRAIN_TILE = 1.6;
/** How deep the grain reads: a light tooth, not a texture. */
const GRAIN_BUMP = 0.6;

/** Every material the board makes, repainted together. */
export function createPaint(palette: Palette) {
  const painted = new Map<MeshStandardMaterial, Tone>();
  const grained = new Set<MeshStandardMaterial>();
  const time: IUniform<number> = { value: 0 };
  const foam: IUniform<Color> = { value: new Color() };
  let grain: Texture | null = null;
  let current = palette;
  const normals = waterNormals();
  normals.repeat.set(0.7, 0.7);

  function material(tone: Tone, options: MaterialOptions = {}) {
    const made = new MeshStandardMaterial({
      roughness: options.roughness ?? 0.82,
      metalness: options.metalness ?? 0,
      flatShading: options.flat ?? false,
    });
    if (options.doubleSided) made.side = DoubleSide;
    made.color = toneColour(current, tone);
    if (options.glow) {
      made.emissiveIntensity = options.glow;
      made.userData.glow = true;
      toneColour(current, tone, made.emissive);
    }
    painted.set(made, tone);
    if (options.grain) {
      grained.add(made);
      if (grain) applyGrain(made);
    }
    return made;
  }

  const cache = new Map<string, MeshStandardMaterial>();
  /** One shared material per tone and finish. */
  function shared(name: ToneName, options: MaterialOptions = {}) {
    const key = `${name}:${JSON.stringify(options)}`;
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
     foam follows the banks however the water is shaped. */
  const water = material(TONES.water, { roughness: 0.28 });
  water.normalMap = normals;
  water.normalScale.set(0.35, 0.35);
  water.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uFoam = foam;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vWaterUv;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvWaterUv = uv;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vWaterUv;\nuniform float uTime;\nuniform vec3 uFoam;",
      )
      .replace(
        "#include <dithering_fragment>",
        /* glsl */ `
        float bank = min( min( vWaterUv.y, 1.0 - vWaterUv.y ), min( vWaterUv.x, 1.0 - vWaterUv.x ) * 3.0 );
        float ripple = 0.5 + 0.5 * sin( vWaterUv.x * 40.0 + uTime * 1.6 + sin( vWaterUv.y * 9.0 ) * 2.0 );
        float foamLine = 1.0 - smoothstep( 0.04, 0.12 + 0.05 * ripple, bank );
        gl_FragColor.rgb = mix( gl_FragColor.rgb, uFoam, foamLine * 0.75 );
        #include <dithering_fragment>`,
      );
  };
  water.customProgramCacheKey = () => "path-water";

  /* Grass: blades that sway on a wind from their tips, each tuft on its own
     phase from where it stands. */
  const grass = material(TONES.grass, { doubleSided: true, roughness: 0.9 });
  grass.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
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
        transformed.z += gust * 0.025 * position.y * position.y * 6.0;`,
      );
  };
  grass.customProgramCacheKey = () => "path-grass";

  return {
    material,
    shared,
    water,
    grass,
    /** Seconds of motion so far; the water and the grass read it. */
    time,
    /** Paints every material from `palette`. */
    repaint(next: Palette) {
      current = next;
      for (const [made, tone] of painted) {
        toneColour(next, tone, made.color);
        if (made.userData.glow) toneColour(next, tone, made.emissive);
      }
      foam.value.copy(next.paper);
    },
    /** Moves the water on by `seconds`. */
    flow(seconds: number) {
      time.value += seconds;
      normals.offset.set(time.value * 0.018, time.value * 0.011);
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
      grain?.dispose();
    },
  };
}

export type Paint = ReturnType<typeof createPaint>;
