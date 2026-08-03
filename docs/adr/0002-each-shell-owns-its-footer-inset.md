# Each shell owns its footer inset, so `<main>` and the footer left the root layout

The footer's rule has to end where the content above it ends, and each of the three shells
has a different horizontal inset: the hub's `max-w-5xl`, `/cv`'s `max-w-4xl` document box,
and `/writing`'s `46rem` measure. A single `<SiteFooter>` in the root layout could match at
most one of them, and did: `container mx-auto px-4 pr-16 md:px-16` with `max-w-3xl` matched
none of the three, so the last rule on every page missed the content above it — 16px in on
`/cv`, a 40px overhang on both sides on `/writing`, and a third distinct left edge on `/`.

`RouteFrame` now renders `<main>` and `<SiteFooter>` together, takes the inset as a required
prop, and each shell mounts it with its own geometry.

## Considered options

**Read the pathname in the footer and look the inset up.** This is the obvious fix and it is
not available. `usePathname()` is runtime data on a route with a dynamic segment, and
`/writing/fixture/[state]` is exactly that — which is why the footer's two route-aware client
leaves already sit behind a `<Suspense>` boundary. Hoisting a pathname read above that
boundary blocks the route under Cache Components, and the only report is a `blocking-route`
error in the dev server's terminal: `next build` stays green and the browser shows nothing.

**Leave the footer in the root layout and pass the inset up through context.** A provider is
still a client component reading route-dependent state, so it lands in the same place, one
indirection later.

**Keep `<main>` in the root layout and move only the footer.** Rejected: it lets a route ship
a `<main>` with no `contentinfo`, or a footer with no `<main>`, and nothing catches either.
Holding both landmarks in one component is what makes that unrepresentable.

## Consequences

**Both landmarks stay direct children of `<body>`.** `contentinfo` nested inside `main` is not
exposed as a landmark at all, so `RouteFrame` returns a fragment rather than a wrapper
element. A future wrapper added here for styling would silently cost the footer its landmark;
`tests/semantic-shell.spec.ts` asserts one `contentinfo` per route and that it is not inside
`main`.

**The inset is an unconstrained class string, and deliberately so.** Typing it as a union of
three known measures would mean every new route amends a type in a shared module to say
something only that route cares about. The prop is required rather than defaulted for the
related reason: as a default it handed every shell-less route `/cv`'s geometry invisibly,
which is the drift this component exists to stop. The 404 passes `CV_DOCUMENT_INSET`
explicitly.

**A new route must mount `RouteFrame` or it has no footer and no `<main>`.** This is the
trade for the alignment guarantee. The per-route footer-inset tests are what turn forgetting
it into a failure rather than a quiet omission.
