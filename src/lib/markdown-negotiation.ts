/**
 * `Accept: text/markdown` negotiation: which paths have a markdown sibling, and
 * when a request has actually asked for one (GH-119; ADR-0005 for the decision).
 *
 * Split from `markdown-siblings.ts` so `src/proxy.ts` can read the header
 * without pulling `RESUME_DATA` and its icon imports into the proxy bundle for
 * nothing. The spec imports it too, so the negotiable set is stated once.
 */

import type { Metadata } from "next";

/**
 * The content routes that negotiate, each pointing at the sibling a markdown
 * request is rewritten to. All three, not only the probed one: which paths the
 * is-agentic.com scanner visits is undocumented, and deployment protection turns
 * every preview probe into a redirect (ADR-0005).
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
 * RFC 9110's qvalue grammar: three decimal places, nothing above 1. Validated
 * rather than passed to `Number`, which reads `q=0x10` as 16 and `q=1e3` as
 * 1000 — either of which would outrank an honest `q=1`.
 */
const qvalue = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/;

/**
 * `Accept` as a list of media types with their q-values, malformed entries
 * dropped rather than defaulted — a parameter that is not a qvalue is not a
 * preference, and reading `q=high` or a bare `q=` as one would invent one.
 */
function preferences(accept: string): Preference[] {
  return accept.split(",").flatMap((entry) => {
    const [type, ...parameters] = entry.split(";").map((part) => part.trim());
    if (type === "") return [];

    /* Whitespace around the `=` is legal, and `q = 0` is a client refusing the
       type as plainly as `q=0` is. */
    const q = parameters
      .map((parameter) => /^q\s*=\s*(.*)$/i.exec(parameter)?.[1]?.trim())
      .find((value) => value !== undefined);
    if (q === undefined) return [{ type: type.toLowerCase(), quality: 1 }];

    return qvalue.test(q)
      ? [{ type: type.toLowerCase(), quality: Number(q) }]
      : [];
  });
}

/** The best q-value the header gives an exact type; `0` if it names none. */
function qualityOf(accepted: Preference[], type: string): number {
  const matches = accepted
    .filter((preference) => preference.type === type)
    .map(({ quality }) => quality);

  return matches.length > 0 ? Math.max(...matches) : 0;
}

/**
 * What the header offers HTML, wildcards included. Most specific match wins, as
 * RFC 9110 ranks them: a header that ranks markdown at 0.5 and everything else
 * at 1 is asking for HTML, and reading only the exact type would have handed it
 * markdown.
 */
function htmlQuality(accepted: Preference[]): number {
  for (const type of ["text/html", "text/*", "*/*"]) {
    const match = accepted.find((preference) => preference.type === type);
    if (match !== undefined) return match.quality;
  }

  return 0;
}

/**
 * Whether to serve markdown for this `Accept`.
 *
 * The markdown token has to be spelled out — a bare wildcard is curl's default
 * and every browser sends a wildcard tail, so matching one would rewrite
 * ordinary traffic to markdown. Wildcards do rank HTML, though, which is the
 * asymmetry `htmlQuality` above carries: they cannot select markdown, and they
 * can outrank it.
 *
 * acceptmarkdown.com asks a server to honour q-values, which is the comparison
 * below. What it also asks for and this does not do is answer `406` when
 * nothing offered is acceptable: that changes the response for requests which
 * are not asking for markdown at all, and the scan's failed check does not
 * grade it (GH-119).
 */
export function prefersMarkdown(accept: string | null): boolean {
  if (accept === null) return false;

  const accepted = preferences(accept);
  const markdown = qualityOf(accepted, MARKDOWN_MEDIA_TYPE);

  return markdown > 0 && markdown >= htmlQuality(accepted);
}

/**
 * The `alternates` fragment advertising a route's markdown sibling, for a route
 * to spread beside its canonical (GH-127).
 *
 * Derived from the map rather than restated per route, so a route cannot name a
 * sibling that does not negotiate, and so the map stays the one place a fourth
 * negotiable route is declared. `types` is Next's `rel="alternate"` channel and
 * the href resolves against `metadataBase`, so the sibling path is enough.
 *
 * An unmapped path throws rather than advertising nothing. Metadata is evaluated
 * when the route renders, so for these three — all prerendered — that is the
 * build, and the alternative is shipping a dead alternate nobody looks at.
 *
 * The parameter stays a wide `string` rather than `keyof typeof
 * MARKDOWN_NEGOTIABLE`: `src/proxy.ts` indexes the same map with an arbitrary
 * pathname, so narrowing the keys would only push a cast there, and it would
 * make the throw unreachable under types.
 */
export function markdownAlternate(
  path: string,
): Pick<NonNullable<Metadata["alternates"]>, "types"> {
  const sibling = MARKDOWN_NEGOTIABLE[path];
  if (sibling === undefined) {
    throw new Error(
      `${path} has no markdown sibling to advertise; add it to MARKDOWN_NEGOTIABLE and src/proxy.ts's matcher first.`,
    );
  }

  return { types: { [MARKDOWN_MEDIA_TYPE]: sibling } };
}
