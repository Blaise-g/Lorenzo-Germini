---
status: proposed — the CDN premise below is unverified
---

# Agents get markdown from `.md` siblings, with middleware negotiating `Accept`

Decided in #115, 2026-08-25, from the is-agentic.com scan of 2026-08-24 (75/100). The scan's only failed
_essential_ check is markdown content negotiation: `Accept: text/markdown` against `/` returns
`text/html; charset=utf-8`, and the response `Vary` carries Next's router headers
(`rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch`) and not
`Accept`. The site has no `middleware.ts` and no `.md` route of any kind.

The markdown an agent reads is generated from `RESUME_DATA` and served at its own `.md` URLs,
linked from `public/llms.txt`. A thin `middleware.ts` rewrites requests carrying
`Accept: text/markdown` to the matching `.md` route and adds `Accept` to `Vary`. The files are the
same artifact either way — negotiation is a second door onto them, not a second copy of them.

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

**The `Vary: Accept` premise is unverified and gates the middleware, not the siblings.** If
Vercel's CDN does not key cache variants on `Vary: Accept`, negotiation is worse than no
negotiation: whichever variant lands in cache first is served to everyone, so an agent can receive
HTML and a browser can receive raw markdown. Verify against a preview deploy before the middleware
ships. The siblings are unaffected by the outcome and can land first; falling back to siblings-only
costs ~11 points on the scan and nothing functional.

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
