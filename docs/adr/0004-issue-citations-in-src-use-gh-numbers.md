# Issue citations inside `src/` use `GH-100`, not `#100`

The design-system guard in `tests/warm-print-design-system.spec.ts` walks every `.css`/`.ts`/`.tsx`
file under `src/` and flags anything shaped like a colour, so palette values cannot escape the
token layer (ADR-0001). Its pattern reads `#100` through `#9999` as `#rgb`/`#rgba` triples. Citing
issues in source comments is this repo's house style, and its issue numbers crossed 100 during the
current milestone — so every future citation in a `src/` comment was going to fail the guard. It
already did once, and was worked around in `src/data/resume-data.types.ts` as `(issue 100)`, which
left two inconsistent citation styles in the tree.

Citations inside `src/` are now written `GH-100`. The `#` prefix bought nothing there: GitHub does
not autolink inside file contents, so it was never a link, only a collision.

## Considered options

**Narrowing the pattern so a match cannot be a bare decimal integer** was the cheap fix and is
wrong. Four of the 21 shipped Warm Print values are all-decimal — `#171412` (dark `ground` and
`accent-foreground`), `#333333` (print `body`), `#595959` (print `faint`), `#808080` (print
`border`) — so the narrowed pattern stops catching them, along with `bg-[#100]`. It trades a guard
that catches real palette leaks for one that catches fewer, to spare a comment convention. The
regression tests beside the guard pin all four values for exactly this reason.

**Stripping comments before scanning** is the most principled framing — a colour literal in a
comment cannot leak into the render — and was still rejected. `AGENTS.md` records that comments
about visual state have been wrong in this repo, so a comment asserting `#9c3c1c` is precisely the
rot the guard should catch. A regex-based stripper also fails toward _hiding_ code: a `https://`
inside a string truncates the rest of the line, silently weakening a guard whose whole value is
being unfoolable.

**An inline allowlist marker** at each citation site mirrors how `globals.css` and `warm-print.ts`
are exempted, but those are two file-scoped hatches, not a per-line habit. A marker needed at every
citation is friction that gets forgotten, and the same marker can be used to silence a genuine
palette literal.

## Consequences

**The guard stays blunt, and a bare `#NNN` is still a violation.** Nothing was narrowed. What
changed is that a 3- or 4-digit all-decimal match now reports how to cite an issue instead of
failing with a bare `src/foo.ts: #110`. That message is the only thing keeping this convention from
rotting — the next author writes `(#110)` out of habit and gets a signpost rather than a trap. A 6-
or 8-digit match keeps the plain report, because it cannot be an issue number and the hint would be
misdirection.

**The convention is scoped to `src/`, and deliberately not repo-wide.** `CONTEXT.md`, `docs/`, PR
and issue bodies keep `#100`, where the hash _is_ a working link and no guard runs. Do not
"consistency-fix" those to `GH-` numbering; the two forms mark the boundary of where the guard
reaches.
