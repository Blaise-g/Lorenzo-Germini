---
target: "the site — homepage, /cv, /writing (issue #74)"
total_score: 26
max_score: 40
na_heuristics:
p0_count: 1
p1_count: 3
timestamp: 2026-08-03T08-37-03Z
slug: src-app-page-tsx
---

Method: dual-agent (A: design review · B: detector + browser evidence)

Target: the site — `/`, `/cv`, `/writing` at 375/1024/1440, light + dark + print emulation. Supporting critique for issue #74, run after the owner's list was settled.

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                                                                                |
| --------- | ------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 2         | Theme toggle has no `aria-pressed`; label is always "Toggle theme" (`theme-toggle.tsx:35`). Offset by `/writing`'s count-aware line.                     |
| 2         | Match System / Real World       | 3         | ⌘ glyph shipped as a touch affordance below xl (`floating-action-cluster.tsx:16`); the chord is ⌘J, not the conventional ⌘K.                             |
| 3         | User Control and Freedom        | 2         | `/writing` unreachable from `/` — 0 of 28 visible hrefs at both 375 and 1024. `/cv` is 4,430px at 375 with no in-page nav, unlike `/`.                   |
| 4         | Consistency and Standards       | 2         | Footer geometry matches no route. Three left edges on `/` at 1024: 40, 316, 128.                                                                         |
| 5         | Error Prevention                | 3         | Subscribe form works JS-off via a real GET action; `noValidate` only after hydration. Ctrl+J takes the browser's Downloads shortcut on Windows/Linux.    |
| 6         | Recognition Rather Than Recall  | 3         | The ⌘J hint renders `xl:block` while its button renders `xl:hidden` — discoverable exactly where it can't be clicked.                                    |
| 7         | Flexibility and Efficiency      | 2         | Same inversion; the palette's payload is links already visible on every route. No section jumps on `/cv`.                                                |
| 8         | Aesthetic and Minimalist Design | 3         | Warm Print earns this. Deduct: Projects grid at ≥lg, and a perpetual `animate-pulse` dot duplicating the "Live" badge 3 lines below.                     |
| 9         | Error Recovery                  | 3         | `role="alert"` + `aria-invalid` + `aria-describedby` wired correctly. Error line and reassurance line are two near-identical 12–13px mono lines stacked. |
| 10        | Help and Documentation          | 3         | `/llms.txt` serves a real audience. Deduct: the print hint prints onto the CV.                                                                           |
| **Total** |                                 | **26/40** | **Acceptable**                                                                                                                                           |

All ten apply. ADR 0001 removes the error _colour_, not the error _surface_ — the subscribe module has real validation and locked error copy, so 5 and 9 are scored rather than `n/a`.

## Design Specificity Verdict

**Authored, not interchangeable — with one section that reads as unfinished.**

**LLM assessment.** This is not a template, and the evidence is in the consequences the system accepts: the coverless fallback uses `bg-ink/[0.06]` so it renders _lighter_ than ground in dark mode (`writing-index.tsx:284`); dark covers take `brightness-[0.82]` because a near-white cover measures 1.04:1 against warm paper (`:304`); `/writing`'s count-aware line states the site's own emptiness as a fact rather than a failure. No category-generic site does that. Pulling against it: Projects at 1024 is one 320px card in a 652px two-column grid with 332px of dead space and a left edge 12px off every sibling section; and the footer's `container … max-w-3xl` geometry (`site-footer.tsx:12-13`) matches none of the three shells, so the last rule on every page misses — 16px in on `/cv`, a 40px overhang on `/writing`, a third left edge on `/`.

**Deterministic scan.** `detect.mjs` on `src/app`: exit 0, zero findings. On `src/components`: one `side-tab` warning at `command.tsx:116` (`border-l-2`), which is a false positive — the border is `border-transparent` until `data-[selected=true]`, a transient keyboard-selection indicator on a palette row, not a persistent card stripe. In-page detection reported 3 / 22 / 4 findings on `/` / `/cv` / `/writing`; the substantive one is `line-length` ×18 on `/cv` at ~114 chars per line. `cream-palette` (`rgb(250,246,239)`) and `overused-font` (Inter at 29–42%) are the detector flagging Warm Print's premise, and `all-caps-body` fires on the mono metadata tier the glossary defines. Dark mode is identical minus `cream-palette`.

**Visual overlays.** Injection succeeded on all three routes (5 / 37 / 5 overlay nodes); the live server on port 8400 was started, used, and confirmed stopped.

## Overall Impression

The typographic system is genuinely good and it is _enforced_ — every one of the seven roles clears WCAG AA in all three token sets, the 12px `faint` floor holds with no exceptions anywhere in `src/`, and there is zero print-token drift. What lets it down is the seam between surfaces rather than any surface itself: an index nothing links to, a footer aligned to nothing, a teaser promising an article that doesn't exist yet, and a browser instruction baked into the downloadable PDF. Biggest opportunity: the site is one link and one alignment away from feeling finished.

## What's Working

1. **The `faint` role and its 12px floor are actually enforced.** All seven roles clear AA against ground in light, dark and print; measured global minimum contrast across 56–92 text-bearing elements per route is **6.34:1**, with no element carrying a chain opacity below 1. Independently confirmed by both assessments. ADR 0001's "contrast _and_ size" definition is why this held where a ratio-only rule would have drifted.
2. **The `/cv` print output is a real document.** Print emulation renders one dense correctly-ordered page, colours converting to the print set, `break-inside: avoid` holding, all metadata at 9pt. Print emulation with `dark` present vs absent differs on **0 of 254 compared nodes** across three routes — the repo's documented blind spot is, right now, clean.
3. **`/writing`'s empty state is designed rather than defaulted.** `CountAwareLine` disappears above n=1 instead of persisting as boilerplate, and the fixtures prove the transitions through the real parser and real cache.

## Priority Issues

**[P0] The CV's browser instruction is printed on the CV — and is in the shipped PDF.**
`cv/page.tsx:101-103` has no `print:hidden`; under print emulation it computes `display: block` at y=84, between the role line and the address block. `pdftotext public/lorenzo-germini-cv.pdf` confirms the string is in the checked-in file served behind "Download CV (PDF)". Every recruiter who downloads it receives a UI instruction as part of the document.
_Fix:_ add `print:hidden`; regenerate the PDF. Suggested command: `/impeccable harden`

**[P1] `.touch-target` is declared outside any `@layer`, so it defeats display utilities.**
`globals.css:145-150` sits after `@layer base` closes at 110. Unlayered rules beat every layered rule regardless of specificity, so `.hidden` and `print:hidden` cannot hide an element carrying `touch-target`. Verified: the hero CTA (`page.tsx:110`) computes `display: flex` under print emulation despite `print:hidden`, and prints on the homepage. Scope correction against Assessment A's report: exactly **one** element in the codebase currently combines `touch-target` with a hide utility, so today's blast radius is that CTA. The value of fixing it is the trap it sets for the next component.
_Fix:_ wrap the component utilities in `@layer utilities`, then re-run the suite — layering also makes `min-height: 1.5rem` overridable, which is a behaviour change for ~20 call sites.
_Suggested command:_ `/impeccable harden`

**[P1] `/writing` is orphaned, and `/` advertises a field note that doesn't exist.**
Zero of 28 visible links on `/` point to `/writing`, at both 375 and 1024. Meanwhile `homepage.writing.featured` ships a title, excerpt and "Read the field note →" pointing at the publication root, which per `/writing`'s own copy has nothing on it. The site's designated single primary CTA therefore leads to a dead end while the one honest surface is unreachable. Note the site is already live, so this is visible today, not only hypothetically.
_Fix:_ the owner's item 5 (`All writing →`) plus the item 4 masthead link fix the orphaning. The false teaser resolves itself the moment article one publishes — a launch-day verification, not a code change, unless the pre-launch window matters.
_Suggested command:_ `/impeccable clarify`

**[P1] The footer is aligned to nothing, on every route.**
Measured left/right at 1024: `/cv` header 112→912 vs footer 128→896; `/writing` content 168→856 vs footer 128→896, a 40px overhang on both sides; `/` masthead 40, content 316, footer 128. On a site whose entire claim is typographic discipline, the last rule on every page misses.
_Fix:_ give the footer the host route's inset — export the shell inset from `hub-shell.tsx` and take a measure prop, defaulting to `/cv`'s `max-w-4xl` document box.
_Suggested command:_ `/impeccable layout`

**[P2] `/writing` has no print treatment, and the spec's print matrix never covered it.**
The spec verifies print on `/` and `/cv` only. Measured in an ~800px print box: `measure` keeps `pr-20` because `lg:pr-6` needs 1024px, so every printed page is 56px off-centre reserving room for a `print:hidden` theme toggle; the subscribe `<form>` prints, including a solid `rgb(122,47,22)` fill under `print-color-adjust: exact`; the nav prints.
_Fix:_ `print:pr-0` on `measure`, `print:hidden` on the subscribe section and the nav.
_Suggested command:_ `/impeccable harden`

**[P3] Projects at ≥lg reads as broken.**
At 1024 a 652px two-column grid holds one 320px card with 332px empty, and `lg:-mx-3` puts its left edge at x=304 against x=316 for every sibling. The card description is 12px/16px — the smallest, tightest type on the homepage, in the section that holds the shipped artefacts.
_Fix:_ collapse to one column while the homepage-visible project count is under 2, drop `lg:-mx-3`, lift the description to 14px to match the Work proof line above it.
_Suggested command:_ `/impeccable layout`

## Persona Red Flags

**Jordan (first-timer, 1440):** clicks "START WITH THE WRITING ↓", reads a teaser for "Drop the Bloat", clicks "READ THE FIELD NOTE →", lands on an empty Substack — and concludes the writing is vapour. `/writing` would have told the truth; nothing links to it. Then reaches PROJECTS: one small card in a half-empty row with an unexplained pulsing dot, reading as under construction.

**Sam (keyboard + screen reader):** the theme toggle announces "Toggle theme, button" and never its state (`theme-toggle.tsx:29-42`). `/cv` has **no `<nav>` landmark at all** on a 4,430px six-section document — landmark navigation offers only `main` and `contentinfo`, and the sole route out is a "Back home" text link between two buttons. The rail uses `aria-current="true"` where `"location"` is the token for position-within-page (`sticky-rail.tsx:108`). Ctrl+J is intercepted on Windows/Linux, taking the browser's Downloads shortcut. Every text link measures 24–28px tall — at the WCAG 2.2 SC 2.5.8 floor, never above it.

**Casey (375, one thumb):** burns the whole first viewport on chrome — `<h1>` at y=351, CTA at y=775, zero proof content in 812px, and **11 tappable elements above the `<h1>`**, five of which repeat verbatim in the footer. On `/cv`, scrolls 632px before the word "PROFILE"; the three action buttons wrap onto two rows and the address wraps to four ragged lines with "X" orphaned. A 48px floating ⌘ button follows down every page, on a device with no ⌘ key, fronting links already on screen. On `/writing` today, 249px of the 1,217px page is footer — 20% of the surface and the largest interactive cluster on it.

## Minor Observations

- Touch targets: 24 sub-44px elements on `/`, 23 on `/cv`, 13 on `/writing`, smallest 24×24. `.touch-target` guarantees `min-height: 1.5rem` — **24px, not 44px**. This passes WCAG 2.2 AA (SC 2.5.8 requires 24×24), so it is not a conformance failure; it is a thumb problem and a misleadingly named class.
- Avatar `sizes` is wrong at both breakpoints: the band variant declares `96px` and renders 52px; the rail declares `80px` and renders 76px. Two `next/image` elements, one request (identical resolved URL).
- No horizontal overflow anywhere: `scrollWidth` 375 = `clientWidth` 375 on all three routes, both modes.
- Focus indicators verified by pixel-diffing focused vs blurred boxes — every focusable element on every route produces a visible change, 4.74%–74.05% of the clipped box. Computed style alone reports `outline-style: none` on many of them and is misleading here.
- Heading structure is clean: no skipped levels, exactly one `<h1>` per route.
- The y≈3184 tab-order defect the spec records is gone: first focusable inside `<main>` at 375 is y=153 / y=310 / y=48.
- `/writing` empty at 1024 leaves 270px of void between content end and the footer rule — the most exposed instance of the alignment defect.
- The count-aware line, the most important sentence on `/writing`, is set in the 12px uppercase mono metadata style and wraps to three lines at 375: the page's headline fact in its fine-print voice.
- `border` is the thinnest-margin token at 3.02:1 light / 3.11:1 dark against ground — passes SC 1.4.11 with 0.02 to spare. Any future warming of `ground` breaks it.
- `Cover` falls back only when `coverUrl` is `null`, not when the URL fails; there is no `onError` path. At fixture `1` — the launch state — the 386px lead box renders as a bordered empty rectangle pushing the title below the fold at 1024×900. Production behaviour against a live Substack CDN 404 is unverified.
- The printed homepage's section gaps measure 8px against ~4px paragraph gaps, so sections visibly run together.
- The printed `/cv` address lists GitHub · LinkedIn · X as bare unreachable words; the spec deliberately deleted URL-printing, so this is a consequence rather than an oversight.
- 10 em-dashes on `/` triggered `em-dash-overuse`. The copy is #71-approved, so this is noted, not actioned.

## Questions to Consider

1. The homepage thesis is "the writing as its first door." There are zero doors to `/writing` and one door to an empty publication. Is the thesis wrong, or the implementation one link short of it?
2. `/writing`'s n=0 state is the most honest thing on the site; `/`'s teaser is the least. Both ship today. Which is the site's voice?
3. If the ⌘ palette holds only links already visible, what is the permanent 48px floating button for — and would its absence be noticed?
4. `.touch-target` was the fix for ten sub-24px targets. It landed every one at _exactly_ 24px and disarmed a hiding mechanism doing it. Was the goal 2.5.8 conformance, or a thumb?
5. `/cv` is verified across eight print combinations; `/writing` across none, and has an 80px phantom margin and a printed email form to show for it. What rule decides a route deserves a print matrix?
6. Projects is one card. Systems is one line of 12px mono. Both carry a heading and a rule. When does a one-item section stop earning a heading and start advertising that there should be more?
