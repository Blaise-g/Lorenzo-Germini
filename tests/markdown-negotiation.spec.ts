import { expect, test } from "@playwright/test";

import { RESUME_DATA } from "@/data/resume-data";
import {
  MARKDOWN_MEDIA_TYPE,
  MARKDOWN_NEGOTIABLE,
} from "@/lib/markdown-negotiation";

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
   would show whichever collapsed last, so the assertions below read the array. */
const varyValues = (headers: { name: string; value: string }[]) =>
  headers
    .filter(({ name }) => name.toLowerCase() === "vary")
    .flatMap(({ value }) => value.split(",").map((token) => token.trim()));

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
         fell through to the app shell would be an HTML document under a
         markdown header. The body is compared to the sibling's own, so the two
         doors cannot open onto different artifacts. */
      const body = await response.text();
      const direct = await request.get(sibling);
      expect(direct.status()).toBe(200);
      expect(
        body,
        `${route} and ${sibling} should serve the same markdown`,
      ).toBe(await direct.text());
      expect(
        body.startsWith(`# ${RESUME_DATA.name}`),
        `${route} should answer with markdown, got: ${body.slice(0, 60)}`,
      ).toBe(true);
      expect(
        body.toLowerCase(),
        `${route} should not answer an agent with an HTML document`,
      ).not.toContain("<html");
    });

    /* The negotiated response only, never the HTML one: against `next dev` a
       header the proxy appends survives, and in production the CDN strips it, so
       an assertion on the HTML response would pass here and be false where it
       matters (GH-118). This one is the route handler's own header, which is why
       the handler awaits `connection()` — a prerendered route has its `Vary`
       overwritten with the router headers asserted alongside it. */
    test(`the markdown served at ${route} varies on Accept`, async ({
      request,
    }) => {
      const response = await request.get(route, {
        headers: { Accept: MARKDOWN_MEDIA_TYPE },
      });
      const vary = varyValues(response.headersArray());

      expect(
        vary,
        `${route} must tell a shared cache that this body depends on Accept`,
      ).toContain("Accept");
      /* Next's router headers are load-bearing for prefetching, so `Vary` has
         to gain a token rather than replace them. */
      expect(
        vary,
        `${route} should keep the router headers Next sets on Vary`,
      ).toContain("rsc");
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

  /* acceptmarkdown.com asks a server to honour q-values, and both cases below
     are a client that named markdown and still wants HTML more. `q=0` is an
     explicit refusal; the second is a plain preference. */
  for (const [label, accept] of [
    ["refuses markdown with q=0", `${MARKDOWN_MEDIA_TYPE};q=0, text/html`],
    [
      "prefers HTML by q-value",
      `${MARKDOWN_MEDIA_TYPE};q=0.5, text/html;q=0.9`,
    ],
  ] as const) {
    test(`a request that ${label} gets HTML`, async ({ request }) => {
      const response = await request.get("/cv", {
        headers: { Accept: accept },
      });

      expect(response.headers()["content-type"]).toContain("text/html");
    });
  }

  test("a path with no markdown sibling is left alone", async ({ request }) => {
    /* The PDF, because it is the one non-negotiable path that proves the point
       twice: it carries a header of its own (#104), so a rewrite would be
       visible as that header going missing as well as in the content-type. */
    const response = await request.get("/lorenzo-germini-cv.pdf", {
      headers: { Accept: MARKDOWN_MEDIA_TYPE },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    expect(response.headers().link).toBe(
      '<https://lorenzogermini.com/cv>; rel="canonical"',
    );
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
        .filter(
          (sibling) =>
            !llms.includes(
              new URL(sibling, RESUME_DATA.personalWebsiteUrl).href,
            ),
        ),
      "llms.txt should link every markdown sibling",
    ).toEqual([]);
  });
});
