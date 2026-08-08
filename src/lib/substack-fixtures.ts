/* Feed fixtures for the dev-only `/writing/fixture/[state]` route (GH-24).
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
      "L'Italia è piena di aziende che potrebbero usare l'AI domani mattina — e quasi nessuno che gliela costruisce. Appunti da Cuneo su un mercato scoperto.",
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
   once. The first read is the miss, every read after it returns three essays.

   `recovering-<miss>` picks which miss to recover from — all three must
   recover, not just the empty one. A trailing token
   (`recovering-malformed-k3f9`) starts an independent sequence and, since the
   state string is also the cache key, an independent cache entry: a test that
   mints its own token can run the sequence from the top against a dev server
   that has already run it. */
const RECOVERING =
  /^recovering(?:-(empty|malformed|unreachable))?(?:-[a-z0-9]+)?$/;

/* One entry per recovery sequence, and tests mint a fresh token per run, so
   this is capped: a dev server that has run the suite fifty times holds the
   last few sequences and forgets the rest. An evicted sequence simply starts
   over, which is the state a test wants anyway. */
const MAX_RECOVERING_SEQUENCES = 32;
const recoveringReads = new Map<string, number>();

/** The three shapes a feed read fails in. Every one is an empty essay list to
 *  the parser's caller — that indistinguishability is the contract. */
type MissKind = "empty" | "malformed" | "unreachable";

/** What a URL segment asks for, or null when it names no fixture at all. One
 *  parse, so the route's 404 guard and the feed itself cannot drift apart. */
type FixtureRequest =
  | { kind: "count"; count: number }
  | { kind: "miss"; miss: MissKind }
  | { kind: "recovering"; miss: MissKind; sequence: string };

export type FixtureFeed =
  /** the bytes a fetch would have returned */
  | { kind: "xml"; xml: string }
  /** the fetch itself fails — DNS, timeout, non-200 */
  | { kind: "unreachable" };

/* Well-formed enough to fetch, not enough to parse. A Cloudflare interstitial
   is the shape this actually arrives in. */
const MALFORMED = "<html><body>Just a moment…</body></html>";

function parseFixtureState(state: string): FixtureRequest | null {
  const recovering = RECOVERING.exec(state);
  if (recovering) {
    return {
      kind: "recovering",
      miss: (recovering[1] as MissKind | undefined) ?? "empty",
      sequence: state,
    };
  }

  if (state === "unreachable" || state === "malformed") {
    return { kind: "miss", miss: state };
  }

  const count = Number(state);
  return isFixtureCount(count) ? { kind: "count", count } : null;
}

/** The feed a state stands for. An unrecognised state cannot reach here — the
 *  route 404s on it — and reads as unreachable if it ever does. */
export function substackFixture(state: string): FixtureFeed {
  const request = parseFixtureState(state);
  if (request === null) return { kind: "unreachable" };

  switch (request.kind) {
    case "count":
      return { kind: "xml", xml: feedXml(ITEMS.slice(0, request.count)) };
    case "miss":
      return missFeed(request.miss);
    case "recovering":
      return advanceRecovery(request);
  }
}

function advanceRecovery(request: {
  miss: MissKind;
  sequence: string;
}): FixtureFeed {
  const reads = recoveringReads.get(request.sequence) ?? 0;
  if (recoveringReads.size >= MAX_RECOVERING_SEQUENCES && reads === 0) {
    recoveringReads.delete(recoveringReads.keys().next().value!);
  }
  recoveringReads.set(request.sequence, reads + 1);

  return reads === 0
    ? missFeed(request.miss)
    : { kind: "xml", xml: feedXml(ITEMS.slice(0, 3)) };
}

function missFeed(miss: MissKind): FixtureFeed {
  switch (miss) {
    case "unreachable":
      return { kind: "unreachable" };
    case "malformed":
      return { kind: "xml", xml: MALFORMED };
    case "empty":
      return { kind: "xml", xml: feedXml([]) };
  }
}

/** Whether a URL segment names a fixture at all — the route 404s if not,
 *  rather than letting a typo render as the empty state. */
export function isFixtureState(state: string): boolean {
  return parseFixtureState(state) !== null;
}

function isFixtureCount(
  count: number,
): count is (typeof FIXTURE_COUNTS)[number] {
  return FIXTURE_COUNTS.includes(count as (typeof FIXTURE_COUNTS)[number]);
}
