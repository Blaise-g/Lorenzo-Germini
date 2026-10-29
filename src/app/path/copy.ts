/* The scene stage's interface copy on `/path` (GH-148), kept out of the JSX
   like the rest of the site's copy. The fallback's reason lines live with the
   decision that picks them, in `src/components/path/scene/fallback.ts`. */
export const STAGE_COPY = {
  skip: "Skip",
  replay: "Replay",
  turnLeft: "Turn the scene left",
  turnRight: "Turn the scene right",
  notBuilt: "This step’s scene is not built yet",
  showing: (place: string) => `Showing: ${place}`,
};

/* The voice controls on `/path` (GH-150). The label says what the voice is,
   and it is never presented as Lorenzo's (GH-141, decision 9). */
export const VOICE_COPY = {
  listen: "Listen",
  play: "Play",
  pause: "Pause",
  resume: "Resume",
  stop: "Stop",
  voiceSwitch: "Voice",
  label: (providerName: string) =>
    `Narration: synthetic voice, ${providerName}`,
  noClip: "No narration for this step yet",
  blocked: "The browser held the voice back. Press Play to hear it.",
  failed: "The clip did not load.",
};
