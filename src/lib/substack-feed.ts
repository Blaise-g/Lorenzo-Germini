/* Substack RSS → the `Essay` shape the index renders (spec §2.5, issue #24).
 *
 * Deliberately pure and free of `next/*` and `server-only` imports: fetching,
 * caching and cache lifetimes live in `substack.ts`, so everything that can go
 * wrong in *parsing* — a malformed document, a missing body, a duplicated
 * entry — is exercisable without a server. Nothing here throws: an input this
 * module cannot make sense of yields fewer essays, never an exception, because
 * the caller's contract is that a bad feed makes the surface absent rather
 * than the build red.
 */

import { XMLParser } from "fast-xml-parser";

import { SUBSTACK_IMAGE_HOSTS } from "./substack-image-hosts";

export type Essay = {
  /** the feed's `<link>` — always an outbound `/p/<slug>` on Substack */
  url: string;
  title: string;
  /** `<pubDate>` normalised to ISO */
  publishedAt: string;
  /** `<enclosure url>`; null when absent, or hosted somewhere unexpected */
  coverUrl: string | null;
  /** first paragraph of `content:encoded`, falling back to `<description>` */
  excerpt: string;
  /** null when the body is absent or short — see `readingMinutes` */
  readingMinutes: number | null;
};

/* Decision 7 (locked): reading time is computed, and omitted when the body is
   absent or under the floor. It is NOT a paywall detector — a truncated paid
   preview and a genuinely short free post are indistinguishable here, so the
   metadata row drops to the date alone rather than labelling either. */
const READING_TIME_FLOOR_WORDS = 250;
const WORDS_PER_MINUTE = 230;

const EXCERPT_MAX_CHARS = 260;

/* Locked cache policy, part 1 (spec §2.5): hourly until the archive reaches
   four posts, then daily; a miss takes its own short profile and never
   inherits a success lifetime. Four is a chosen operational policy, not a
   measured optimum — it is where the count-aware rendering stops changing
   shape on publish, so hourly revalidation stops earning its keep. Nothing
   else depends on the number.

   It lives here, in the module without `next/*` imports, so the policy is one
   testable function rather than a branch buried in a cached call. */
export const DAILY_CACHE_THRESHOLD = 4;

export type FeedCacheProfile = "feedMiss" | "hours" | "days";

export function feedCacheProfile(essayCount: number): FeedCacheProfile {
  if (essayCount === 0) return "feedMiss";
  return essayCount >= DAILY_CACHE_THRESHOLD ? "days" : "hours";
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  /* Off, or a numeric title ("2026") parses to a number and a leading-zero
     slug loses its zeros. Every field this module reads is text. */
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

export function parseSubstackFeed(xml: string): Essay[] {
  const items = channelItems(xml);
  const essays: Essay[] = [];
  /* One `<item>` per language version is a live possibility — the publication
     has "Additional post languages" enabled and how Substack represents that
     in RSS is unverified (#24). De-duplicating on the canonical link keeps a
     doubled entry from shifting the count-aware thresholds; it costs nothing
     if the risk turns out to be empty. */
  const seen = new Set<string>();

  for (const item of items) {
    const essay = toEssay(item);
    if (!essay) continue;
    const key = canonicalKey(essay.url);
    if (seen.has(key)) continue;
    seen.add(key);
    essays.push(essay);
  }

  /* Newest first — the order Substack returns, but asserted rather than
     trusted, since the lead treatment depends on it. */
  return essays.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function readingMinutes(body: string | null): number | null {
  if (!body) return null;
  const words = countWords(stripHtml(body));
  if (words < READING_TIME_FLOOR_WORDS) return null;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/* One formatter for the whole app rather than one per metadata row. UTC, so a
   date rendered on the server and rehydrated in another zone cannot disagree
   with itself by a day. */
const ESSAY_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatEssayDate(iso: string): string {
  return ESSAY_DATE.format(new Date(iso));
}

/* ─── Parsing internals ─── */

type FeedNode = Record<string, unknown>;

function channelItems(xml: string): FeedNode[] {
  let document: unknown;
  try {
    document = parser.parse(xml);
  } catch {
    return [];
  }

  const rss = asNode(document)?.rss;
  const channel = asNode(rss)?.channel;
  const item = asNode(channel)?.item;
  if (item === undefined) return [];
  return (Array.isArray(item) ? item : [item])
    .map(asNode)
    .filter((node): node is FeedNode => node !== null);
}

function toEssay(item: FeedNode): Essay | null {
  const title = text(item.title);
  const url = absoluteUrl(text(item.link));
  const publishedAt = isoDate(text(item.pubDate));
  if (!title || !url || !publishedAt) return null;

  const body = text(item["content:encoded"]);

  return {
    url,
    title,
    publishedAt,
    coverUrl: coverFromEnclosure(item.enclosure),
    excerpt: excerptFrom(body, text(item.description)),
    readingMinutes: readingMinutes(body),
  };
}

function asNode(value: unknown): FeedNode | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as FeedNode)
    : null;
}

/** Reads a tag whether the parser gave back a string or an attributed node. */
function text(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  const node = asNode(value);
  if (node && "#text" in node) return text(node["#text"]);
  return null;
}

function absoluteUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function isoDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Host, path and nothing else: query strings and fragments do not identify
 *  a different essay. */
function canonicalKey(url: string): string {
  const { host, pathname } = new URL(url);
  return `${host}${pathname.replace(/\/+$/, "")}`.toLowerCase();
}

function coverFromEnclosure(enclosure: unknown): string | null {
  const node = asNode(Array.isArray(enclosure) ? enclosure[0] : enclosure);
  const url = absoluteUrl(text(node?.["@_url"]));
  if (!url) return null;
  const { hostname } = new URL(url);
  return SUBSTACK_IMAGE_HOSTS.some((host) => hostname === host) ? url : null;
}

function excerptFrom(body: string | null, description: string | null): string {
  const firstParagraph = body?.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  const source = firstParagraph ?? body ?? description ?? "";
  return clamp(stripHtml(source));
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/* `content:encoded` arrives inside CDATA, so its entities survive the XML
   parse as literal text. Only the five that actually appear in prose. */
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

function decodeEntities(value: string): string {
  return value.replace(
    /&(amp|lt|gt|quot|#39|nbsp);/g,
    (entity) => ENTITIES[entity] ?? entity,
  );
}

function countWords(value: string): number {
  return value ? value.split(/\s+/).length : 0;
}

function clamp(value: string): string {
  if (value.length <= EXCERPT_MAX_CHARS) return value;
  const cut = value.slice(0, EXCERPT_MAX_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/, "")}…`;
}
