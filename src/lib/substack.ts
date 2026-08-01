/* The one door to the Substack feed (spec §2.5, issue #24).
 *
 * `server-only`, because the browser cannot reach the feed at all: Substack
 * serves it without CORS headers. Everything a caller gets back is already
 * parsed, de-duplicated and failure-tolerant — an unreachable, empty or
 * malformed feed is an empty array, never a throw, so the index renders as
 * absent instead of taking a build or a request down with it.
 */

import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { RESUME_DATA } from "@/data/resume-data";
import { parseSubstackFeed, type Essay } from "@/lib/substack-feed";

export type { Essay };

export const SUBSTACK_BASE = RESUME_DATA.newsletter.url;
export const SUBSTACK_FEED_URL = `${SUBSTACK_BASE}/feed`;
export const SUBSTACK_ARCHIVE_URL = `${SUBSTACK_BASE}/archive`;

/** The one tag `POST /api/revalidate/substack` invalidates. */
export const SUBSTACK_FEED_TAG = "substack-feed";

/* Locked cache policy, part 1: hourly until the archive reaches four posts,
   then daily. Four is a chosen operational policy, not a measured optimum —
   it is where the count-aware rendering stops changing shape on publish, so
   hourly revalidation stops earning its keep. Nothing else depends on it. */
const DAILY_CACHE_THRESHOLD = 4;

const FEED_TIMEOUT_MS = 5_000;

/**
 * Every essay in the feed, newest first.
 *
 * @param fixture - dev and test only: renders a canned feed instead of the
 *   network one, through this same cache and parser. Ignored in production.
 */
export async function getEssays(fixture?: string): Promise<Essay[]> {
  "use cache";
  cacheTag(SUBSTACK_FEED_TAG);

  const xml = await readFeed(fixture);
  const essays = xml === null ? [] : parseSubstackFeed(xml);

  /* Part 2: a miss must never inherit a success lifetime. `feedMiss` is
     defined in `next.config.ts` at stale 60 / revalidate 300 / expire 900, so
     deploying before the first post exists cannot cache "there is no writing"
     for a day — which is what part 1 alone would do. The branch is spelled out
     rather than computed because `cacheLife` is typed as one overload per
     configured profile name, and a union does not resolve against those. */
  if (essays.length === 0) {
    cacheLife("feedMiss");
  } else if (essays.length >= DAILY_CACHE_THRESHOLD) {
    cacheLife("days");
  } else {
    cacheLife("hours");
  }

  return essays;
}

/** The feed's bytes, or null when it could not be read at all. */
async function readFeed(fixture?: string): Promise<string | null> {
  if (fixture && process.env.NODE_ENV !== "production") {
    /* Dynamic so the fixture XML never enters a production bundle. */
    const { substackFixture } = await import("@/lib/substack-fixtures");
    const feed = substackFixture(fixture);
    return feed.kind === "xml" ? feed.xml : null;
  }

  try {
    const response = await fetch(SUBSTACK_FEED_URL, {
      headers: { accept: "application/rss+xml, application/xml;q=0.9" },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    /* Unreachable, timed out, or hung up mid-body. Indistinguishable from an
       empty feed to every caller, and treated identically. */
    return null;
  }
}
