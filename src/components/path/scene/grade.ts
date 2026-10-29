import { Color } from "three";

import type { Palette } from "./palette";

/* The landmarks' ink grade (v3; the benchmark's §4(b) item 3). The
   generated landmarks are photo-textured: beside the board's toy props they
   read dark and out of place, most of all by night. In the shader, after
   their texture is read, each texel's albedo is pulled about a third of the
   way toward the path palette, along a ramp from slate through terracotta
   to the stock by its lightness, and its black point lifted toward the
   stock, as ink printed on cream card has no black. Light and dark are
   graded apart, from the same palette, by the one night value the light
   mixes by. */

export type InkGrade = {
  /** The ramp the albedo is pulled toward, dark to light. */
  shadow: Color;
  mid: Color;
  light: Color;
  /** How far toward the ramp, 0 to 1. */
  amount: number;
  /** How far the black point lifts toward the stock (`light`), 0 to 1. */
  lift: number;
};

/** The grade by day (`night` 0) and by night (1), mixed between. Tuned by
 *  eye on the seven landmarks, close up, in both modes
 *  (`docs/path-life.md`). */
export const INK_GRADE = {
  day: { amount: 0.35, lift: 0.1 },
  night: { amount: 0.38, lift: 0.2 },
} as const;

export function inkGrade(palette: Palette, night: number): InkGrade {
  const t = Math.min(Math.max(night, 0), 1);
  const mix = (day: number, dark: number) => day + (dark - day) * t;
  return {
    shadow: palette["ink-cool"].clone().multiplyScalar(0.62),
    mid: palette["ink-warm"].clone().lerp(palette.paper, 0.42),
    light: palette.paper.clone(),
    amount: mix(INK_GRADE.day.amount, INK_GRADE.night.amount),
    lift: mix(INK_GRADE.day.lift, INK_GRADE.night.lift),
  };
}

/** The grade as the shader applies it, to one linear albedo, for a spec to
 *  check the GLSL's arithmetic against. */
export function gradeAlbedo(albedo: Color, grade: InkGrade): Color {
  const lum = 0.2126 * albedo.r + 0.7152 * albedo.g + 0.0722 * albedo.b;
  const ramp =
    lum < 0.5
      ? grade.shadow.clone().lerp(grade.mid, lum * 2)
      : grade.mid.clone().lerp(grade.light, lum * 2 - 1);
  const pulled = albedo.clone().lerp(ramp, grade.amount);
  return pulled
    .multiplyScalar(1 - grade.lift)
    .add(grade.light.clone().multiplyScalar(grade.lift));
}

/** The GLSL for the same, after `map_fragment`: `diffuseColor` is the
 *  texel's albedo. */
export const GRADE_GLSL = /* glsl */ `
  float inkLum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  vec3 inkRamp = inkLum < 0.5
    ? mix( uInkShadow, uInkMid, inkLum * 2.0 )
    : mix( uInkMid, uInkLight, inkLum * 2.0 - 1.0 );
  diffuseColor.rgb = mix( diffuseColor.rgb, inkRamp, uInkGrade.x );
  diffuseColor.rgb = diffuseColor.rgb * ( 1.0 - uInkGrade.y ) + uInkLight * uInkGrade.y;`;
