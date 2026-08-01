/* Feed fixtures for the dev-only `/writing/fixture/[state]` route (#24).
 *
 * The publication is live but empty, so every count-aware transition, every
 * failure mode and the recovery from a cached miss are only reachable through
 * fixtures. These go through the real parser and the real cache path — the
 * fixture replaces the network call and nothing else — so what the tests
 * exercise is the shipped code, not a parallel rendering path.
 *
 * Loaded by dynamic import from a `NODE_ENV` branch in `substack.ts`, so a
 * production bundle never pulls the XML in.
 */

const COVER_HOST = "https://substackcdn.com/image/fetch/w_1456,c_limit";

type FixtureItem = {
  title: string;
  slug: string;
  pubDate: string;
  cover: string | null;
  excerpt: string;
  /** Words of `content:encoded`; the body is the excerpt repeated to length. */
  bodyWords: number;
};

/* Newest first, and deliberately not uniform: entry four has no `<enclosure>`
   (the feed does not guarantee one) and entry five ships a body under the
   250-word floor, so a fixture render always covers both metadata rows. */
const ITEMS: FixtureItem[] = [
  {
    title: "The demo-to-production gap",
    slug: "demo-to-production-gap",
    pubDate: "Tue, 21 Jul 2026 07:30:00 GMT",
    cover: `${COVER_HOST}/cover-01.png`,
    excerpt:
      "Every agentic RAG demo works. Almost none survive contact with real documents, real users, and real latency budgets. A field guide to the gap, from someone who lives in it.",
    bodyWords: 2480,
  },
  {
    title: "What an eval harness is actually for",
    slug: "what-an-eval-harness-is-for",
    pubDate: "Wed, 08 Jul 2026 07:30:00 GMT",
    cover: `${COVER_HOST}/cover-04.png`,
    excerpt:
      "Teams build evals to prove the model is good. The useful version does the opposite: it tells you, on the morning you ship a retrieval change, exactly which twelve documents got worse.",
    bodyWords: 1610,
  },
  {
    title: "Costruire con gli LLM in Italia",
    slug: "costruire-con-gli-llm-in-italia",
    pubDate: "Wed, 24 Jun 2026 07:30:00 GMT",
    cover: `${COVER_HOST}/cover-02.png`,
    excerpt:
      "L'Italia è piena di aziende che potrebbero usare l'AI domani mattina — e quasi nessuno che gliela costruisce. Appunti da Torino su un mercato scoperto.",
    bodyWords: 1380,
  },
  {
    title: "The compliance market has a reader problem",
    slug: "compliance-reader-problem",
    pubDate: "Wed, 03 Jun 2026 07:30:00 GMT",
    cover: null,
    excerpt:
      "ISO documentation is written to be audited and never read. Priced per hour of human attention, most of it is worthless; priced per token, the whole corpus becomes a queryable asset overnight.",
    bodyWords: 2120,
  },
  {
    title: "Pricing an agent you cannot fully predict",
    slug: "pricing-an-agent",
    pubDate: "Tue, 19 May 2026 07:30:00 GMT",
    cover: `${COVER_HOST}/cover-05.png`,
    excerpt:
      "Seat pricing assumes a human does the work at a human's rate. When the work is done by something whose marginal cost is a token bill, the pricing page is a product decision.",
    /* Under the 250-word floor — the shape a truncated paid preview arrives
       in, and equally the shape a short free post does. The row renders its
       date alone, with no invented "Paid" label either way. */
    bodyWords: 180,
  },
  {
    title: "Compliance is a language problem",
    slug: "compliance-is-a-language-problem",
    pubDate: "Tue, 28 Apr 2026 07:30:00 GMT",
    cover: `${COVER_HOST}/cover-03.png`,
    excerpt:
      "ISO audits run on documents nobody reads. What happens when the reader is a machine that never gets bored — and what that means for the SMEs drowning in paperwork.",
    bodyWords: 1750,
  },
];

const BASE = "https://lorenzogermini.substack.com";

function itemXml(item: FixtureItem): string {
  /* The body is the excerpt repeated to roughly `bodyWords`, which is all the
     reading-time computation reads. The first paragraph is still the excerpt,
     so the rendered lead-in is the one written above rather than filler. */
  const paragraphs = Math.ceil(
    item.bodyWords / item.excerpt.split(/\s+/).length,
  );
  const body = Array.from(
    { length: paragraphs },
    () => `<p>${item.excerpt}</p>`,
  ).join("");

  return `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${BASE}/p/${item.slug}</link>
      <guid isPermaLink="false">${item.slug}</guid>
      <pubDate>${item.pubDate}</pubDate>
      ${item.cover ? `<enclosure url="${item.cover}" length="0" type="image/png"/>` : ""}
      <description><![CDATA[${item.excerpt}]]></description>
      ${body ? `<content:encoded><![CDATA[${body}]]></content:encoded>` : ""}
    </item>`;
}

function feedXml(items: FixtureItem[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[germinai]]></title>
    <link>${BASE}</link>
    <description><![CDATA[Field notes on building with AI]]></description>
    ${items.map(itemXml).join("")}
  </channel>
</rss>`;
}

/** How many essays each numbered state renders. The set the acceptance
 *  criteria name, plus the transitions on either side of the thresholds. */
export const FIXTURE_COUNTS = [0, 1, 2, 3, 4, 5, 6] as const;

/* `recovering` is stateful on purpose: it is the only way to observe a cached
   miss being *replaced* by a real feed rather than merely rendering as absent
   once. It reads empty the first time and populated afterwards.

   A suffix (`recovering-<token>`) starts an independent sequence, and — since
   the state string is also the cache key — an independent cache entry. A test
   that mints its own token can therefore run the sequence from the top against
   a dev server that has already run it. */
const RECOVERING = /^recovering(-[a-z0-9]+)?$/;
const recoveringReads = new Map<string, number>();

export type FixtureFeed =
  /** the bytes a fetch would have returned */
  | { kind: "xml"; xml: string }
  /** the fetch itself fails — DNS, timeout, non-200 */
  | { kind: "unreachable" }
  | { kind: "unknown" };

export function substackFixture(state: string): FixtureFeed {
  if (state === "unreachable") return { kind: "unreachable" };
  if (state === "malformed") {
    /* Well-formed enough to fetch, not enough to parse: a Cloudflare
       interstitial is the shape this actually arrives in. */
    return { kind: "xml", xml: "<html><body>Just a moment…</body></html>" };
  }
  if (RECOVERING.test(state)) {
    const reads = recoveringReads.get(state) ?? 0;
    recoveringReads.set(state, reads + 1);
    return { kind: "xml", xml: feedXml(reads === 0 ? [] : ITEMS.slice(0, 3)) };
  }

  const count = Number(state);
  if (!isFixtureCount(count)) return { kind: "unknown" };
  return { kind: "xml", xml: feedXml(ITEMS.slice(0, count)) };
}

/** Whether a URL segment names a fixture at all — the route 404s if not,
 *  rather than letting a typo render as the empty state. */
export function isFixtureState(state: string): boolean {
  return (
    state === "unreachable" ||
    state === "malformed" ||
    RECOVERING.test(state) ||
    isFixtureCount(Number(state))
  );
}

function isFixtureCount(
  count: number,
): count is (typeof FIXTURE_COUNTS)[number] {
  return FIXTURE_COUNTS.includes(count as (typeof FIXTURE_COUNTS)[number]);
}
