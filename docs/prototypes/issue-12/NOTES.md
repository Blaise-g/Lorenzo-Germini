# Homepage composition — issue #12

**Question:** the B1 "Warm Print" treatment was chosen on #8, but the `/impeccable critique` during #9 found that composition was never the variable — all three #8 treatments held the masthead, 240px sticky rail, numbered essay index, prose timeline and project grid constant and varied only hue and stroke weight. So the rail, the responsive break and the section-heading hierarchy were locked without ever being tested.

**Chosen (2026-07-25): the rail composition, amended — and the rail becomes a desktop-only device.**

## How this round was run differently

Both arms live in one file, `src/components/prototype/variant-d.tsx`, parameterized by `composition: "single" | "rail"` and switched via `?variant=d` (single measure) / `?variant=b1a` (amended rail). The Warm Print palette, type scale, copy, one-essay launch state, footer and technical proof are **held constant**; composition is the only variable. That is the inverse of #8's mistake, and it is the reason the file exists at all.

Fixes applied to **both** arms, because they are #8/#9/#10 spec constraints the old prototype violated rather than the variable under test — leaving them broken in one arm would have rigged the comparison:

- hero at `clamp(2rem, 5.2vw, 3.75rem)`, not `md:text-6xl`
- `t.faint` as an explicit token, not `opacity-55` (measured 6.81:1 light / 6.63:1 dark, replacing 3.84:1)
- a real `<footer>`, `ThemeToggle`, skip link, `BackToTop`, `CommandMenu`, `StructuredData` — `variant-b.tsx` rendered **none** of them, so the dark mode #8 calls a first-class requirement was unreachable by any user
- exactly **one** essay, no numbering, no archive link (#10: day one is one post)
- reading time rendered; the inert `EN · IT` chip dropped (#10)
- hand-written technically-led proof per role via `HOMEPAGE_PROOF` (#9 decision 5), replacing the rendered `description[0]`
- no staggered `animation-delay` (the reduced-motion defect lives in the stagger)

## The finding that reframed the fork

**Treat the rail as a desktop-only device and the two arms are identical below 1024px.** Below `lg` the rail does not render at all and the identity band — the same one the single-measure arm uses at every width — carries the avatar, role and CV link. So this decision governs the desktop layout only; the phone and tablet layout is the single measure either way.

That reframing came out of fixing the rail arm's mobile fate. There is no good in-flow home for rail content on a phone: above the `<h1>` it buries the positioning statement under ~380px of avatar and bio (the original `variant-b.tsx` defect), and below the content it becomes an orphaned duplicate footer at 80% page depth. Not rendering it is the answer.

## Measured comparison at ≥1024

| | single measure (`d`) | amended rail (`b1a`) |
|---|---|---|
| Above-fold copy @1440 | 495 chars | **677 (+37%)** |
| Above-fold copy @375 (pre-copy-fix) | 307 | **488 (+59%)** |
| Viewport width used @1440 | 688/1440 = **48%**, 752px dead margin | 944/1440 = **66%** |
| Face + nav on screen | masthead only | **85.6% of the scroll** |
| Left column fill @1280 | — | 377 of 860px = **44%**, empty in every frame |
| Design specificity | category-interchangeable | **authored** |
| Nielsen (5/9/10 n/a) | 20/28 (71%) | 21/28 (75%) |

The rail wins on the brief's non-negotiable — proof above the fold — and it is the only arm the design review judges authored rather than interchangeable. Since #8 holds palette and typeface constant, the single measure contributes no compositional authorship at all: a centred `max-w-[46rem]` column with a masthead and mono kickers is the default output of every editorial personal-site starter of the last four years.

**The honest cost, carried into the spec:** the 220px column is 44% filled at every scroll position, and the rail's best argument — orientation — is currently unrealised because the sticky nav has no active state.

## Defects found and fixed during this round

Three would have been baked into the spec if it had been written from the prototype as it stood:

1. **WCAG 2.4.3 focus order (rail arm, P0).** CSS `order-2`/`order-1` produced the correct visual order while leaving the `<aside>` first in the DOM: at 375 the first five tab stops were rail links at y≈3184, so a keyboard user leaving the skip link was thrown 3176px down the page and back. The file's own comment claimed this was fixed. Now `hidden lg:block` removes the rail from the tab order entirely below `lg`; first focusable in `<main>` at 375 is the hero CTA at y=557.
2. **The 768–1023 band (rail arm, P0).** Projects escaped the `max-w-[42rem]` wrapper so it could go 2-up at `lg`, but the escape applied below `lg` while `lg:grid-cols-2` did not: at 1023px Projects rendered **943px wide and single-column** while everything above it was 672px — heading rules of 672 / 672 / **943** / 672 on one page, and ~105ch project lines under ~85ch ones. That band is iPad portrait and every laptop window narrower than full screen. Now `max-w-[42rem] lg:max-w-none`; measured 672px at 1023, 318×2 at 1024.
3. **Section heading rank (both arms, P1).** At 13px the mono headings measured **0.43×** the smallest `<h3>` they headed, **0.81×** the 16px body they headed, and were the **lowest-contrast text on the page** (6.34:1 vs 16.23:1 for the h3s) — the 11px masthead nav rendered at higher contrast than the section headings. SYSTEMS was worse: heading and content were both 13px mono differing only by weight and case, so they read as one object. Now 15px at `tracking-[0.18em]`, with SYSTEMS content at 12px.

## The copy amendment (crosses back into #6)

The critique measured **3 technical terms above the fold on the incumbent site and 0 in both prototype arms** — a violation of the audit's one binding constraint, *never look less technical*, in both arms. So composition was never the binding variable on the metric that decides a founder's ten seconds; hero copy is.

The site owner chose to amend the copy now rather than defer it. The hero subhead and the rail bio now name a system: "Right now: the agentic RAG engine behind a compliance platform." Verified: `agentic` and `RAG` both above the fold at 375 and 1440 in both arms, above-fold copy up from 488 to 775 chars on a phone. **The wording is a recommendation for the copy rewrite, not a locked line** — the decision is that the fold must name at least one concrete system.

## Not the variable, but measured and clean

- **Contrast: zero failures**, both arms, both schemes, 18 distinct text styles each. Lowest real-content ratio 6.34:1 (light) / 6.63:1 (dark).
- **Heading outline** h1 → h2 → h3 with no skipped levels; `banner` / `main` / `contentinfo` all present; `<footer>` correctly outside `<main>`; skip-link target exists.
- **Reduced motion:** the known `globals.css:228` defect (never resets `animation-delay`; `fade-in-up` uses `both` fill) is **dormant here** because this prototype sets no stagger delays — zero elements end at `opacity < 1`. The defect is real, but it is the *stagger* that triggers it.
- **Images:** Next picks the smallest bucket ≥ layout size (64 for 56px, 96 for 80px); neither arm over-requests.

## Viewing

`bun run dev`, then `/?variant=b1a` (chosen) and `/?variant=d`, or the arrow keys on the switcher bar. Dev-only; production always renders the current site. Screenshots in this directory at 375 / 768 / 1024 / 1440 plus dark at 1440. Full critique: `.impeccable/critique/2026-07-25T14-45-54Z__src-components-prototype-variant-d-tsx.md`.
