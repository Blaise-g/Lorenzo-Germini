/* The canvas's backing store, which dominates the scene's GPU memory (GH-152,
   `docs/path-measurements.md`). No three.js here: a spec checks the
   arithmetic directly. */

/** The fewest device pixels a CSS pixel is drawn with. The post chain's
 *  SMAA smooths the edges (`post.ts`), so a screen is drawn at its own
 *  ratio: v2's floor of 2, a supersample for want of antialiasing
 *  (ADR-0009), would cost every post pass four times over on a ratio-1
 *  screen. */
export const MIN_PIXEL_RATIO = 1;

/** The sharpest the scene is drawn, as a factor of CSS pixels: 2 on a
 *  desktop, 1.5 on a phone (the benchmark's §4(c)). */
export const MAX_PIXEL_RATIO = 2;
export const PHONE_PIXEL_RATIO = 1.5;

/** The ratio a device's board is capped at. */
export function pixelRatioCap(phone: boolean): number {
  return phone ? PHONE_PIXEL_RATIO : MAX_PIXEL_RATIO;
}

/** Bytes a drawing-buffer pixel holds: its colour, 4 bytes, and the colour
 *  the compositor keeps of the last frame, 4 more. The canvas has no depth
 *  or stencil; the post chain's buffers carry the depth (`post.ts`). */
export const DRAWING_BYTES_PER_PIXEL = 8;

/** Bytes the post chain holds per drawing-buffer pixel, measured at
 *  1440×900×2 (`docs/path-measurements.md`): four full-size half-float
 *  colour targets (the composer's input and output, N8AO's output, and
 *  one the measurement did not attribute) at 32, three depth textures at
 *  12, SMAA's edges and weights with one more 8-bit target at 12, and the
 *  half-size targets of AO, bloom, tilt-shift and the ground's half-float
 *  copy at 21; 77 in all, rounded up to cover the measured totals. The
 *  governor's lower rungs draw fewer pixels, never more. */
export const POST_BYTES_PER_PIXEL = 78;

/** The scene's GPU budget, in MB of a million bytes. v2's 64 MB held a
 *  canvas and its textures; v3's post chain holds ten times the canvas
 *  again (`POST_BYTES_PER_PIXEL`), so the budget is raised to what the
 *  chain needs at the pixel cap, 331.5 MB measured, with room to spare. */
export const GPU_BUDGET_MB = 360;

/** The most device pixels the drawing buffer holds: at 86 bytes a pixel,
 *  canvas and post chain, 292 MB, which with the board's textures, shadow
 *  map and environment (42 MB) comes to 334 MB, under `GPU_BUDGET_MB`. MB
 *  here is a million bytes, as the budget is. The stage of a 1440×900
 *  screen at ratio 2 is 3 million device pixels; a stage over 850,000 CSS
 *  pixels, as a 2560×1440 screen's is, draws at less than ratio 2. */
export const MAX_DRAWING_PIXELS = 3_400_000;

/** The pixel ratio to draw a `width` × `height` (CSS px) canvas at: the
 *  device's, at least `MIN_PIXEL_RATIO` and at most `cap`, and lower on a
 *  stage so large that it would hold more than `MAX_DRAWING_PIXELS`. */
export function drawingPixelRatio(
  width: number,
  height: number,
  devicePixelRatio: number,
  cap = MAX_PIXEL_RATIO,
): number {
  const ratio = Math.min(Math.max(devicePixelRatio, MIN_PIXEL_RATIO), cap);
  const area = Math.max(width * height, 1);
  return Math.min(ratio, Math.sqrt(MAX_DRAWING_PIXELS / area));
}
