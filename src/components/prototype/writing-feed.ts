// PROTOTYPE — a fake Substack RSS feed, in the shape src/lib/substack.ts will
// return (issue #13). Deliberately feed-shaped, not view-shaped: only fields
// the native feed actually carries survive here, so the prototype cannot
// accidentally render data the real integration will not have.
//
// #10 decision 8: no per-item language, no tags, no reading time in the feed.
// Reading time is COMPUTED from the content:encoded word count, and omitted
// when the body looks previewed (paid post → truncated preview).
//
// Delete with the rest of src/components/prototype/ only when the Phase 2 §2.6
// homepage swap merges.

export type FeedItem = {
  title: string;
  /** the feed's <link> — always an outbound /p/<slug> on Substack */
  link: string;
  /** <pubDate>, ISO here for prototype determinism */
  pubDate: string;
  /** <enclosure url>; the feed does NOT guarantee one → coverless fallback */
  cover: string | null;
  /** first paragraph of content:encoded */
  excerpt: string;
  /** content:encoded word count */
  words: number;
  /** body looks truncated (paid post) → reading time is omitted, not guessed */
  previewed?: boolean;
};

const WPM = 230;

export function readingMinutes(item: FeedItem): number | null {
  if (item.previewed) return null;
  return Math.max(1, Math.round(item.words / WPM));
}

/* Newest first — the order Substack's feed returns. */
export const FEED: FeedItem[] = [
  {
    title: "The demo-to-production gap",
    link: "https://lorenzogermini.substack.com/p/demo-to-production-gap",
    pubDate: "2026-07-21",
    cover: "/prototype/covers/cover-01.png",
    excerpt:
      "Every agentic RAG demo works. Almost none survive contact with real documents, real users, and real latency budgets. A field guide to the gap, from someone who lives in it.",
    words: 2480,
  },
  {
    title: "What an eval harness is actually for",
    link: "https://lorenzogermini.substack.com/p/what-an-eval-harness-is-for",
    pubDate: "2026-07-08",
    cover: "/prototype/covers/cover-04.png",
    excerpt:
      "Teams build evals to prove the model is good. The useful version does the opposite: it tells you, on the morning you ship a retrieval change, exactly which twelve documents got worse.",
    words: 1610,
  },
  {
    title: "Costruire con gli LLM in Italia",
    link: "https://lorenzogermini.substack.com/p/costruire-con-gli-llm-in-italia",
    pubDate: "2026-06-24",
    cover: "/prototype/covers/cover-02.png",
    excerpt:
      "L'Italia è piena di aziende che potrebbero usare l'AI domani mattina — e quasi nessuno che gliela costruisce. Appunti da Torino su un mercato scoperto, e su perché il collo di bottiglia non è il modello.",
    words: 1380,
  },
  {
    title: "The compliance market has a reader problem",
    link: "https://lorenzogermini.substack.com/p/compliance-reader-problem",
    pubDate: "2026-06-03",
    /* #10 decision 7: the feed does not guarantee <enclosure> → fallback. */
    cover: null,
    excerpt:
      "ISO documentation is written to be audited and never read. Priced per hour of human attention, most of it is worthless; priced per token, the whole corpus becomes a queryable asset overnight.",
    words: 2120,
  },
  {
    title: "Pricing an agent you cannot fully predict",
    link: "https://lorenzogermini.substack.com/p/pricing-an-agent",
    pubDate: "2026-05-19",
    cover: "/prototype/covers/cover-05.png",
    excerpt:
      "Seat pricing assumes a human does the work at a human's rate. When the work is done by something whose marginal cost is a token bill and whose output varies run to run, the pricing page is a product decision.",
    words: 1940,
    /* paid post: content:encoded ships a truncated preview → no reading time */
    previewed: true,
  },
  {
    title: "Compliance is a language problem",
    link: "https://lorenzogermini.substack.com/p/compliance-is-a-language-problem",
    pubDate: "2026-04-28",
    cover: "/prototype/covers/cover-03.png",
    excerpt:
      "ISO audits run on documents nobody reads. What happens when the reader is a machine that never gets bored — and what that means for the SMEs drowning in paperwork.",
    words: 1750,
  },
];

/**
 * #10 decision 4: numbering is by publication order ascending — oldest is 01 —
 * so publishing a new essay never renumbers the existing ones. Computed from
 * the whole feed, not from the rendered slice.
 */
export function withNumbers(items: FeedItem[]) {
  const ascending = [...items].sort(
    (a, b) => +new Date(a.pubDate) - +new Date(b.pubDate),
  );
  const number = new Map(
    ascending.map((item, i) => [item.link, String(i + 1).padStart(2, "0")]),
  );
  return items.map((item) => ({ item, number: number.get(item.link)! }));
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
