import type { BrowserContext, Page } from "@playwright/test";

/* The dev-only fixture route (#24). `/writing` itself renders the live feed,
   which is empty and will stay small for a while, so every count-aware state
   and every failure mode is asserted through these. */
export function fixtureRoute(state: string, query = "") {
  return `/writing/fixture/${state}${query}`;
}

/** The dev fallback in `src/app/api/revalidate/substack/route.ts`. The suite
 *  reuses whatever dev server is already running, so a per-run secret cannot
 *  be injected. */
export const REVALIDATE_SECRET = "dev-substack-revalidate-secret";

export const REVALIDATE_ROUTE = "/api/revalidate/substack";

/* Fixture covers name real Substack hosts, because the parser drops anything
   else and that rule is part of what these tests cover. Nothing is published
   there, so the optimizer would 502 on every one; this serves a 1×1 instead.
   Geometry comes from the wrapper's aspect ratio, not from the file. */
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export function stubCoverImages(target: BrowserContext | Page) {
  return target.route("**/_next/image**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PIXEL_PNG }),
  );
}

/** Every essay link the index rendered, in DOM order. */
export async function essayTitles(page: Page) {
  return page.locator("main article h2 a").allInnerTexts();
}
