import {
  Color,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshDepthMaterial,
  MeshLambertMaterial,
  RGBADepthPacking,
  RGBAFormat,
  Texture,
  Vector2,
  type IUniform,
} from "three";

/* The board's one surface: printed card stock (comp B, "Risograph Pop-up").
   Every texture on the board is an ink separation, not a picture: R is the
   terracotta ink's coverage, G the slate blue's, A the die-cut mask, B
   unused (`card-art.ts`). This material colours the stock and the two inks
   from the path tokens, so one texture serves light and dark, and adds what
   a print has: paper grain and each ink a hair off register. */

/** The colours every ink surface shares; the runtime repaints them on a
 *  theme change and every material follows. */
export type InkColours = {
  paper: IUniform<Color>;
  ink1: IUniform<Color>;
  ink2: IUniform<Color>;
};

export type InkOptions = {
  /** Draws the card's cut edge rather than its face: bare stock, a shade
   *  darker, with the same die-cut mask. */
  edge?: boolean;
  /** How strongly the inks print, 1 full; below 1 a faded print, as the
   *  dimmed MVP window is. */
  inkStrength?: number;
  /** Seeds the misregistration, so each card is off in its own way. */
  seed?: string;
  /** The surface's size in scene units, so the grain is the same size on a
   *  tree as on a tile. */
  size?: readonly [number, number];
};

/** How far each ink drifts off register, in scene units. */
const MISREGISTRATION = 0.012;

function hash(text: string) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) / 4294967295;
}

function offset(seed: number, size: readonly [number, number]) {
  const angle = seed * Math.PI * 2;
  return new Vector2(
    (Math.cos(angle) * MISREGISTRATION) / size[0],
    (Math.sin(angle) * MISREGISTRATION) / size[1],
  );
}

const INK_FRAGMENT = /* glsl */ `
  vec4 cut = texture2D( map, vMapUv );
  float inkA = texture2D( map, vMapUv + uMisA ).r * uInkStrength;
  float inkB = texture2D( map, vMapUv + uMisB ).g * uInkStrength;
  /* Two inks over the stock, each multiplied in as a riso drum lays it:
     where they overlap the colours mix rather than one hiding the other.
     A light ink on dark stock lightens it the same way. */
  vec3 paper = uPaper;
  vec3 colour = paper;
  colour *= mix( vec3( 1.0 ), uInk1 / max( paper, vec3( 0.001 ) ), inkA );
  colour *= mix( vec3( 1.0 ), uInk2 / max( paper, vec3( 0.001 ) ), inkB );
  colour = mix( colour, paper * 0.86, uEdge );
  /* The stock's grain: two octaves of value noise, fixed to the surface. */
  vec2 grainUv = vMapUv * uGrainScale;
  float grain = inkNoise( grainUv ) * 0.6 + inkNoise( grainUv * 2.7 ) * 0.4;
  colour *= 1.0 + ( grain - 0.5 ) * 0.07;
  diffuseColor = vec4( colour, cut.a );
  /* A card fading in is dithered, not blended, so the board needs no
     sorting and its shadows stay crisp. */
  if ( uOpacity < 1.0 && inkHash( floor( gl_FragCoord.xy ) ) > uOpacity ) discard;
`;

const INK_HEADER = /* glsl */ `
  uniform vec3 uPaper;
  uniform vec3 uInk1;
  uniform vec3 uInk2;
  uniform vec2 uMisA;
  uniform vec2 uMisB;
  uniform vec2 uGrainScale;
  uniform float uInkStrength;
  uniform float uEdge;
  uniform float uOpacity;
  float inkHash( vec2 p ) {
    return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
  }
  float inkNoise( vec2 p ) {
    vec2 i = floor( p );
    vec2 f = fract( p );
    vec2 u = f * f * ( 3.0 - 2.0 * f );
    return mix(
      mix( inkHash( i ), inkHash( i + vec2( 1.0, 0.0 ) ), u.x ),
      mix( inkHash( i + vec2( 0.0, 1.0 ) ), inkHash( i + vec2( 1.0, 1.0 ) ), u.x ),
      u.y
    );
  }
`;

export type InkMaterial = MeshLambertMaterial & {
  userData: { opacity: IUniform<number> };
};

/** A printed surface showing `texture`, an ink separation. Lit like paper
 *  (Lambert), cut out by the texture's alpha, and casting a shadow of its
 *  cut shape through `depthMaterial`. */
export function inkMaterial(
  texture: Texture,
  colours: InkColours,
  options: InkOptions = {},
): { material: InkMaterial; depthMaterial: MeshDepthMaterial } {
  const size = options.size ?? [1, 1];
  const seed = hash(options.seed ?? "");
  const opacity: IUniform<number> = { value: 1 };
  const material = new MeshLambertMaterial({
    map: texture,
    alphaTest: 0.5,
  }) as InkMaterial;
  material.userData.opacity = opacity;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uPaper: colours.paper,
      uInk1: colours.ink1,
      uInk2: colours.ink2,
      uMisA: { value: offset(seed, size) },
      uMisB: { value: offset(seed + 0.5, size) },
      uGrainScale: { value: new Vector2(size[0] * 70, size[1] * 70) },
      uInkStrength: { value: options.inkStrength ?? 1 },
      uEdge: { value: options.edge ? 1 : 0 },
      uOpacity: opacity,
    });
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${INK_HEADER}`)
      .replace("#include <map_fragment>", INK_FRAGMENT);
  };
  const depthMaterial = new MeshDepthMaterial({
    depthPacking: RGBADepthPacking,
    map: texture,
    alphaTest: 0.5,
  });
  return { material, depthMaterial };
}

/* ─── Ink separations drawn in code ─── */

/** The three plates a separation is drawn on, each in white on black:
 *  terracotta coverage, slate-blue coverage, and the die-cut mask. */
export type InkPlates = {
  ink1: CanvasRenderingContext2D;
  ink2: CanvasRenderingContext2D;
  cut: CanvasRenderingContext2D;
  width: number;
  height: number;
};

function plate(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#fff";
  context.strokeStyle = "#fff";
  return context;
}

/** A separation drawn on three canvases, merged into one texture in the
 *  card format: tile tops, the board's own labels, the pawn. */
export function drawnInk(
  width: number,
  height: number,
  draw: (plates: InkPlates) => void,
): DataTexture {
  const plates: InkPlates = {
    ink1: plate(width, height),
    ink2: plate(width, height),
    cut: plate(width, height),
    width,
    height,
  };
  draw(plates);
  const read = (context: CanvasRenderingContext2D) =>
    context.getImageData(0, 0, width, height).data;
  const [a, b, cut] = [plates.ink1, plates.ink2, plates.cut].map(read);
  const data = new Uint8Array(width * height * 4);
  /* A canvas's first row is its top; a texture's is its bottom. */
  for (let y = 0; y < height; y++) {
    const from = y * width * 4;
    const to = (height - 1 - y) * width * 4;
    for (let x = 0; x < width * 4; x += 4) {
      data[to + x] = a[from + x];
      data[to + x + 1] = b[from + x];
      data[to + x + 3] = cut[from + x];
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** The longest side a card's texture is uploaded at: a card on the board is
 *  at most a few hundred pixels tall, and every texel costs GPU memory
 *  (`docs/path-measurements.md`). */
export const CARD_TEXTURE_MAX = 384;

/** A card's separation, fetched and decoded at no more than
 *  `CARD_TEXTURE_MAX` on its long side. Its channels are data, so nothing
 *  is premultiplied or colour-converted on the way in. */
export async function loadInk(url: string): Promise<Texture> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const blob = await response.blob();
  const probe = await createImageBitmap(blob);
  const { width, height } = probe;
  probe.close();
  const scale = Math.min(1, CARD_TEXTURE_MAX / Math.max(width, height));
  const bitmap = await createImageBitmap(blob, {
    premultiplyAlpha: "none",
    colorSpaceConversion: "none",
    imageOrientation: "flipY",
    resizeWidth: Math.max(1, Math.round(width * scale)),
    resizeHeight: Math.max(1, Math.round(height * scale)),
    resizeQuality: "high",
  });
  const texture = new Texture(bitmap);
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}
