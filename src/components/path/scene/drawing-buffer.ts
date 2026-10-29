/* The canvas's backing store, which dominates the scene's GPU memory (GH-152,
   `docs/path-measurements.md`). No three.js here: a spec checks the
   arithmetic directly. */

/** The sharpest the scene is drawn, as a factor of CSS pixels. */
export const MAX_PIXEL_RATIO = 1.5;

/** The most device pixels the drawing buffer holds. With `antialias: true`
 *  it keeps 4× multisampled colour and depth plus the resolved colour, about
 *  36 bytes a pixel: 1.6 million pixels is about 55 MiB (57.6 decimal MB), which leaves the
 *  scenes' buffers and textures room under the 64 MB budget. */
export const MAX_DRAWING_PIXELS = 1_600_000;

/** Bytes a drawing-buffer pixel holds, as above. */
export const DRAWING_BYTES_PER_PIXEL = 36;

/** The pixel ratio to draw a `width` × `height` (CSS px) canvas at: the
 *  device's, up to `MAX_PIXEL_RATIO`, and lower still on a stage so large
 *  that it would hold more than `MAX_DRAWING_PIXELS`. */
export function drawingPixelRatio(
  width: number,
  height: number,
  devicePixelRatio: number,
): number {
  const ratio = Math.min(devicePixelRatio, MAX_PIXEL_RATIO);
  const area = Math.max(width * height, 1);
  return Math.min(ratio, Math.sqrt(MAX_DRAWING_PIXELS / area));
}
