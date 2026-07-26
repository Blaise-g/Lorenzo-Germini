# Lorenzo Germini — personal site

Next.js 16 App Router, deployed on Vercel. Mid-redesign: see the wayfinder map (issue #3)
before assuming the current page structure is the intended one.

## Commands

Bun, not npm or yarn.

```bash
bun install
bun run dev          # localhost:3000
bun run build
bun run lint
bun run test         # Playwright; starts its own dev server
npx tsc --noEmit
```

## Gotchas

**Tailwind v4, no config file.** Design tokens are CSS variables in `src/app/globals.css`:
`@theme` (light), `.dark`, and a third set inside `@media print`. A token added to one and
not the others silently falls back. Dark mode is class-based via `@variant dark`. PostCSS
uses `@tailwindcss/postcss`, not `tailwindcss` + `autoprefixer`.

**Copy is centralized, and identity surfaces drift.** Content lives in data modules, not
inline JSX, so it stays cheap to iterate. Any change to a role, title, or bio also has to
land in `public/llms.txt`, `public/llms-full.txt`, the JSON-LD, and route metadata —
nothing generates them from the data.

**Measure in a browser before recording a design decision.** Comments and notes about the
current visual state have been wrong here.

## Workflows

- Issues and PRDs: GitHub issues in `Blaise-g/Lorenzo-Germini` via `gh` — see `docs/agents/issue-tracker.md`
- Domain docs and ADR conventions: `docs/agents/domain.md`
- Redesign spec and retained-proof contract: `docs/spec/`
