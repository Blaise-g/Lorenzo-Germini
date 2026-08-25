import { NextResponse, type NextRequest } from "next/server";

import {
  markdownSiblingFor,
  prefersMarkdown,
} from "@/lib/markdown-negotiation";

/**
 * Content negotiation for agents: a request carrying `Accept: text/markdown` is
 * rewritten to the matching `.md` sibling, so an agent gets markdown by header
 * without having to know this site's URL conventions (GH-119).
 *
 * This is the site's first proxy — Next 16's name for what was `middleware.ts`,
 * and it is where the header read has to live. `cacheComponents: true` is set,
 * so reading request headers inside a component requires a `<Suspense>`
 * boundary and `next build` does not report the violation; a proxy runs outside
 * that model entirely (ADR-0005).
 *
 * It sets no headers of its own. `Vary: Accept` is the sibling route's, because
 * a header appended here survives `next dev` and is stripped in production,
 * which is worse than not setting it (GH-118). What this file buys instead is
 * cache safety by key: a proxy runs before the CDN cache lookup, so the
 * rewritten path is what the CDN keys on and the two representations are
 * separate entries.
 */
export function proxy(request: NextRequest) {
  /* GET and HEAD only: nothing else has a markdown sibling to be rewritten to,
     and a rewritten POST would land on a route handler that answers 405. */
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const sibling = markdownSiblingFor(request.nextUrl.pathname);
  if (sibling === undefined) return NextResponse.next();
  if (!prefersMarkdown(request.headers.get("accept"))) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL(sibling, request.url));
}

/**
 * Only the negotiable paths reach the proxy. The matcher is a literal list
 * rather than a pattern: every other request — the siblings themselves, the
 * static manifests, `/_next`, the PDF — should not pay for a rewrite that
 * `markdownSiblingFor` would decline anyway.
 */
export const config = {
  matcher: ["/", "/cv", "/writing"],
};
