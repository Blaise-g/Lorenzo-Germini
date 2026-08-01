import { RESUME_DATA } from "@/data/resume-data";
import type { OgFace } from "@/lib/og-fonts";
import { displayUrl } from "@/lib/utils";

/**
 * Every string the OpenGraph cards draw, and the face that draws it.
 *
 * The faces in `src/assets/fonts` are subsets cut to exactly these characters
 * (`bun run generate:og-fonts`), so a card that renders a string from anywhere
 * else gets `.notdef` boxes for any character this file does not already
 * mention. The cards therefore read their copy from here rather than reaching
 * into `RESUME_DATA` directly, and the face sets below are derived from the same
 * constants instead of hand-listing a character set.
 */
export const OG_HOME_TEXT = {
  claim: [
    RESUME_DATA.homepage.hero.headline.lead,
    RESUME_DATA.homepage.hero.headline.emphasis,
    RESUME_DATA.homepage.hero.headline.trail,
  ].join(""),
  location: RESUME_DATA.location,
  name: RESUME_DATA.name,
  role: RESUME_DATA.roleLabel,
  url: displayUrl(RESUME_DATA.personalWebsiteUrl),
} as const;

export const OG_CV_TEXT = {
  about: RESUME_DATA.about,
  eyebrow: "Curriculum vitae",
  meta: `${RESUME_DATA.location} · ${displayUrl(
    new URL("/cv", RESUME_DATA.personalWebsiteUrl).href,
  )}`,
  name: RESUME_DATA.name,
} as const;

/**
 * The eyebrow as the shaper sees it. The CV card sets `textTransform:
 * "uppercase"` on it, which Satori applies before shaping, so the lowercase
 * forms in `OG_CV_TEXT.eyebrow` are never drawn and the uppercase ones would
 * otherwise be missing from the subset.
 */
const cvEyebrowDrawn = OG_CV_TEXT.eyebrow.toUpperCase();

/**
 * Every string the cards put in front of the shaper, in the form it is drawn.
 * Derived from the copy above, so a new field lands here without being listed —
 * the suite checks that `OG_FACE_TEXT` accounts for all of it.
 */
export const OG_DRAWN_COPY: readonly string[] = [
  ...Object.values(OG_HOME_TEXT),
  ...Object.values({ ...OG_CV_TEXT, eyebrow: cvEyebrowDrawn }),
];

/**
 * The subsetter's input, and the coverage the suite asserts against the shipped
 * files. `Record` over `OgFace` makes a new face a type error here rather than a
 * face that ships its full glyph set.
 */
const OG_FACE_TEXT: Record<OgFace, readonly string[]> = {
  display: [OG_HOME_TEXT.name, OG_CV_TEXT.name],
  displayItalic: [OG_HOME_TEXT.role],
  mono: [
    OG_HOME_TEXT.location,
    OG_HOME_TEXT.url,
    cvEyebrowDrawn,
    OG_CV_TEXT.meta,
  ],
  text: [OG_HOME_TEXT.claim, OG_CV_TEXT.about],
};

/** One face's character set, assembled once so the subsetter and the suite
    cannot disagree about it. */
export function ogFaceText(face: OgFace) {
  return OG_FACE_TEXT[face].join(" ");
}

/** Whether any face's set covers `copy` — the check that no drawn string was
    left out of `OG_FACE_TEXT`. */
export function isSubsettedCopy(copy: string) {
  return Object.values(OG_FACE_TEXT).some((strings) => strings.includes(copy));
}
