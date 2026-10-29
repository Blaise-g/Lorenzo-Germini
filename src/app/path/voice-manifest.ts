import type { PathStepSlug } from "@/data/path.types";

/* The shape of `public/path/voice/manifest.json`, which
   `scripts/generate-path-voice.ts` writes beside the clips it makes (GH-150).
   No React and no Node here, so the script, the page and the specs share it. */

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
