import { NextResponse, type NextRequest } from "next/server";

import {
  MARKDOWN_NEGOTIABLE,
  prefersMarkdown,
} from "@/lib/markdown-negotiation";

/**
 * Content negotiation for agents: a request carrying `Accept: text/markdown` is
 * rewritten to the matching `.md` sibling, so an agent gets markdown by header
 * without having to know this site's URL conventions (GH-119).
 *
 * This is the site's first proxy — Next 16's name for what was `middleware.ts`,
 * and it is where the header read has to live: a proxy runs outside the Cache
 * Components model, where a component-level `headers()` read would need a
 * `<Suspense>` boundary and `next build` would not report its absence
 * (ADR-0005).
 *
 * It sets no headers of its own; `Vary: Accept` is `markdownResponse`'s, for the
 * reason recorded there (GH-118). What this file buys instead is cache safety by
 * key: a proxy runs before the CDN cache lookup, so the rewritten path is what
 * the CDN keys on and the two representations are separate entries.
 */
export function proxy(request: NextRequest) {
  /* GET and HEAD only: nothing else has a markdown sibling to be rewritten to,
     and a rewritten POST would land on a route handler that answers 405. */
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const sibling = MARKDOWN_NEGOTIABLE[request.nextUrl.pathname];
  if (sibling === undefined) return NextResponse.next();
  if (!prefersMarkdown(request.headers.get("accept"))) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL(sibling, request.url));
}

/**
 * Only the negotiable paths reach the proxy, so no other request — the siblings
 * themselves, the manifests, `/_next`, the PDF — pays for a lookup that would
 * decline it anyway.
 *
 * Spelled out rather than derived from `MARKDOWN_NEGOTIABLE`: Next statically
 * analyses this value at build time and ignores anything computed, so a fourth
 * negotiable path added to that map would silently never reach here. The spec
 * pins the two lists equal for that reason.
 */
export const config = {
  matcher: ["/", "/cv", "/writing"],
};
