/* `/path`'s own labels: the way back to `/`, the step list's heading and
   a seen step's mark, which only a screen reader hears, and the control
   that clears the ticks. */
export const PATH_COPY = {
  flatSite: "Flat site",
  stepListHeading: "The path",
  seen: ", seen",
  clearSeen: "Clear seen",
};

/* The door on `/` (GH-151): an invitation first, then, once the visitor has
   entered `/path`, a way back in (GH-141, decision 6). */
export const DOOR_COPY = {
  firstVisit: "Walk the path in 3D",
  returning: "Continue the path",
};

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

/* The tour's transport on `/path`: the tabs' printed words, their accessible
   names — each opening with its printed word, so a spoken command matches —
   the keys that work them, and the line announced as each step plays. No
   counts or positions: the four numbers rule holds here too. */
export const TOUR_COPY = {
  transport: "The tour",
  previous: "Back",
  next: "Next",
  play: "Play",
  pause: "Pause",
  restart: "Again",
  previousName: "Back a step",
  nextName: "Next step",
  playName: "Play the tour",
  pauseName: "Pause the tour",
  restartName: "Again: play the tour from the start",
  previousTitle: "Back a step (J)",
  nextTitle: "Next step (L)",
  playTitle: "Play or pause the tour (K)",
  keys: "Keys: J back · K play or pause · L next",
  nowPlaying: (place: string) => `Now playing: ${place}`,
  ended: "The tour has ended. Pick a step, or play it again.",
};

/* The voice controls on `/path` (GH-150). The label says what the voice is,
   and it is never presented as Lorenzo's (GH-141, decision 9). */
export const VOICE_COPY = {
  listen: "Listen",
  loading: "Loading",
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
