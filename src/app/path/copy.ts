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
