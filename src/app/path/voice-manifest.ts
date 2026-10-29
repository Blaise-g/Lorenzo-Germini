import type { PathStepSlug } from "@/data/path.types";

/* The shape of `public/path/voice/manifest.json`, which
   `scripts/generate-path-voice.ts` writes beside the clips it makes (GH-150),
   and the Voice switch's storage key. No React and no Node here, so the
   script, the page, the controls and the specs share it. */

/** "on" while the Voice switch on `/path` is on; absent otherwise. */
export const VOICE_STORAGE_KEY = "path:voice";
export const VOICE_CHANGE_EVENT = "path:voice-change";

export type VoiceProvider = "say" | "elevenlabs";

/** Under `public/`, and the clips' URL path. */
export const VOICE_DIRECTORY = "path/voice";

export type VoiceClip = {
  src: string;
  /** What the clip reads: the step's `voiceScript` when it was generated. */
  script: string;
  bytes: number;
};

export type VoiceManifest = {
  provider: VoiceProvider;
  /** For the label: "macOS system voice", "ElevenLabs". */
  providerName: string;
  voice: string;
  clips: Partial<Record<PathStepSlug, VoiceClip>>;
};
