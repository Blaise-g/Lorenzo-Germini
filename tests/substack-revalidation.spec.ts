/* Issue #24 — the cache policy and its escape hatch (spec §2.5 parts 2 and 3).
 *
 * The defect this exists to catch is the one the spec calls out by name:
 * failure-as-absence plus a long cache lifetime means deploying before the
 * first post exists caches "there is no writing" and keeps serving it, on the
 * surface the site's primary CTA points at, during the only week anyone is
 * looking. A tag does nothing until something calls `revalidateTag`, so the
 * endpoint below is not a convenience — it is the fix's other half.
 *
 * Verification is a sequence, not an inspection: a miss must be observed
 * *recovering*, not merely rendering as absent once.
 */

import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  fixtureRoute,
  REVALIDATE_ROUTE,
  REVALIDATE_SECRET,
} from "./support/writing-fixtures";

/** A private recovery sequence and a private cache entry, so this file can run
 *  against a dev server that has already run it. */
function recoveringState() {
  return `recovering-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function essayCount(request: APIRequestContext, state: string) {
  const response = await request.get(fixtureRoute(state));
  expect(response.status()).toBe(200);
  const html = await response.text();
  return new Set(
    html.match(/href=\\?"https:\/\/lorenzogermini\.substack\.com\/p\/[a-z-]+/g),
  ).size;
}

function revalidate(request: APIRequestContext, token?: string) {
  return request.post(REVALIDATE_ROUTE, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

test.describe("the invalidation endpoint", () => {
  test("refuses a missing or wrong secret with 401 and no body", async ({
    request,
  }) => {
    for (const token of [undefined, "", "wrong", REVALIDATE_SECRET.slice(1)]) {
      const response = await revalidate(request, token);
      expect(response.status(), `token: ${token}`).toBe(401);
      expect(await response.text()).toBe("");
    }
  });

  test("accepts the bearer secret with 204 and no body", async ({
    request,
  }) => {
    const response = await revalidate(request, REVALIDATE_SECRET);
    expect(response.status()).toBe(204);
    expect(await response.text()).toBe("");
  });

  test("has no GET mutation and takes no secret in the query string", async ({
    request,
  }) => {
    /* A `GET` that revalidates is a prefetch away from being triggered by a
       crawler. Next answers 405 for a method the route does not export, which
       is the contract being asserted — that no such method exists. */
    for (const response of [
      await request.get(REVALIDATE_ROUTE),
      await request.get(`${REVALIDATE_ROUTE}?secret=${REVALIDATE_SECRET}`),
      await request.head(REVALIDATE_ROUTE),
    ]) {
      expect(response.status()).toBe(405);
    }
  });
});

test.describe("a cached miss recovers", () => {
  test("the absence is cached, then replaced once the tag is invalidated", async ({
    request,
  }) => {
    const state = recoveringState();

    /* The feed reads empty the first time: the surface is absent, and that
       absence is now in the cache under the short feed-miss profile. */
    expect(await essayCount(request, state)).toBe(0);
    /* Still absent — and this is also what proves the entry was cached rather
       than recomputed: the fixture returns three essays on every read after
       its first, so a second render of zero can only have come from the
       cache. Without that, the hourly and daily lifetimes mean nothing. */
    expect(await essayCount(request, state)).toBe(0);

    expect((await revalidate(request, REVALIDATE_SECRET)).status()).toBe(204);

    /* Revalidation is request-driven and stale-while-revalidate, so the first
       request after it may still be served the stale absence while triggering
       the regeneration that a later request observes. The sequence is what is
       asserted, not instant recovery. */
    await expect
      .poll(() => essayCount(request, state), {
        message:
          "the invalidated miss should be replaced by the recovered feed",
        timeout: 15_000,
      })
      .toBe(3);
  });
});
