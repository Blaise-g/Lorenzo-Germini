/* Manual feed invalidation (spec §2.5 part 3, fully specified there — there is
 * no implementer choice in this file).
 *
 * The whole point of the feed is that the site does not redeploy when Lorenzo
 * publishes, so redeploy-to-purge is not the fallback: this is. It revalidates
 * `substack-feed` and nothing else.
 *
 * POST only. A `GET` that mutates is a prefetch away from being triggered by a
 * crawler, and the secret never travels in the query string — Next answers 405
 * for every method this file does not export.
 */

import { createHash, timingSafeEqual } from "node:crypto";

import { revalidateTag } from "next/cache";

import { SUBSTACK_FEED_TAG } from "@/lib/substack";

/* Tests run against `bun run dev`, which reuses whatever server is already
   running, so the secret cannot be injected per-run. Outside production the
   endpoint falls back to a published dev value; in production an unset
   variable leaves `secret` undefined and every request is refused. */
const DEV_FALLBACK_SECRET = "dev-substack-revalidate-secret";

function expectedSecret(): string | undefined {
  return (
    process.env.SUBSTACK_REVALIDATE_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : DEV_FALLBACK_SECRET)
  );
}

/** Compares digests, so neither the length nor the content of the presented
 *  token is readable from how long the comparison took. */
function matches(presented: string, expected: string): boolean {
  return timingSafeEqual(sha256(presented), sha256(expected));
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export async function POST(request: Request): Promise<Response> {
  const expected = expectedSecret();
  const presented = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];

  /* A missing header still runs a comparison, against a value that cannot
     match, so the refusal path costs the same either way. */
  if (!expected || !matches(presented ?? "", expected)) {
    return new Response(null, { status: 401 });
  }

  /* `"max"` is stale-while-revalidate rather than immediate expiry, which is
     what makes invalidation request-driven: the first request after this may
     still be served the stale entry while the regeneration it triggers runs,
     and a later one observes the new feed. Nobody waits on Substack. */
  revalidateTag(SUBSTACK_FEED_TAG, "max");

  return new Response(null, { status: 204 });
}
