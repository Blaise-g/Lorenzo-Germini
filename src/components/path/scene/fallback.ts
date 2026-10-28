/* When `/path` shows its stills instead of a scene (storyboard §7.4; GH-141,
   implementation decision 8). A pure function of what the browser reports and
   of the first frames' times, so every trigger is testable without a GPU. The
   host feeds it before the runtime loads, with no frames; the runtime feeds it
   again once it has timed its first `FRAME_SAMPLE_SIZE` frames. No DOM and no
   three.js here: a spec imports it directly. */

/** What the browser says before any scene renders. `context` is the outcome of
 *  asking for a WebGL2 context with `failIfMajorPerformanceCaveat`, then
 *  without it: a strict refusal that a plain request answers is a caveat. */
export type CapabilitySignals = {
  webgl2: boolean;
  context: "ok" | "failed" | "major-performance-caveat";
  saveData: boolean;
};

export type FallbackReason =
  | "no-webgl2"
  | "context-failed"
  | "performance-caveat"
  | "save-data"
  | "slow-frames"
  | "context-lost";

export const FRAME_SAMPLE_SIZE = 60;

/** The storyboard's line, "a median above 33 ms". These are rAF intervals,
 *  so they measure the display as well as the render: a screen held at 30 Hz
 *  reports about 33.3 ms and is over it, however cheap the frame. */
export const SLOW_FRAME_MEDIAN_MS = 33;

/** The line under the stills, saying why there is no scene. */
export const FALLBACK_REASON_LINES: Record<FallbackReason, string> = {
  "no-webgl2": "Showing stills: this browser has no WebGL2.",
  "context-failed": "Showing stills: the browser could not start WebGL.",
  "performance-caveat":
    "Showing stills: the browser reports that WebGL would run slowly here.",
  "save-data": "Showing stills: your browser asked to save data.",
  "slow-frames": "Showing stills: the scene ran too slowly on this device.",
  "context-lost":
    "Showing stills: the browser lost the scene's graphics and did not restore them.",
};

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[Math.floor(middle)];
}

/** The reason to show stills, or `null` to keep the scene. Frame times count
 *  only once the first `FRAME_SAMPLE_SIZE` are in: fewer is no verdict yet,
 *  and frames after them never reopen it. */
export function decideFallback(
  signals: CapabilitySignals,
  frameTimes: readonly number[] = [],
): FallbackReason | null {
  if (!signals.webgl2) return "no-webgl2";
  if (signals.context === "failed") return "context-failed";
  if (signals.context === "major-performance-caveat") {
    return "performance-caveat";
  }
  if (signals.saveData) return "save-data";
  if (frameTimes.length < FRAME_SAMPLE_SIZE) return null;
  const sample = frameTimes.slice(0, FRAME_SAMPLE_SIZE);
  return median(sample) > SLOW_FRAME_MEDIAN_MS ? "slow-frames" : null;
}
