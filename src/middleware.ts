import { type NextRequest, NextResponse } from "next/server";

/**
 * Throwaway probe for GH-118: does Vercel's CDN key cache variants on
 * `Vary: Accept`? Nothing here is the shipping shape — GH-119 owns that, and
 * only if this probe reports yes. The extra `x-probe-*` headers exist so a
 * `curl -I` can tell "middleware negotiated" from "the CDN replayed a stored
 * representation", which is the whole question.
 */
const SIBLINGS = new Map([
  ["/cv", "/cv.md"],
  ["/writing", "/writing.md"],
]);

const wantsMarkdown = (accept: string | null) =>
  accept !== null && accept.includes("text/markdown");

export function middleware(request: NextRequest) {
  const sibling = SIBLINGS.get(request.nextUrl.pathname);
  const accept = request.headers.get("accept");
  const negotiated = sibling !== undefined && wantsMarkdown(accept);

  const response = negotiated
    ? NextResponse.rewrite(new URL(sibling, request.url))
    : NextResponse.next();

  response.headers.append("Vary", "Accept");
  response.headers.set("x-probe-negotiated", negotiated ? "md" : "html");
  response.headers.set("x-probe-accept", accept ?? "(none)");

  return response;
}

export const config = {
  matcher: ["/cv", "/writing"],
};
