# Lorenzo Germini — personal site

Next.js 16 App Router, deployed on Vercel. Mid-redesign: see the wayfinder map (issue #3)
before assuming the current page structure is the intended one.

## Commands

Bun, not npm or yarn.

```bash
bun install
bun run dev          # localhost:3200
bun run build
bun run lint         # eslint only — formatting is a separate command
bun run format       # prettier --write .; format:check for the read-only pass
bun run test         # Playwright; reuses the dev server on 3200, or starts one
npx tsc --noEmit
```

## Gotchas

**Tailwind v4, no config file.** Design tokens are CSS variables in `src/app/globals.css`:
`@theme` (light), `.dark`, and a third set inside `@media print`. Only `@theme` generates
utilities; the other two reassign values. A token missing from `.dark` renders its light
value; missing from the print block, print keeps whatever mode was on screen — which shows
up only under print emulation. Dark mode is class-based via `@variant dark`. PostCSS uses
`@tailwindcss/postcss`, not `tailwindcss` + `autoprefixer`.

The hand-written component utilities in that file are split across `@layer
components` and `@layer utilities`, and a new one has to pick a side. Put it in
`components` if a utility should beat it — `.touch-target` has to lose to
`print:hidden`, and unlayered or in `utilities` it wins instead and the element
prints. Put it in `utilities` if it has to beat a utility — `.primary-control:hover`
is `(0,2,0)` against `bg-accent`, so it only darkens the fill from there. Never
bare: unlayered beats every layer regardless of specificity.

**One dev server per repo, so `dev` and the test runner share port 3200.** Next holds a
lock at `.next/dev/lock` for the working directory, not the port — a second `next dev` here
cannot start on any port, so the suite reuses the one you already have running, and its port
cannot diverge from the `dev` script's. `PLAYWRIGHT_PORT` moves both, since the `dev` script
reads it too; changing the default means editing both `package.json` and
`tests/support/dev-server.ts`.

**Copy is centralized, and identity surfaces drift.** Content lives in data modules, not
inline JSX, so it stays cheap to iterate. Any change to a role, title, or bio also has to
land in `public/llms.txt`, `public/llms-full.txt`, the JSON-LD, and route metadata —
nothing generates them from the data. A change to `work`, `projects`, `about` or `summary`
also needs `bun run generate:cv` for the checked-in PDF, with the dev server stopped first:
it boots its own Next instance and hits the `.next/dev/lock` conflict otherwise.

**The OpenGraph cards draw from subsetted fonts.** `src/assets/fonts` holds subsets cut to
exactly the characters `src/lib/og-card-text.ts` lists; the full upstream builds sit in
`vendor/og-fonts`, outside the directory Next's file tracing globs. Card copy therefore goes
through `og-card-text` rather than `RESUME_DATA` directly, and new copy needs
`bun run generate:og-fonts` or its unseen characters render as `.notdef` boxes — in a baked
PNG, where nothing else notices. `build` regenerates the subsets but does not diff them
against the checked-in ones; the guard against forgetting is the suite reading the shipped
`cmap` back.

**Measure in a browser before recording a design decision.** Comments and notes about the
current visual state have been wrong here.

**Cache Components is on, and `next build` will not catch violations of it.** Reading
runtime data — `searchParams`, `cookies()`, `headers()` — must happen inside a `<Suspense>`
boundary. A read that a `NODE_ENV` guard keeps out of production still builds green; the
only report is a `blocking-route` error in the dev server's terminal, not the browser. Read
the dev log after adding a route. Give a boundary a fallback with the same geometry as what
replaces it, or it shifts the page. A dynamic segment makes `usePathname()` runtime data
too, so a route-aware client leaf anywhere in the layout blocks that route — the footer's
two are behind a boundary for exactly that reason. Custom `cacheLife` profiles are typed
from `.next/dev/types`, so a new one in `next.config.ts` does not typecheck until the dev
server or a build has regenerated them.

**`/writing` renders the live Substack feed, which is empty.** Every other state — the
count-aware transitions, a malformed or unreachable feed, a cached miss recovering — is at
`/writing/fixture/<state>`, dev-only and 404 in production. Fixtures feed canned XML
through the real parser and the real cache, so they prove the shipped path. Invalidation is
`POST /api/revalidate/substack` with `Authorization: Bearer $SUBSTACK_REVALIDATE_SECRET`;
unset in production it refuses everything, and outside production it falls back to a
published dev value so the suite can run against a server it did not start.

## Workflows

- Issues and PRDs: GitHub issues in `Blaise-g/Lorenzo-Germini` via `gh` — see `docs/agents/issue-tracker.md`
- Domain docs and ADR conventions: `docs/agents/domain.md`
- Redesign spec and retained-proof contract: `docs/spec/`
