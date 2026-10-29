import { PATH_NARRATION, type NarrationScriptCue } from "@/data/path-narration";
import type { PathStepSlug } from "@/data/path.types";

import type { VoiceClip, VoiceManifest } from "./voice-manifest";
import voiceManifestJson from "../../../public/path/voice/manifest.json";

/* A step's narration as `/path` plays it: the cues from the data module,
   timed by the clip the generator measured them in. The voice and the
   captions run on the same timings, so the tour keeps one rhythm with the
   voice on or off. No React and no DOM here, so the specs run it directly. */

const manifest = voiceManifestJson as VoiceManifest;

/** One cue, timed: its words, the prop it is about, and its span in
 *  milliseconds from the start of the step's narration. */
export type TimedCue = {
  text: string;
  prop?: string;
  startMs: number;
  endMs: number;
};

export type Narration = {
  cues: readonly TimedCue[];
  /** The clip's URL; absent when the step has no clip that says these
   *  cues. */
  clip: { src?: string };
  durationMs: number;
};

/** Where a clip is missing or says other words than the cues — a cue
 *  reworded and not yet generated again — the cues are timed at the macOS
 *  voice's own pace instead, so the captions still keep a speaking rhythm.
 *  `tests/path-voice.spec.ts` keeps the shipped manifest from needing it. */
const ESTIMATE_WORDS_PER_MINUTE = 170;
const ESTIMATE_GAP_MS = 350;

function estimated(script: readonly NarrationScriptCue[]): Narration {
  let at = 0;
  const cues = script.map((cue, index) => {
    if (index > 0) at += ESTIMATE_GAP_MS;
    const words = cue.text.split(/\s+/).filter(Boolean).length;
    const startMs = at;
    at += Math.round((words / ESTIMATE_WORDS_PER_MINUTE) * 60_000);
    return { ...cue, startMs, endMs: at };
  });
  return { cues, clip: {}, durationMs: at };
}

/** `script` timed by `clip`, when the clip says its cues; estimated
 *  otherwise. */
export function timeNarration(
  script: readonly NarrationScriptCue[],
  clip: VoiceClip | undefined,
): Narration {
  const matches =
    clip !== undefined &&
    clip.cues.length === script.length &&
    clip.cues.every((cue, index) => cue.text === script[index].text);
  if (!matches) return estimated(script);
  return {
    cues: script.map((cue, index) => ({
      ...cue,
      startMs: clip.cues[index].startMs,
      endMs: clip.cues[index].endMs,
    })),
    clip: { src: clip.src },
    durationMs: clip.durationMs,
  };
}

const NARRATIONS = new Map(
  (Object.keys(PATH_NARRATION) as PathStepSlug[]).map((slug) => [
    slug,
    timeNarration(PATH_NARRATION[slug], manifest.clips[slug]),
  ]),
);

/** A step's narration: its cues, timed, and its clip. */
export function narrationFor(slug: PathStepSlug): Narration {
  return NARRATIONS.get(slug)!;
}

/** For the label: who made the clips. */
export const VOICE_PROVIDER_NAME = manifest.providerName;

/** The cue playing `ms` into a narration: the last one started, so a caption
 *  holds through the pause after it; the first before any has. */
export function cueIndexAt(cues: readonly TimedCue[], ms: number): number {
  let index = 0;
  while (index + 1 < cues.length && cues[index + 1].startMs <= ms) index += 1;
  return index;
}

/** How far through its speech `cue` is at `ms`, from 0 to 1. */
export function cueProgress(cue: TimedCue, ms: number): number {
  const span = cue.endMs - cue.startMs;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (ms - cue.startMs) / span));
}
