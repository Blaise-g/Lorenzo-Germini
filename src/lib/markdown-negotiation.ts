/**
 * `Accept: text/markdown` negotiation: which paths have a markdown sibling, and
 * when a request has actually asked for one (GH-119; ADR-0005 for the decision).
 *
 * Split from `markdown-siblings.ts` because the two run in different places —
 * this module is imported by `src/proxy.ts` on the edge runtime, where nothing
 * from `RESUME_DATA` is needed and its `next/image` icon imports would be dead
 * weight. The spec imports it too, so the negotiable set is stated once.
 */

/**
 * The content routes that negotiate, each pointing at the sibling a markdown
 * request is rewritten to. All three, not only the probed one: which paths the
 * is-agentic.com scanner visits is undocumented and deployment protection turns
 * every preview probe into a redirect, so covering the content routes costs one
 * entry each and removes the guess (ADR-0005).
 */
export const MARKDOWN_NEGOTIABLE: Readonly<Record<string, string>> = {
  "/": "/index.md",
  "/cv": "/cv.md",
  "/writing": "/writing.md",
};

/** The type an agent asks for, and the one the siblings answer with. */
export const MARKDOWN_MEDIA_TYPE = "text/markdown";

type Preference = { type: string; quality: number };

/**
 * `Accept` as a list of media types with their q-values, malformed entries
 * dropped rather than defaulted — a parameter that is not a number is not a
 * preference, and treating `q=high` as `q=1` would invent one.
 */
function preferences(accept: string): Preference[] {
  return accept
    .split(",")
    .flatMap((entry) => {
      const [type, ...parameters] = entry.split(";").map((part) => part.trim());
      if (type === "") return [];

      const q = parameters
        .map((parameter) => /^q=(.*)$/i.exec(parameter)?.[1])
        .find((value) => value !== undefined);
      if (q === undefined) return [{ type: type.toLowerCase(), quality: 1 }];

      const quality = Number(q);
      return Number.isFinite(quality)
        ? [{ type: type.toLowerCase(), quality }]
        : [];
    })
    .filter(({ quality }) => quality >= 0);
}

/** The best q-value the header gives an exact type; `0` if it names none. */
function qualityOf(accepted: Preference[], type: string): number {
  const matches = accepted
    .filter((preference) => preference.type === type)
    .map(({ quality }) => quality);

  return matches.length > 0 ? Math.max(...matches) : 0;
}

/**
 * Whether to serve markdown for this `Accept`.
 *
 * The token has to be spelled out: a bare wildcard is curl's default and every
 * browser sends a wildcard tail, so matching one would rewrite ordinary traffic
 * to markdown. acceptmarkdown.com asks a server to honour q-values, which is the
 * comparison below — `text/markdown;q=0` is a client refusing markdown, and a
 * header preferring HTML gets HTML even though it named markdown too. What that
 * spec also asks for and this does not do is answer `406` when nothing offered
 * is acceptable: that changes the response for requests which are not asking
 * for markdown at all, and the scan's failed check does not grade it (GH-119).
 */
export function prefersMarkdown(accept: string | null): boolean {
  if (accept === null) return false;

  const accepted = preferences(accept);
  const markdown = qualityOf(accepted, MARKDOWN_MEDIA_TYPE);

  return markdown > 0 && markdown >= qualityOf(accepted, "text/html");
}

/** The sibling a request for `pathname` negotiates to, or `undefined`. */
export function markdownSiblingFor(pathname: string): string | undefined {
  return MARKDOWN_NEGOTIABLE[pathname];
}
