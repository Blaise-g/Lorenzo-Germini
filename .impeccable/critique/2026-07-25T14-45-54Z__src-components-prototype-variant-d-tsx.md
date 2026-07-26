---
target: variant-d.tsx — homepage composition fork (single measure vs 220px rail)
total_score: 21
max_score: 28
na_heuristics: 5,9,10
p0_count: 0
p1_count: 1
timestamp: 2026-07-25T14-45-54Z
slug: src-components-prototype-variant-d-tsx
---
Method: dual-agent (A: a0fce5cb9720a2298 · B: acd6320fd0e75ed4a)

Target: two homepage compositions in `src/components/prototype/variant-d.tsx` — `?variant=d` (single measure) vs `?variant=b1a` (220px sticky rail). Warm Print palette held constant; composition is the only variable. Issue #12.

## Design Health Score

Scored per arm. Heuristics 5, 9, 10 are `n/a` (no forms, no error surfaces, no docs on a personal hub) → applicable max 28.

| # | Heuristic | d | b1a | Key issue |
|---|-----------|---|-----|-----------|
| 1 | Visibility of System Status | 2 | 2 | No section indicator; b1a shows a persistent 5-item nav with zero `aria-current` |
| 2 | Match System / Real World | 3 | 3 | "SYSTEMS", `/llms.txt` are correct in-group vocabulary |
| 3 | User Control and Freedom | 3 | 3 | (b1a was 2 pre-fix: nav relocated to 80% page depth below lg; rail is now desktop-only) |
| 4 | Consistency and Standards | 4 | 4 | (b1a was 1 pre-fix: Projects rendered 943px under a page of 672px measures at 1023) |
| 5 | Error Prevention | n/a | n/a | No forms, no destructive actions |
| 6 | Recognition Rather Than Recall | 3 | 3 | (was 2: 13px section headings outranked by the 20-30px h3s beneath; now 15px) |
| 7 | Flexibility and Efficiency | 3 | 3 | ⌘K menu, skip link, `/cv`, `/llms.txt` |
| 8 | Aesthetic and Minimalist Design | 2 | 3 | d: 752px dead margin at 1440 (48% of width used). b1a: 56% of the visible rail empty in every frame |
| 9 | Error Recovery | n/a | n/a | No error surfaces |
| 10 | Help and Documentation | n/a | n/a | Not applicable |
| **Total** | | **20/28 (71%)** | **21/28 (75%)** | **Good, low band** |

Pre-fix b1a scored 16/28 (57%); the two P0s and the heading rank were repaired during this run and re-verified live.

## Design Specificity Verdict

**LLM assessment.** `b1a` is authored for this product: a 220px mono rail beside a Fraunces measure, a `7.5rem` date gutter in Work, `border-t-2` project rules, "agents welcome → /llms.txt", SYSTEMS as a first-class section. The asymmetry is a position. `d` is category-interchangeable — a centred `max-w-[46rem]` column with a masthead, `space-y-16` sections and mono kickers is the default output of every editorial personal-site starter of the last four years; swap the copy and it is indistinguishable from a Ghost theme. Since the brief holds palette and typeface constant, `d` contributes no compositional authorship at all. That is precisely the finding the #8 round failed to surface.

**Deterministic scan.** `detect.mjs` returned `[]`, exit 0, on a 493-line file. Assessment B validated the harness rather than trusting it: a probe file with `cubic-bezier(0.68,-0.55,0.265,1.55)`, `#ff0000`, `text-gray-400` returned 1 finding / exit 2, so JSX regex mode works — but the detector has **no hardcoded-colour rule in non-HTML regex mode**, so the clean result is *not* evidence about the `@theme` token migration. URL-mode scanning failed (`puppeteer is required`); not installed, no dependency added.

**Visual overlays.** Not injected — the detector's URL mode is unavailable without puppeteer. All rendered evidence is direct instrumentation (`getBoundingClientRect`, `getComputedStyle`, `Range.getClientRects`, `document.getAnimations`), not an overlay. No user-visible overlay exists this run.

## Overall Impression

The fork is narrower than the ticket assumed. Once the rail is treated as a **desktop-only device** — absent below `lg`, its content carried by the identity band that `d` uses at every width — the two arms are identical below 1024px, and the decision is only about what happens in the left 220px at ≥1024. The single measure never fails and never lands; the rail lands and had three fixable failures. The biggest opportunity is not in either arm: **above the fold on a phone, neither arm names a single technology**, where the incumbent site names three.

## What's Working

1. **`HOMEPAGE_PROOF` (variant-d.tsx:79-87) is the best decision in the file.** Replacing the rendered `description[0]` with hand-written technically-led proof puts "multi-provider LLM infrastructure (OpenAI, Anthropic, Gemini), agentic RAG over ISO documentation, and the evaluation harness that keeps both honest in production" at 16px in the reader's path. The `sm:grid-cols-[7.5rem_1fr]` date gutter reads as authored typesetting, not a CV template.
2. **The one-essay treatment is confident, not a punchline.** Rendering as a lead — date + reading time, 30px Fraunces title, 3-line excerpt, "Read the essay →" — with no numbering, no "1 of 1", no archive link and no empty-state apology, it reads as "here is the current essay." Adding a count or archive link is what would make it a punchline. Do not add one until post 3.
3. **The `t.faint` fix is a real accessibility upgrade that survives in both arms.** Measured 6.81:1 light / 6.63:1 dark, replacing `opacity-55` at 3.84:1. Lowest real-content ratio anywhere on the page is now 6.34:1. Zero contrast failures, both arms, both schemes, 18 distinct text styles each.

## Priority Issues

**[P1] Both arms: above the fold, neither names a technology.** Measured at 375x812: the incumbent surfaces 3 technical terms in 852 characters ("LLM", "infrastructure", "RAG"); `b1a` surfaces 0 in 488; `d` 0 in 307. The first named technology in either arm is "OpenAI, Anthropic, Gemini" at y≈1100, one full scroll down. A founder's 10 seconds yield: a serif poster claiming "frontier AI → shipped products", four industry names, and an essay about ISO audits — they learn Lorenzo *writes*, not that he *builds*. This violates the audit's one binding constraint ("without ever looking less technical") at the fold, in **both** arms, so composition was never the binding variable here. *Fix:* one concrete system noun in the hero subhead or the rail bio — "the agentic RAG engine behind a compliance platform" costs four words. Touches #6's locked hero copy. **Suggested command:** `/impeccable clarify`.

**[P2] b1a: the sticky nav is a jump menu masquerading as an orientation device.** No `aria-current`, no scroll-spy, no active state (verified at scrollY 0/900/1800/2300). At scrollY=1000 the WORK h2 has scrolled off and the nav shows four identically-styled links, so a permanently visible nav tells the reader nothing about where they are. This is the rail's strongest justification and it is currently unrealised. *Fix:* IntersectionObserver → `aria-current="true"` plus an accent left-border on the active item. **Suggested command:** `/impeccable animate`.

**[P2] Both arms: three shared components have no visible focus indicator.** Measured focused-vs-unfocused computed styles: `ThemeToggle` (box-shadow slots all `rgba(0,0,0,0)`, `outline-style: none`), `BackToTop` (focused state byte-identical to unfocused), command FAB (byte-identical). `:focus-visible` matches on all three, so Tailwind ring utilities are overriding the global `globals.css:131` box-shadow with transparent stops. WCAG 2.4.7. Also: `--color-ring` is `#4941aa` indigo — off-palette for Warm Print — and the ring's 2px inner halo is `#fbfaf9` against a `#faf6ef` page = **1.03:1**, i.e. invisible. **Suggested command:** `/impeccable audit`.

**[P2] Both arms: 10 real links are under 24px tall at 375.** `CV →` 39.9x14, `Full CV →` 79.5x17, `Start with the essays ↓` 182.2x20.5, and the whole footer cluster at 14px tall — including **`X` at 7.9x14**. Fails SC 2.5.8 (24x24, AA). Horizontal centre gaps in the footer are 47-68px so adjacency passes; it is purely the height. Shared components `ThemeToggle` (36x36) and `BackToTop` (38-40x40) are also under 44. **Suggested command:** `/impeccable adapt`.

**[P3] Both arms: fixed chrome clips glyphs at 375 and 768.** Glyph-level intersection (not box-level): the command FAB puts up to 640px² over the essay excerpt in `b1a`@375; `ThemeToggle` shaves 3-4px off the masthead metadata; `BackToTop` clips 1-10px of an h3 `·`. Nothing overlaps at 1024+. (The variant switcher's larger hits are prototype-only chrome, excluded.) **Suggested command:** `/impeccable adapt`.

**[P3] Both arms: the hero is 5 lines / 324px at ≥1280.** 60px Fraunces on a 668-688px measure, 36% of a 900px viewport, with "Turning frontier AI into" alone on line 1. The clause that pushes it to 5 lines — "— and writing about tech, startups, and strategy along the way" — duplicates the WRITING section immediately beneath. *Fix:* lower the clamp ceiling to ~3.25rem or shorten the sentence. **Suggested command:** `/impeccable typeset`.

## Fixed during this run (were P0/P1, re-verified live)

- **b1a, WCAG 2.4.3 focus order.** CSS `order-2`/`order-1` produced the right visual order while leaving the `<aside>` first in the DOM: at 375 the first five tab stops were rail links at y≈3184, so a keyboard user leaving the skip link was thrown 3176px down and back. The file's own comment claimed this was fixed. Now the rail is `hidden lg:block`, so it is out of the tab order entirely below `lg`; first focusable in `<main>` at 375 is the hero CTA at y=557.
- **b1a, the 768-1023 band.** Projects escaped the `max-w-[42rem]` wrapper to go 2-up at `lg`, so at 1023px it rendered 943px wide and single-column: heading-rule lengths of 672 / 672 / **943** / 672 on one page, and ~105ch project lines under ~85ch ones. Now `max-w-[42rem] lg:max-w-none` — measured 672px at 1023, 318px x2 at 1024.
- **b1a, the orphaned mobile rail.** Below `lg` the aside landed at 80.5% page depth as an unlabelled avatar + bio + headingless link list directly above a footer repeating the same contacts and a second CV link 260px away, costing +288px of phone scroll. The rail is now desktop-only and the identity band carries its content, so page height went 3675 → 3385, level with `d`'s 3393.
- **Both arms, section heading rank.** Measured 13px mono 600 at 6.34:1 — 0.43x the smallest h3 it headed, 0.81x the body it headed, and the lowest-contrast text on the page; the 11px masthead nav rendered at *higher* contrast. SYSTEMS was worse: heading and content were both 13px mono, differing only by weight and case, so they read as one object. Now 15px / `tracking-[0.18em]` headings and 12px SYSTEMS content.

## Persona Red Flags

**Founder / product leader, phone, LinkedIn tap, ~10s (the deciding persona).** Learns that Lorenzo writes; does not learn that he builds. Zero technologies named above the fold in either arm, against the incumbent's three. Sees three-to-five CV links (masthead/rail, "Full CV →", footer, ⌘K) with none marked canonical.

**AI engineer evaluating a peer.** SYSTEMS — the stack — is the last section before the footer at ~83% page depth. They will ⌘F "pgvector" before scrolling to it. In `b1a` there is a persistent 220px column, 56% empty in every frame, that does not contain the stack.

**Sam (accessibility-dependent).** Contrast is clean throughout (lowest 6.34:1) and the heading outline is h1→h2→h3 with no skipped levels, `banner`/`main`/`contentinfo` all present and `<footer>` correctly outside `<main>`. But: no visible focus ring on three shared components; 10 links under the 24px minimum; and in `b1a` the skip link lands on the rail's first nav link rather than at the h1 (`d` lands on the hero CTA).

**Casey (distracted mobile).** Primary actions are all top-of-screen; nothing in the thumb zone. `d` renders **no section nav at all below 640px** (`hidden sm:flex`), and `b1a` no longer renders one below `lg` either — both arms are navless on a phone, so Writing is reachable only by scrolling past Work.

## Minor Observations

- `d`'s masthead rule is 688px wide inside a 1440px viewport. In a "Warm Print" system, the one gesture that would make a centred measure read as intentional — a full-bleed hairline — is absent. The `min-h-screen` div is the only 1440px-wide element in either arm.
- Reduced motion: the known `globals.css:228` defect (never resets `animation-delay`, `fade-in-up` uses `both`) is **dormant here** — this prototype sets no stagger delays, so `animation-delay` is `0s` everywhere and zero elements end at `opacity < 1`. Verified with `set media reduced-motion`: 6-7 animations, all `finished`. The defect is real but it is the *stagger* that triggers it.
- Console: 0 errors in light mode, 1 in dark — the pre-existing hydration mismatch on `<html className>` (`src/app/layout.tsx:87-94` appends `dark` pre-hydration with no `suppressHydrationWarning`). Confirmed on the current production homepage too, dark mode only. Nothing else.
- Images: 56px rendered / 64px intrinsic in `d`, 80/96 in `b1a` — Next picks the smallest bucket ≥ layout size; neither arm over-requests. `sizes` is empty, so DPR 2 would step to `w=128`/`w=192`.
- `b1a`'s 2-up Projects: "Biomedical Paper Summarizer" wraps to two lines at 318px while "L'Oracolo della Ghigliottina" fits one, so the two cards' body copy starts at different baselines under a shared rule.
- `clamp(2rem, 5.2vw, 3.75rem)` behaves exactly as written: 32px floor to 768, fluid 39.9→53.2px, clamped at 60px from 1154px up.

## Questions to Consider

1. If "essays as first-class identity" is the reposition, why is the essay the *second* thing on the page and the only 60px element a sentence about the author? Ranked by type size, both arms say the person is the product and the writing is a section — which is the incumbent's information architecture in a nicer typeface.
2. Given that measured above-the-fold technical vocabulary went 3 terms → 0 in **both** arms, is the honest reading that the fork is a tie on the metric that decides the founder's 10 seconds, and the real decision is the hero copy?
3. If the rail's job is orientation, why does the only arm with a persistent nav have no active state — and if its job is instead identity, why hold a 220px column at 44% fill for 2100px rather than 380px of masthead once, as `d` does for free?
