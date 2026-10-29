import type { PathStepSlug } from "@/data/path.types";

/* The shape of `public/path/voice/manifest.json`, which
   `scripts/generate-path-voice.ts` writes beside the clips it makes (GH-150),
   and the Voice and Captions switches' storage keys. No React and no Node
   here, so the script, the page, the controls and the specs share it. */

/** "on" while the Voice switch on `/path` is on; absent otherwise. */
export const VOICE_STORAGE_KEY = "path:voice";
export const VOICE_CHANGE_EVENT = "path:voice-change";

/** "on" or "off" once the visitor has set the Captions switch; absent until
 *  then, when the captions show whenever the voice is off. */
export const CAPTIONS_STORAGE_KEY = "path:captions";
export const CAPTIONS_CHANGE_EVENT = "path:captions-change";

export type VoiceProvider = "say" | "elevenlabs";

/** Under `public/`, and the clips' URL path. */
export const VOICE_DIRECTORY = "path/voice";

/** One cue as the clip says it: its words when the clip was made, and where
 *  its speech starts and ends, in milliseconds from the clip's start. */
export type VoiceCue = { text: string; startMs: number; endMs: number };

export type VoiceClip = {
  src: string;
  bytes: number;
  durationMs: number;
  /** The step's narration cues, in order, as they were generated. */
  cues: VoiceCue[];
};

export type VoiceManifest = {
  provider: VoiceProvider;
  /** For the label: "macOS system voice", "ElevenLabs". */
  providerName: string;
  voice: string;
  clips: Partial<Record<PathStepSlug, VoiceClip>>;
};
