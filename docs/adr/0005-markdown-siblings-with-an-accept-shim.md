---
status: accepted
---

# Agents get markdown from `.md` siblings, with a proxy negotiating `Accept`

Decided in #115, 2026-08-25, from the is-agentic.com scan of 2026-08-24 (75/100). The scan's only failed
_essential_ check is markdown content negotiation: `Accept: text/markdown` against `/` returns
`text/html; charset=utf-8`, and the response `Vary` carries Next's router headers
(`rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch`) and not
`Accept`. The site has no `middleware.ts` and no `.md` route of any kind.

The markdown an agent reads is generated from `RESUME_DATA` and served at its own `.md` URLs,
linked from `public/llms.txt`. A thin `src/proxy.ts` rewrites requests carrying
`Accept: text/markdown` to the matching `.md` route — `proxy.ts` is Next 16's name for what this
ADR and #119 both called `middleware.ts`; both filenames still resolve in 16.1.6, and #119 shipped
the current one. The files are the same artifact either way —
negotiation is a second door onto them, not a second copy of them. The negotiated response names
`Accept` in `Vary`, which GH-118 found requires the sibling route to opt out of the prerender.

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

**Two mechanisms carry this, and GH-118 had to correct itself about one of them.** Its first probe
concluded `Vary: Accept` was unreachable on Vercel, having set it from middleware, `next.config.ts`
`headers()` and the route handler's own `Response` and watched all three vanish while a control
header on each arrived. Every one of those routes was prerendered, so the experiment never varied
the thing that mattered. A sibling whose handler awaits `connection()` emits `Vary` normally, and it
survives the rewrite. `force-dynamic` is not the lever: it build-errors under `cacheComponents`, and
only in the build log.

The second mechanism is the one the first probe found while looking for the wrong thing, and it is
worth keeping. Middleware runs before the CDN cache lookup, so the rewritten path becomes the cache
key: `x-matched-path` reads `/cv.md` for a markdown request and `/cv` for a browser one, and
alternating between them serves each from its own entry with the right body, in both orders. Vercel's
own cache is therefore safe by key, independent of `Vary`; `Vary` is what a third-party proxy in
front of it reads, and that is the exposure the header closes.

This makes the sibling URLs load-bearing for cache safety, and not merely for addressability.
Rendering markdown inline from the HTML route — rejected below because `llms.txt` cannot link a
header-only representation — would keep one path and lean entirely on `Vary`. Two shapes were
rejected for one reason and it turns out to be two.

**Opting out of the prerender costs the prerender.** A `connection()` sibling serves `MISS` where it
served `PRERENDER`. is-agentic.com serves its own markdown dynamic _and_ cached, so the caching is
recoverable with `"use cache"` around the body generation or an explicit `Cache-Control: s-maxage`.
Correctness does not wait on it.

**A spec asserts `Vary: Accept` on the negotiated response, and not on the HTML one.** Against
`next dev` the middleware's appended header survives on the HTML response and is overwritten in
production, so an assertion there passes locally and is false in production — worse than no
assertion.

**`headers()` in a component would violate Cache Components, so the read stays in the proxy.**
`next.config.ts` sets `cacheComponents: true`; reading request headers inside a component requires
a `<Suspense>` boundary and `next build` does not catch the violation (see `AGENTS.md`). A proxy
runs outside that model, which is the second reason negotiation lives there rather than in the
route.

**Do not invent sibling paths that nothing probes — amended for the root.** The rule stands: the
addressable set is whatever `llms.txt` declares, because that is the index agents actually follow,
and the scan confirmed all five of its current links resolve. `/index.md` was named here as a guess
that no verified client asks for, and that is no longer true. The failing check probes `/`, so the
scanner is a verified client asking for markdown at the root — by header rather than by URL, but the
rewrite needs a target route either way, and once the route exists the addressability argument above
applies to it like any other. The negotiable set is therefore `/`, `/cv` and `/writing`, with
`/index.md` as the root's sibling, declared in `llms.txt` alongside the other two.

Negotiating all three rather than only the probed one is deliberate. Which paths the scanner visits
is not documented and cannot be checked against a preview deploy, since deployment protection turns
every probe into a redirect. Covering the content routes costs one map entry each and removes the
guess.

`/index.md` overlaps `llms-full.txt` in substance. That is not a reason to skip it — the check reads
URLs, not novelty — but it is a reason to look at what each says before writing the root sibling's
body, rather than after.

**q-values are honoured; `406` is not built.** The acceptmarkdown.com spec asks for both, and
neither appears in the failed check's recorded detail. #119 built the first — a header that ranks
HTML above markdown, by q-value or by a wildcard, gets HTML — and left the second, because a `406`
changes the response for requests that are not asking for markdown at all and nothing confirms the
check grades it. Revisit only with evidence that it does.

**Generated markdown is the first content surface that renders `RESUME_DATA` rather than holding a
second copy of it**, which is a narrowing of the identity-surface drift problem, not a
widening. If `public/llms.txt` or `public/llms-full.txt` are later converted to route handlers on
the same reasoning, the `public/` copies must be deleted in the same commit — a static file and a
route at one path conflict — and `tests/dev-server-identity.spec.ts` uses `/llms.txt` as its
fingerprint for "this is the right dev server", so it has to keep passing against the route-served
version.
