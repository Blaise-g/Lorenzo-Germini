import { expect, test } from "@playwright/test";

import { RESUME_DATA } from "@/data/resume-data";
import {
  MARKDOWN_MEDIA_TYPE,
  MARKDOWN_NEGOTIABLE,
  markdownAlternate,
} from "@/lib/markdown-negotiation";
import { CANONICAL_ORIGIN } from "@/lib/site-hosts";
import { config as proxyConfig } from "@/proxy";

/* #119: an agent that asks for markdown by header gets markdown, without having
   to know this site's URL conventions. The is-agentic.com scan's only failed
   essential check is this one, and it probes `/` — so the root negotiates here
   like the other two content routes, against `/index.md`.

   Fetching URLs and reading headers, in the shape of the CV route spec's exact
   `Link` assertion: what is being tested is the response an agent receives, and
   `page.goto` cannot send the header that selects it. */

const negotiable = Object.entries(MARKDOWN_NEGOTIABLE);

/* The header a browser actually sends. Kept whole rather than trimmed to
   `text/html`, because the wildcard tail is the part that would rewrite every
   ordinary request to markdown if the negotiation matched wildcards. */
const browserAccept =
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";

/* Duplicate `Vary` headers arrive as separate entries, and Next sets its router
   headers in one while the route handler sets `Accept` in another. `headers()`
   would show whichever collapsed last, so the assertions below read the array.
   Tokens are lowercased: `Vary` is a header-name list, and a cache reading it
   is case-insensitive, so the assertions should be too. */
const varyValues = (headers: { name: string; value: string }[]) =>
  headers
    .filter(({ name }) => name.toLowerCase() === "vary")
    .flatMap(({ value }) =>
      value.split(",").map((token) => token.trim().toLowerCase()),
    );

test.describe("markdown content negotiation", () => {
  for (const [route, sibling] of negotiable) {
    test(`${route} serves ${sibling} to a request that accepts markdown`, async ({
      request,
    }) => {
      const response = await request.get(route, {
        headers: { Accept: MARKDOWN_MEDIA_TYPE },
      });
      expect(response.status()).toBe(200);
      expect(
        response.headers()["content-type"],
        `${route} should answer an Accept: ${MARKDOWN_MEDIA_TYPE} request as markdown`,
      ).toContain(MARKDOWN_MEDIA_TYPE);

      /* The content-type alone is not the contract: a rewrite that missed and
         fell through to the app shell would be an HTML document under a markdown
         header. Compared against the sibling's own body, so the two doors cannot
         open onto different artifacts — and the sibling's markdown-ness is
         `content-correctness.spec.ts`'s assertion, not repeated here. */
      const [body, direct] = await Promise.all([
        response.text(),
        request.get(sibling),
      ]);
      expect(direct.status()).toBe(200);
      expect(
        body,
        `${route} and ${sibling} should serve the same markdown`,
      ).toBe(await direct.text());
      expect(
        body.toLowerCase(),
        `${route} should not answer an agent with an HTML document`,
      ).not.toContain("<html");

      /* The negotiated response only, never the HTML one: against `next dev` a
         header the proxy appends survives and in production the CDN strips it,
         so an assertion on the HTML response would pass here and be false where
         it matters (#118). This one is the route handler's own header, which is
         why it awaits `connection()`. */
      const vary = varyValues(response.headersArray());
      expect(
        vary,
        `${route} must tell a shared cache that this body depends on Accept`,
      ).toContain("accept");
      /* Next's router headers are load-bearing for prefetching, so `Vary` has
         to gain a token rather than replace them. */
      expect(
        vary,
        `${route} should keep the router headers Next sets on Vary`,
      ).toContain("rsc");
    });

    test(`${route} advertises ${sibling} in its head`, async ({ page }) => {
      /* #127: the sibling's existence should travel with the page, so an agent
         that fetched the HTML learns about markdown without already knowing to
         read `llms.txt` or `robots.txt`. `page.goto` rather than `request`: this
         is the one assertion here about the HTML response, and a browser's own
         `Accept` is what selects it — so a locator can scope to the head, which
         is where the criterion says the advertisement lives. */
      await page.goto(route);
      const advertised = page.locator(
        `head link[rel="alternate"][type="${MARKDOWN_MEDIA_TYPE}"]`,
      );

      /* Exactly one: an agent that found two would have to guess which sibling
         is this route's. */
      await expect(
        advertised,
        `${route} should advertise exactly one markdown alternate`,
      ).toHaveCount(1);

      /* Absolute, and this route's own sibling. Pinning the whole URL is what
         proves the advertisement points at the artifact negotiation serves: it
         fixes the path to the sibling, which the first test in this loop already
         holds equal to the negotiated body. */
      await expect(
        advertised,
        `${route} should advertise ${sibling} as its markdown alternate`,
      ).toHaveAttribute("href", `${CANONICAL_ORIGIN}${sibling}`);
    });

    test(`${route} still serves HTML to a browser`, async ({ request }) => {
      const response = await request.get(route, {
        headers: { Accept: browserAccept },
      });

      expect(response.status()).toBe(200);
      expect(
        response.headers()["content-type"],
        `${route} should be unaffected for a reader`,
      ).toContain("text/html");
      expect(
        (await response.text()).toLowerCase(),
        `${route} should answer a browser with a document`,
      ).toContain("<html");
    });
  }

  /* acceptmarkdown.com asks a server to honour q-values, and every case below is
     a client that would be handed markdown by a cruder reading of `Accept`. The
     wildcards are the ones worth spelling out: a bare one is curl's default, and
     one ranked above markdown is a client asking for anything *but* markdown
     first. */
  for (const [label, accept] of [
    ["sends only a wildcard", "*/*"],
    ["refuses markdown with q=0", `${MARKDOWN_MEDIA_TYPE};q=0, text/html`],
    [
      "prefers HTML by q-value",
      `${MARKDOWN_MEDIA_TYPE};q=0.5, text/html;q=0.9`,
    ],
    ["outranks markdown with a wildcard", `${MARKDOWN_MEDIA_TYPE};q=0.5, */*`],
    [
      "outranks markdown with a type wildcard",
      `${MARKDOWN_MEDIA_TYPE};q=0.1, text/*;q=0.8`,
    ],
  ] as const) {
    test(`a request that ${label} gets HTML`, async ({ request }) => {
      const response = await request.get("/cv", {
        headers: { Accept: accept },
      });

      expect(response.headers()["content-type"]).toContain("text/html");
    });
  }

  /* The helper is what keeps the advertisement derived from the map, so the
     failure mode worth pinning is a route naming a sibling the map does not
     hold: metadata is evaluated when the route renders, so throwing here means
     that route fails rather than quietly shipping a dead alternate. */
  test("advertising an unmapped path fails loudly", () => {
    expect(() => markdownAlternate("/lorenzo-germini-cv.pdf")).toThrow(
      /no markdown sibling/,
    );
  });

  test("a path with no markdown sibling is left alone", async ({ request }) => {
    const response = await request.get("/lorenzo-germini-cv.pdf", {
      headers: { Accept: MARKDOWN_MEDIA_TYPE },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
  });

  /* Next statically analyses `config.matcher` and ignores a computed value, so
     the negotiable paths are written out twice and only this keeps them equal —
     a path added to the map alone would never reach the proxy at all. */
  test("the proxy runs on exactly the negotiable paths", () => {
    expect(proxyConfig.matcher).toEqual(Object.keys(MARKDOWN_NEGOTIABLE));
  });

  test("every negotiable route is declared as markdown in llms.txt", async ({
    request,
  }) => {
    /* Negotiation is the second door onto the siblings, not a replacement for
       the first: ADR-0005 keeps the addressable set and the negotiable set the
       same, so a route added to one has to reach the index agents follow. */
    const llms = await (await request.get("/llms.txt")).text();

    expect(
      negotiable
        .map(([, sibling]) => sibling)
        .filter((sibling) => !llms.includes(`${CANONICAL_ORIGIN}${sibling}`)),
      "llms.txt should link every markdown sibling",
    ).toEqual([]);
  });
});
