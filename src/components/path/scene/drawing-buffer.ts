/* The canvas's backing store, which dominates the scene's GPU memory (GH-152,
   `docs/path-measurements.md`). No three.js here: a spec checks the
   arithmetic directly. */

/** The fewest device pixels a CSS pixel is drawn with. The renderer does not
 *  multisample (ADR-0009): it draws at twice the CSS size at least, so a
 *  screen at ratio 2 gets the board at its own sharpness, and a screen at
 *  ratio 1 gets them supersampled, each pixel the average of four. */
export const MIN_PIXEL_RATIO = 2;

/** The sharpest the scene is drawn, as a factor of CSS pixels. */
export const MAX_PIXEL_RATIO = 3;

/** Bytes a drawing-buffer pixel holds without multisampling: its colour and
 *  its packed depth and stencil, 4 bytes each, and the colour the
 *  compositor keeps of the last frame, 4 more. */
export const DRAWING_BYTES_PER_PIXEL = 12;

/** The most device pixels the drawing buffer holds: 40.8 MB at 12 bytes a
 *  pixel, which with the board's textures and shadow map (18.3 MB) comes to
 *  59.1 MB, under the 64 MB budget. MB here is a million bytes, as the
 *  budget is. The stage of a 1440×900 screen at ratio 2 is 2.5 million
 *  device pixels; a stage over 850,000 CSS pixels, as a 1920×1080
 *  screen's is, draws at less than ratio 2. */
export const MAX_DRAWING_PIXELS = 3_400_000;

/** The pixel ratio to draw a `width` × `height` (CSS px) canvas at: the
 *  device's, at least `MIN_PIXEL_RATIO` and at most `MAX_PIXEL_RATIO`, and
 *  lower on a stage so large that it would hold more than
 *  `MAX_DRAWING_PIXELS`. */
export function drawingPixelRatio(
  width: number,
  height: number,
  devicePixelRatio: number,
): number {
  const ratio = Math.min(
    Math.max(devicePixelRatio, MIN_PIXEL_RATIO),
    MAX_PIXEL_RATIO,
  );
  const area = Math.max(width * height, 1);
  return Math.min(ratio, Math.sqrt(MAX_DRAWING_PIXELS / area));
}
