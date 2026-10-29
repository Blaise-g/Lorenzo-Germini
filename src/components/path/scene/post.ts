import { N8AOPostPass } from "n8ao";
import {
  BlendFunction,
  BloomEffect,
  CopyPass,
  Effect,
  EffectAttribute,
  EffectComposer,
  EffectPass,
  KernelSize,
  LookupTexture,
  LUT3DEffect,
  NoiseEffect,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  TiltShiftEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from "postprocessing";
import {
  Color,
  HalfFloatType,
  Uniform,
  WebGLRenderTarget,
  type Camera,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from "three";

import { smoothstep } from "./motion";
import type { Palette } from "./palette";

/* The board's post-processing (v3; the benchmark's §4(c)), pmndrs
   `postprocessing` with N8AO, in this order:

   1. N8AO at half resolution, so the pieces sit on their tiles;
   2. bloom over a luminance threshold past 1, so in practice only what
      glows blooms: the lit windows, the monitor and the pipe's flow at
      night (`paint.ts`). It selects by brightness, not by object: a day's
      brightest lacquer can cross it, which is why the day's bloom is weak;
   3. a tilt-shift band, for the miniature look;
   4. AgX;
   5. a 3D LUT graded from the path palette, light or night;
   6. paper grain, soft-light at a few per cent, frozen under reduced motion;
   7. a subtle vignette;
   8. the page's ground, where the board is not;
   9. SMAA, in a pass after the grade so it finds the graded edges.

   The canvas lies on the page with nothing round it, so wherever the board
   is not, the chain hands back the page's own ground (`GroundEffect`): a
   grade, grain or vignette over the empty table would draw the stage as a
   box. The board's shadow on the table survives as a shade of that
   ground. */

/* ─── Quality: what the chain drops when frames run long ─── */

/** One rung of quality: whether AO runs, and the share of the drawing
 *  buffer's pixel ratio drawn. */
export type Quality = Readonly<{ ao: boolean; pixelScale: number }>;

/** The rungs, best first. AO goes first, then pixels (§4(f)). */
export const QUALITY_LADDER: readonly Quality[] = [
  { ao: true, pixelScale: 1 },
  { ao: false, pixelScale: 1 },
  { ao: false, pixelScale: 0.75 },
  { ao: false, pixelScale: 0.5 },
];

/** A phone starts without AO (§4(f)); its bloom is drawn at half size. */
export const PHONE_START = 1;

/** Whether this is a phone, for §4(f)'s cuts: a coarse pointer on a small
 *  screen. */
export function isPhone(): boolean {
  return (
    window.matchMedia("(pointer: coarse)").matches &&
    Math.min(window.screen.width, window.screen.height) < 600
  );
}

/** The rung a device starts on. */
export function startRung(phone: boolean): number {
  return phone ? PHONE_START : 0;
}

/** A draw the governor counts as long: past 20 ms, the ticket's p95 for a
 *  whole frame. The runtime times `draw()` itself (v3-harden; v3-light's
 *  F6), not the gap between frames, which carries vsync and every stall of
 *  the page's own. That is the CPU's share: WebGL returns before the GPU is
 *  done, so a board bound by its GPU alone reads short here, and the
 *  fallback's frame sample (`fallback.ts`) is what catches it. */
export const LONG_FRAME_MS = 20;
/** How many drawn frames each verdict reads. Under `FRAME_SAMPLE_SIZE`
 *  (`fallback.ts`), so a GPU a little too slow sheds AO within the
 *  fallback's sample, and the frames after the step can bring its median
 *  under the line. The sample still counts the frames before the step, so
 *  a GPU far too slow goes to the stills as before. */
export const GOVERNOR_WINDOW = 24;
/** The share of a window's frames that has to run long to step down. */
const LONG_SHARE = 0.25;

/** Watches drawn frames and steps the quality down, one rung at a time,
 *  when a window of them runs long; never back up, so the board does not
 *  flicker between rungs. Each step starts a fresh window. */
export function createGovernor(start = 0) {
  let rung = Math.min(start, QUALITY_LADDER.length - 1);
  let frames: number[] = [];
  return {
    get quality() {
      return QUALITY_LADDER[rung];
    },
    get rung() {
      return rung;
    },
    /** Counts one draw's time; returns the new quality if it stepped. */
    sample(ms: number): Quality | null {
      if (!(ms > 0) || ms >= 1000) return null;
      frames.push(ms);
      if (frames.length < GOVERNOR_WINDOW) return null;
      const long = frames.filter((each) => each > LONG_FRAME_MS).length;
      frames = [];
      if (long / GOVERNOR_WINDOW < LONG_SHARE) return null;
      if (rung === QUALITY_LADDER.length - 1) return null;
      rung += 1;
      return QUALITY_LADDER[rung];
    },
  };
}

/* ─── The grade ─── */

/** A grade, in sRGB: an S-curve, a saturation, and a split tone that
 *  leans the shadows and the highlights toward two palette colours. */
export type Grade = Readonly<{
  contrast: number;
  saturation: number;
  shadow: readonly [number, number, number];
  shadowAmount: number;
  highlight: readonly [number, number, number];
  highlightAmount: number;
}>;

const LUMA = [0.2126, 0.7152, 0.0722] as const;
const luma = (r: number, g: number, b: number) =>
  r * LUMA[0] + g * LUMA[1] + b * LUMA[2];

/** A palette colour in sRGB, scaled to a luminance of 1: a tint that
 *  shifts hue without moving brightness. */
function tint(colour: Color): [number, number, number] {
  const { r, g, b } = colour.clone().convertLinearToSRGB();
  const l = Math.max(luma(r, g, b), 1e-4);
  return [r / l, g / l, b / l];
}

/** The grade at `night`, from the palette. Day: a little contrast and
 *  colour, slate in the shadows and cream in the highlights, the riso
 *  print's two papers. Night: blue shadows and warm lamplight highlights,
 *  the colour kept, so the night is not a grey print of the day. */
export function gradeFor(palette: Palette, night: number): Grade {
  const t = Math.min(Math.max(night, 0), 1);
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const shadow = tint(palette["ink-cool"]);
  const dayLight = tint(palette.paper);
  const lamp = tint(palette["ink-sun"]);
  return {
    contrast: lerp(0.4, 0.24),
    saturation: lerp(1.18, 1.02),
    shadow,
    shadowAmount: lerp(0.16, 0.34),
    highlight: [0, 1, 2].map(
      (i) => dayLight[i] + (lamp[i] - dayLight[i]) * t,
    ) as [number, number, number],
    highlightAmount: lerp(0.1, 0.14),
  };
}

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

/** One sRGB colour through `grade`, into `out`. */
export function gradeColour(
  r: number,
  g: number,
  b: number,
  grade: Grade,
  out: [number, number, number] = [0, 0, 0],
): [number, number, number] {
  const curve = (x: number) =>
    x + (smoothstep(clamp01(x)) - x) * grade.contrast;
  out[0] = curve(r);
  out[1] = curve(g);
  out[2] = curve(b);
  const l = luma(out[0], out[1], out[2]);
  for (let i = 0; i < 3; i++) {
    const saturated = l + (out[i] - l) * grade.saturation;
    const shadows = (1 - l) ** 2 * grade.shadowAmount;
    const highlights = l ** 2 * grade.highlightAmount;
    const tinted =
      saturated *
      (1 + (grade.shadow[i] - 1) * shadows) *
      (1 + (grade.highlight[i] - 1) * highlights);
    out[i] = clamp01(tinted);
  }
  return out;
}

/** The LUT's side: 16³ is smooth for a gentle grade, and cheap to rebuild
 *  on every frame of a theme crossfade. */
export const LUT_SIZE = 16;

/** Writes `grade` into a LUT's data, red fastest, as `LookupTexture`
 *  lays it out: 0 to 1 into floats, 0 to 255 into bytes. */
export function writeLut(
  data: Float32Array | Uint8Array,
  grade: Grade,
  size = LUT_SIZE,
) {
  const scale = data instanceof Uint8Array ? 255 : 1;
  const s = 1 / (size - 1);
  const out: [number, number, number] = [0, 0, 0];
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        gradeColour(r * s, g * s, b * s, grade, out);
        const i = (r + g * size + b * size * size) * 4;
        data[i] = out[0] * scale;
        data[i + 1] = out[1] * scale;
        data[i + 2] = out[2] * scale;
        data[i + 3] = scale;
      }
    }
  }
}

/* ─── The page's ground, where the board is not ─── */

/** Where nothing was drawn but the table, the page's ground, shaded as the
 *  table's shadow shaded `ungraded`, a copy of the frame taken before any
 *  grading. It runs last: an `EffectPass` orders its effects by their
 *  attributes, not as given, so it shares the SMAA pass, after SMAA. */
class GroundEffect extends Effect {
  constructor(ungraded: Texture) {
    super(
      "GroundEffect",
      /* glsl */ `
      uniform vec3 ground;
      uniform sampler2D ungraded;
      void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
        if (depth < 1.0) {
          outputColor = inputColor;
          return;
        }
        vec3 raw = texture2D(ungraded, uv).rgb;
        vec3 weights = vec3(0.2126, 0.7152, 0.0722);
        float shade = min(dot(raw, weights) / max(dot(ground, weights), 1e-4), 1.0);
        outputColor = vec4(ground * shade, inputColor.a);
      }`,
      {
        attributes: EffectAttribute.DEPTH,
        uniforms: new Map<string, Uniform>([
          ["ground", new Uniform(new Color())],
          ["ungraded", new Uniform(ungraded)],
        ]),
      },
    );
  }

  /** The page's ground, as the scene's working colour. */
  get ground(): Color {
    return this.uniforms.get("ground")!.value as Color;
  }
}

/* ─── The chain ─── */

/** How deep the grain reads, by day and by night. */
const GRAIN = { day: 0.07, night: 0.1 } as const;
/** How strong the bloom is, by day and by night: a day's lacquer barely
 *  sparkles; a night's windows halo. */
const BLOOM = { day: 0.35, night: 1.4 } as const;

/** The tilt-shift at a close-up and at the whole board, in clip space (the
 *  stage is 2 high): `area` is the band's half-height to where the blur is
 *  full, `feather` the soft part of it, `strength` the blur's opacity.
 *  `wide` is the share of the whole board a shot holds (`camera-rig.ts`):
 *  at or under `close.wide` the close-up's look, at or over `whole.wide`
 *  the whole board's, blended between. */
export const TILT_SHIFT = {
  close: { wide: 0.55, area: 0.95, feather: 0.6, strength: 0.6 },
  whole: { wide: 0.95, area: 1.6, feather: 0.6, strength: 0.15 },
} as const;

/** The tilt-shift for a shot holding `wide` of the whole board. */
export function tiltShiftFor(wide: number) {
  const { close, whole } = TILT_SHIFT;
  const t = smoothstep(
    clamp01((wide - close.wide) / (whole.wide - close.wide)),
  );
  const mix = (a: number, b: number) => a + (b - a) * t;
  return {
    area: mix(close.area, whole.area),
    feather: mix(close.feather, whole.feather),
    strength: mix(close.strength, whole.strength),
  };
}

export type PostOptions = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: Camera;
  /** Half-size bloom (§4(f)). */
  phone: boolean;
  /** The quality to start on: the governor's. */
  quality: Quality;
};

export function createPost({
  renderer,
  scene,
  camera,
  phone,
  quality: start,
}: PostOptions) {
  /* Half-float, so the emissives keep their range for bloom and AgX to
     work on; no multisampling, SMAA smooths the edges. */
  const composer = new EffectComposer(renderer, {
    frameBufferType: HalfFloatType,
    multisampling: 0,
    stencilBuffer: false,
  });
  const render = new RenderPass(scene, camera);

  const ao = new N8AOPostPass(scene, camera, 1, 1);
  /* The only transparent material is the table's shadow catcher, which
     writes no depth and so takes no occlusion: without this, N8AO finds it
     every frame and keeps two full-size half-float targets (about 60 MB at
     1440×900×2) to composite it. */
  ao.autoDetectTransparency = false;
  Object.assign(ao.configuration, {
    transparencyAware: false,
    halfRes: true,
    depthAwareUpsampling: true,
    aoRadius: 1.0,
    distanceFalloff: 0.35,
    intensity: 3.4,
    aoSamples: 12,
    denoiseSamples: 6,
    denoiseRadius: 8,
    screenSpaceRadius: false,
  });

  const bloom = new BloomEffect({
    mipmapBlur: true,
    luminanceThreshold: 1.05,
    luminanceSmoothing: 0.25,
    intensity: BLOOM.day,
    radius: 0.7,
  });
  if (phone) bloom.resolution.scale = 0.5;

  /* A band through the shot's subject stays sharp; above and below it
     the frame softens, as a model railway's photograph does. How much is
     set per frame by `setFocus`. */
  const tiltShift = new TiltShiftEffect({
    focusArea: TILT_SHIFT.close.area,
    feather: TILT_SHIFT.close.feather,
    kernelSize: KernelSize.SMALL,
    resolutionScale: 0.5,
  });

  const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.AGX });

  /* Bytes, not floats: linear filtering of a float texture needs
     `OES_texture_float_linear`, which many phone GPUs lack, and without it
     the lookup samples black. 16³ bytes hold this gentle grade. */
  const lut = new LookupTexture(
    new Float32Array(LUT_SIZE ** 3 * 4),
    LUT_SIZE,
  ).convertToUint8();
  /* The LUT holds sRGB values: the effect encodes its input to sRGB
     before the lookup, and the next effect decodes it back. */
  const grade = new LUT3DEffect(lut);

  const grain = new NoiseEffect({
    blendFunction: BlendFunction.SOFT_LIGHT,
    premultiply: false,
  });
  grain.blendMode.opacity.value = GRAIN.day;

  const vignette = new VignetteEffect({ offset: 0.42, darkness: 0.36 });
  /* The table's shadow is soft: a half-size copy holds it. The copy pass
     gives it the frame's half-float type, which the night's ground needs:
     it is a few bytes' worth of linear light, and a byte copy would band
     its shadow into steps. */
  const ungraded = new WebGLRenderTarget(1, 1, { depthBuffer: false });
  const keep = new CopyPass(ungraded, false);
  const ground = new GroundEffect(ungraded.texture);
  const smaa = new SMAAEffect({ preset: SMAAPreset.HIGH });

  /* Three effect passes, not one: merged after the tilt-shift, an effect
     runs only inside its sharp band, and SMAA has to find the graded
     edges. */
  const lens = new EffectPass(camera, bloom, tiltShift);
  const looks = new EffectPass(camera, toneMapping, grade, grain, vignette);
  const edges = new EffectPass(camera, smaa, ground);
  composer.addPass(render);
  composer.addPass(ao);
  composer.addPass(keep);
  composer.addPass(lens);
  composer.addPass(looks);
  composer.addPass(edges);

  let quality = start;
  ao.enabled = quality.ao;

  return {
    /** Draws a frame; `seconds` moves the grain on, 0 freezes it. */
    render(seconds: number) {
      composer.render(seconds);
    },
    /** Resizes every buffer to the renderer's drawing buffer, which is
     *  already `width` × `height` CSS pixels. */
    setSize(width: number, height: number) {
      composer.setSize(width, height, false);
      const buffer = composer.inputBuffer;
      ungraded.setSize(
        Math.max(Math.floor(buffer.width / 2), 1),
        Math.max(Math.floor(buffer.height / 2), 1),
      );
    },
    get quality() {
      return quality;
    },
    setQuality(next: Quality) {
      quality = next;
      ao.enabled = next.ao;
    },
    /** Fits the tilt-shift to the camera's shot (`camera-rig.ts`): its
     *  sharp band centred on `height`, the subject's height in clip space
     *  (-1 at the stage's foot, 1 at its top), so a close-up is never the
     *  part blurred; and, by `wide` (the share of the whole board the shot
     *  holds), from a close-up's gentle falloff to a whole-board shot that
     *  is all but sharp. */
    setFocus(height: number, wide: number) {
      const { area, feather, strength } = tiltShiftFor(wide);
      tiltShift.offset = Math.min(Math.max(height, -1), 1);
      tiltShift.feather = feather;
      tiltShift.focusArea = area;
      tiltShift.blendMode.opacity.value = strength;
    },
    /** Grades and glows the frame for `night`, and hands the page's ground
     *  back where the board is not. */
    setMix(palette: Palette, night: number, pageGround: Color) {
      writeLut(lut.image.data as Uint8Array, gradeFor(palette, night));
      lut.needsUpdate = true;
      const t = Math.min(Math.max(night, 0), 1);
      bloom.intensity = BLOOM.day + (BLOOM.night - BLOOM.day) * t;
      grain.blendMode.opacity.value = GRAIN.day + (GRAIN.night - GRAIN.day) * t;
      ground.ground.copy(pageGround);
    },
    dispose() {
      /* N8AO has no dispose of its own, and the composer's walk frees only
         its targets and materials, not its full-screen quads. */
      for (const quad of N8AO_QUADS) ao[quad]?.dispose();
      composer.dispose();
      lut.dispose();
    },
  };
}

/** N8AO's full-screen quads, which outlive the composer's dispose. */
const N8AO_QUADS = [
  "copyQuad",
  "accumulationQuad",
  "depthDownsampleQuad",
  "effectShaderQuad",
  "poissonBlurQuad",
  "effectCompositerQuad",
] as const;
