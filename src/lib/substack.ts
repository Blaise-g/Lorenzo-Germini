/* The one door to the Substack *network* (spec §2.5, GH-24). The `Essay`
 * shape and the presentation helpers around it live in `substack-feed.ts`,
 * which components can import; this module cannot be one of their imports
 * because it is server-only.
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
import {
  feedCacheProfile,
  parseSubstackFeed,
  type Essay,
} from "@/lib/substack-feed";

export const SUBSTACK_BASE = RESUME_DATA.newsletter.url;
export const SUBSTACK_FEED_URL = `${SUBSTACK_BASE}/feed`;
export const SUBSTACK_ARCHIVE_URL = `${SUBSTACK_BASE}/archive`;

/** The one tag `POST /api/revalidate/substack` invalidates. */
export const SUBSTACK_FEED_TAG = "substack-feed";

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

  /* `feedMiss` is defined in `next.config.ts` at stale 60 / revalidate 300 /
     expire 900, so deploying before the first post exists cannot cache "there
     is no writing" for a day. The switch only exists to turn the policy's
     return value into a literal: `cacheLife` is typed as one overload per
     configured profile name, and a union does not resolve against those. */
  switch (feedCacheProfile(essays.length)) {
    case "feedMiss":
      cacheLife("feedMiss");
      break;
    case "days":
      cacheLife("days");
      break;
    case "hours":
      cacheLife("hours");
      break;
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
