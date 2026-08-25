---
status: accepted
---

# Agents get markdown from `.md` siblings, with middleware negotiating `Accept`

Decided in #115, 2026-08-25, from the is-agentic.com scan of 2026-08-24 (75/100). The scan's only failed
_essential_ check is markdown content negotiation: `Accept: text/markdown` against `/` returns
`text/html; charset=utf-8`, and the response `Vary` carries Next's router headers
(`rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch`) and not
`Accept`. The site has no `middleware.ts` and no `.md` route of any kind.

The markdown an agent reads is generated from `RESUME_DATA` and served at its own `.md` URLs,
linked from `public/llms.txt`. A thin `middleware.ts` rewrites requests carrying
`Accept: text/markdown` to the matching `.md` route. The files are the same artifact either way —
negotiation is a second door onto them, not a second copy of them. It does not add `Accept` to
`Vary`, because it cannot: GH-118 found that Vercel replaces `Vary` on Next routes, from every layer
that could set it.

## Considered options

**Negotiation alone**, rendering markdown inline from the HTML route, is what the check literally
asks for and was rejected as the whole answer. It leaves the markdown addressable only by a header,
so it cannot be linked from `llms.txt`, cannot be curled without a flag, and cannot be asserted by
a test that fetches a URL. An agent that has the URL is in a strictly better position than one that
has to know the convention.

**`.md` siblings alone** was the first recommendation in this session and was corrected: it scores
**zero** on the failed check, because that check inspects what the _existing_ URLs return. The
`.md`-append fallback that agent tooling performs client-side (agent-browser's `read` does it) is
not the scanner's test, and conflating the two overstated the batch's projected score by ~11 points.
Siblings remain the substrate; they are just not sufficient on their own.

**Continuing to hand-maintain the manifests** — adding markdown by hand alongside `public/llms.txt`
and `public/llms-full.txt` — is the path of least new machinery and the worst of the three.
`CONTEXT.md` already records that the hand-written manifests drift the worst of the eight identity
surfaces, because only they hold a second copy of the prose rather than reading a field. Adding two
more hand-written copies makes the drift problem larger in exactly the place it is already worst.

## Consequences

**The rewrite is what makes negotiation cache-safe, not `Vary`.** GH-118 probed this against three
preview deployments and the answer inverted the premise this ADR was written on. `Vary: Accept` never
reaches the client — middleware, `next.config.ts` `headers()` and the route handler's own `Response`
all get it stripped, each proved to have run by a control header that did arrive. Yet the feared
failure never occurs, because middleware runs before the CDN cache lookup, so the rewritten path is
the cache key: `x-matched-path` reads `/cv.md` for a markdown request and `/cv` for a browser one,
and alternating between them serves each from its own entry with the right body.

This makes the sibling URLs load-bearing for cache safety, and not merely for addressability.
Rendering markdown inline from the HTML route — rejected below because `llms.txt` cannot link a
header-only representation — would keep one path and depend on the `Vary` keying that does not
exist. Two shapes were rejected for one reason and it turns out to be two.

What survives is smaller and outside our control: a third-party proxy between an agent and Vercel
sees an HTML response whose `Vary` does not name `Accept`, and may reuse it for a markdown request.
Nothing we can set changes that.

**A spec must not assert `Vary: Accept`.** Against `next dev` the middleware's appended header does
survive, as a second `vary` line. An assertion on it passes locally and is false in production, which
is worse than no assertion at all.

**`headers()` in a component would violate Cache Components, so the read stays in middleware.**
`next.config.ts` sets `cacheComponents: true`; reading request headers inside a component requires
a `<Suspense>` boundary and `next build` does not catch the violation (see `AGENTS.md`). Middleware
runs outside that model, which is the second reason negotiation lives there rather than in the
route.

**Do not invent sibling paths that nothing probes.** `/index.md` in particular is a guess; no
verified client asks for it. The addressable set is whatever `llms.txt` declares, because that is
the index agents actually follow — the scan confirmed all five of its current links resolve.

**Generated markdown is the first content surface that renders `RESUME_DATA` rather than holding a
second copy of it**, which is a narrowing of the identity-surface drift problem, not a
widening. If `public/llms.txt` or `public/llms-full.txt` are later converted to route handlers on
the same reasoning, the `public/` copies must be deleted in the same commit — a static file and a
route at one path conflict — and `tests/dev-server-identity.spec.ts` uses `/llms.txt` as its
fingerprint for "this is the right dev server", so it has to keep passing against the route-served
version.
