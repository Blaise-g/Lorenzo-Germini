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

| Route                   | Source                           | Runtime data read                                                               | Boundary given                                              | Result             |
| ----------------------- | -------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------ |
| `/`                     | `src/app/page.tsx`               | `searchParams` — **dev only**; production returns `CurrentHome` before the read | `<Suspense>` around `SelectedVariant`, on the dev path only | Static             |
| `/cv`                   | `src/app/cv/page.tsx`            | none                                                                            | none — genuinely needs none                                 | Static             |
| `/writing`              | `src/app/writing/page.tsx`       | `searchParams` — **dev only**; production `notFound()`s before the read         | `<Suspense>` around `ParameterizedWritingIndex`             | Static             |
| `/resume`               | `src/app/resume/route.ts`        | `request.url`                                                                   | n/a — Route Handler                                         | Dynamic, unchanged |
| `/sitemap.xml`          | `src/app/sitemap.ts`             | none (see `BUILD_DATE` below)                                                   | none                                                        | Static             |
| `/manifest.webmanifest` | `src/app/manifest.ts`            | none                                                                            | none                                                        | Static             |
| `/opengraph-image`      | `src/app/opengraph-image.tsx`    | none                                                                            | none                                                        | Static             |
| `/cv/opengraph-image`   | `src/app/cv/opengraph-image.tsx` | none                                                                            | none                                                        | Static             |
| `/apple-icon.png`       | file convention                  | none                                                                            | none                                                        | Static             |
| `/_not-found`           | `src/app/not-found.tsx`          | none                                                                            | none                                                        | Static             |

The route table after the flag is identical to the one before it: everything Static except
`/resume`, which was already Dynamic. Nothing regressed and nothing newly needed caching.

### `BUILD_DATE`

`src/lib/build-metadata.ts` calls `new Date()` at module scope, which reads a clock — the one
construct here that could plausibly have tripped the new semantics. It does not: the module is
evaluated during the build, and `/cv` and `/sitemap.xml` both still prerender with a baked date.
Verified, not assumed.

## Fallback geometry

Both boundaries fall back to the render their own default resolves to — `CurrentHome` on `/`, the
all-defaults `WritingIndex` on `/writing` — so the URL without a query string settles into the
geometry it started with. Measured, not asserted: `tests/cache-components.spec.ts` holds `/`,
`/cv`, and `/writing` to cumulative layout shift ≤ 0.01. A null fallback on the same boundary
measures 0.206, so the budget is doing real work rather than passing vacuously.

A `?variant=` or `?n=` URL does swap its fallback for differently shaped content. That is the one
intended shift — a knob is a request for different content — and it is dev-only either way.

## Verification

- `bun run build` — passes, including `scripts/generate-cv-pdf.mjs`; route table as above.
- `next start` — `/`, `/cv`, `/sitemap.xml`, `/manifest.webmanifest`, both OG images and the
  generated PDF serve; `/resume` 301s to `/cv`; `/writing` 404s.
- Dev server log — zero `blocking-route` errors across every route and every `?variant=`/`?n=` URL.
- `npx tsc --noEmit`, `bun run lint`, and the full Playwright suite pass.

## Not covered

Issue [#24](https://github.com/Blaise-g/Lorenzo-Germini/issues/24) is the first consumer of
`"use cache"`, `cacheLife`, and `cacheTag`. This audit establishes the flag and the prerender
baseline only; no caching directive is exercised anywhere yet, so #24 is where that path first
gets proven.
