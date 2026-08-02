/**
 * Every host this site answers on, and the one it is canonical on (#68 option B).
 *
 * Shared by two consumers that must never disagree: `next.config.ts`, which
 * turns the retired hosts into redirect rules, and `RESUME_DATA`, from which
 * every identity surface derives its URLs. It lives here rather than in
 * `resume-data.tsx` because that module carries JSX and the config cannot
 * import it.
 */

/** Origin only, no trailing slash, so it composes into a URL of any depth. */
export const CANONICAL_ORIGIN = "https://lorenzogermini.com";

/**
 * The deployment host the site is moving off. It still serves, so its paths
 * are preserved rather than dropped — links already in the wild survive.
 */
export const RETIRED_DEPLOYMENT_HOST = "lorenzo-germini.vercel.app";

/**
 * The publication's vanity hosts. A doorway to the essay index, not a mirror
 * of the site, so every path on them lands on `/writing`.
 */
export const PUBLICATION_HOSTS = ["germinai.xyz", "www.germinai.xyz"] as const;
