# Cache Components prerender audit

Spec §2.4 / issue [#23](https://github.com/Blaise-g/Lorenzo-Germini/issues/23). §2.4 calls the
site-wide audit "the deliverable, not a side effect", so this is the record of it: every route
the app builds, what runtime data it reads, and what boundary it therefore got.

`next.config.ts` sets `cacheComponents: true` — top-level, not under `experimental`, which is the
contract for the pinned `next@16.1.6`.

## The rule the audit applies

Under Cache Components a route prerenders unless it reads runtime data — `searchParams`, `params`,
`cookies()`, `headers()` — outside a `<Suspense>` boundary. A route reading none of it needs no
boundary and no `"use cache"`, and adding either would be ceremony. So the audit's job is to find
the reads, not to decorate the routes.

The trap: `next build` does not report a violation that a `NODE_ENV` guard keeps out of the
production branch. Both violations found here were exactly that shape — invisible to the build,
reported only as `blocking-route` in the dev server's terminal. That is why the evidence column
below cites the dev log and not just a green build.

## Per-route findings

| Route                      | Source                                     | Runtime data read                                                               | Boundary given                                              | Result              |
| -------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------- |
| `/`                        | `src/app/page.tsx`                         | `searchParams` — **dev only**; production returns `CurrentHome` before the read | `<Suspense>` around `SelectedVariant`, on the dev path only | Static              |
| `/cv`                      | `src/app/cv/page.tsx`                      | none                                                                            | none — genuinely needs none                                 | Static              |
| `/writing`                 | `src/app/writing/page.tsx`                 | none — the feed is a `"use cache"` read (#24)                                   | none; the cached read prerenders                            | Static, revalidated |
| `/writing/fixture/[state]` | `src/app/writing/fixture/[state]/page.tsx` | `params` and `searchParams` — **dev only**; production `notFound()`s first      | `<Suspense>` around `FixtureIndex`                          | Partial prerender   |
| `/api/revalidate/substack` | `src/app/api/revalidate/substack/route.ts` | request headers                                                                 | n/a — Route Handler                                         | Dynamic             |
| `/resume`                  | `src/app/resume/route.ts`                  | `request.url`                                                                   | n/a — Route Handler                                         | Dynamic, unchanged  |
| `/sitemap.xml`             | `src/app/sitemap.ts`                       | none (see `BUILD_DATE` below)                                                   | none                                                        | Static              |
| `/manifest.webmanifest`    | `src/app/manifest.ts`                      | none                                                                            | none                                                        | Static              |
| `/opengraph-image`         | `src/app/opengraph-image.tsx`              | none                                                                            | none                                                        | Static              |
| `/cv/opengraph-image`      | `src/app/cv/opengraph-image.tsx`           | none                                                                            | none                                                        | Static              |
| `/apple-icon.png`          | file convention                            | none                                                                            | none                                                        | Static              |
| `/_not-found`              | `src/app/not-found.tsx`                    | none                                                                            | none                                                        | Static              |

The route table after the flag is identical to the one before it: everything Static except
`/resume`, which was already Dynamic. Nothing regressed and nothing newly needed caching.

**Updated by #24.** `/writing` is now the first route with cached data behind it. It reads no
runtime data at all — the feed comes from `getEssays()` in `src/lib/substack.ts` — so it
prerenders whole and carries a revalidate window instead of a boundary. `next build` reports
it as `5m / 15m`, which is the `feedMiss` profile: the live publication is empty, so the
build cached an absence and gave it the short lifetime the spec requires rather than a
successful feed's hourly or daily one. That figure is the policy working, not a warning.

The one boundary left in the app is the dev-only fixture route. Its dynamic segment also
made `usePathname()` a runtime read for `FooterCvLink` and `FooterSubscribeLink` in the
layout, which reported as `blocking-route` on that route only — both now sit behind a
`<Suspense fallback={null}>`, which changes nothing on the statically routed pages that
prerender them.

### `BUILD_DATE`

`src/lib/build-metadata.ts` calls `new Date()` at module scope, which reads a clock — the one
construct here that could plausibly have tripped the new semantics. It does not: the module is
evaluated during the build, and `/cv` and `/sitemap.xml` both still prerender with a baked date.
Verified, not assumed.

## Fallback geometry

**The homepage boundary is gone as of #26.** The `?variant=` knob went with the direction
prototypes, taking the route's only runtime read with it, so `/` now prerenders whole and has no
fallback to hold. `/writing` lost its `?n=` knob the same way in #24. Measured, not asserted:
`tests/cache-components.spec.ts` holds `/`, `/cv`, and `/writing` to cumulative layout shift
≤ 0.01, which is now a guard against either route growing a boundary that shifts the page
rather than a measurement of one it has.

The dev-only fixture route keeps a boundary, falling back to `WritingIndexFallback` — the
lead's geometry, so the subscribe module under it does not jump. It is excluded from the
shift budget because a fixture state is a deliberate request for differently shaped content.

## Verification

- `bun run build` — passes, including `scripts/generate-cv-pdf.mjs`; route table as above.
- `next start` — `/`, `/cv`, `/sitemap.xml`, `/manifest.webmanifest`, both OG images and the
  generated PDF serve; `/resume` 301s to `/cv`; `/writing` 404s.
- Dev server log — zero `blocking-route` errors across every route and every `?n=` URL.
- `npx tsc --noEmit`, `bun run lint`, and the full Playwright suite pass.

## The caching path, proven in #24

`"use cache"`, `cacheTag`, `cacheLife` and a custom profile are all exercised by
`getEssays()`, and `revalidateTag` by the invalidation endpoint. Two things worth knowing
before touching them:

- A custom profile is typed as one `cacheLife` overload per configured name, generated into
  `.next/dev/types`. A computed `string` therefore does not typecheck against it, and a
  profile added to `next.config.ts` does not exist to TypeScript until the dev server or a
  build regenerates the file.
- `revalidateTag(tag)` without a second argument is deprecated in 16.1. The endpoint passes
  `"max"`, which is stale-while-revalidate: the first request after invalidation may still
  be served the stale entry while triggering its regeneration.
