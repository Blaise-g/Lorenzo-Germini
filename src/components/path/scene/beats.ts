import type { PathStepSlug } from "@/data/path.types";

/* The narration's beats (v3; the benchmark's §4(d)): as each cue starts,
   the prop it is about plays a small, quick motion on the board, and none
   of it is text. One table maps a cue's prop, by the data's id, to what its
   piece does; nothing else names a beat. No three.js here, so a spec pins
   the table and the runtime plays it.

   A beat is one of:
   - `own`: the piece's own motion, which its builder in `props.ts` defines
     (a needle sweeping, the coils pulsing);
   - `rise`: a landmark stretching up out of its tile and settling;
   - `light`: a building's lights warming on and easing back;
   - `surge`: the water running faster, then back to its pace;
   - `calm`: the water stilling, its reflection resolving, then stirring
     again. */

export type BeatKind = "own" | "rise" | "light" | "surge" | "calm";

export type Beat = Readonly<{
  kind: BeatKind;
  /** The piece in the tile's layout (`board.ts`) that moves. */
  piece: string;
  /** How long it plays, in ms. */
  ms: number;
  /** The sound it makes, if the Sound switch is on: a soft mallet, high or
   *  low. */
  pitch: "high" | "low";
}>;

const own = (piece: string, ms = 1400): Beat => ({
  kind: "own",
  piece,
  ms,
  pitch: "high",
});
const rise = (piece: string): Beat => ({
  kind: "rise",
  piece,
  ms: 900,
  pitch: "low",
});
const light = (piece: string): Beat => ({
  kind: "light",
  piece,
  ms: 2600,
  pitch: "high",
});

/** Each prop's beat, by `<step>:<prop>`: every prop a cue names, where
 *  §4(d)'s table gives it one. The Bisalta has none; a cue about it moves
 *  nothing. */
export const BEATS: Readonly<Record<string, Beat>> = {
  /* The rivers start to flow; the school's windows warm on. */
  "home:plateau": { kind: "surge", piece: "plateau", ms: 2600, pitch: "low" },
  "home:school": light("school"),
  /* The Mole rises; the coils pulse in turn and the rotor spins up. */
  "turin:mole": rise("mole"),
  "turin:coils": own("coils", 1800),
  /* The lake stills; the dial's needle sweeps; the plume climbs. */
  "switzerland:lake": { kind: "calm", piece: "lake", ms: 2800, pitch: "low" },
  "switzerland:roche-dial": own("roche-dial"),
  "switzerland:jet-d-eau": own("jet-d-eau", 1600),
  /* The schoolroom's lights; the MVP window lights, then dims and its
     shutters close. */
  "cuneo-2022:schoolroom": light("schoolroom"),
  "cuneo-2022:mvp-window": own("mvp-window", 1500),
  /* Water runs the pipe loop; the clock's hand sweeps; the belfry rises;
     the arcade lights. */
  "lille:pipe-loop": own("pipe-loop", 2200),
  "lille:clock-face": own("clock-face", 1400),
  "lille:belfry": rise("belfry"),
  "lille:courtyard": light("courtyard"),
  /* The monitor glows on; the office lights up. */
  "now:startup-desk": own("startup-desk", 2000),
  "now:office": light("office"),
  /* The five empty slots pulse in turn, and stay empty. */
  "next:blank": own("blank", 1600),
};

/** The beat a cue about `prop` at `slug` plays, or none. */
export function beatFor(
  slug: PathStepSlug,
  prop: string | null,
): Beat | undefined {
  if (!prop) return undefined;
  return BEATS[`${slug}:${prop}`];
}

/** Where a cue stands among the cues about its prop: which of them it is,
 *  and whether it is the last, for a beat that tells a story across them
 *  (the MVP window lights on its first and closes on its last). */
export function cueTurn(
  cues: readonly { prop?: string }[],
  index: number,
): { nth: number; last: boolean } {
  const prop = cues[index]?.prop;
  const same = cues
    .map((cue, at) => (cue.prop === prop ? at : -1))
    .filter((at) => at >= 0);
  const nth = same.indexOf(index);
  return { nth, last: nth === same.length - 1 };
}

/** The pieces that hop as the pawn passes them (the owner's clip): small
 *  accent props and the trees, never a landmark. */
export const HOPPERS: readonly string[] = [
  "trees",
  "trees-back",
  "sailboat",
  "coils",
  "roche-dial",
  "clock-face",
  "startup-desk",
];

/** How near the pawn's foot a hopper has to come, in scene units, to hop. */
export const HOP_REACH = 1.9;
