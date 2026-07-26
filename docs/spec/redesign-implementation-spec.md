# Redesign implementation spec

**Status:** owner-signed implementation contract (issue [#11](https://github.com/Blaise-g/Lorenzo-Germini/issues/11), 2026-07-26)
**Map:** [Wayfinder: website redesign — from chronological CV to professional hub with writing](https://github.com/Blaise-g/Lorenzo-Germini/issues/3)
**Baseline:** `main` @ `4ebb010`

This is the hand-off artifact. It consolidates every decision made on the map into three phases, and it is the only document an implementer should need to read end-to-end. Where a decision has a long rationale, the rationale stays on its ticket and is linked, not restated.

**One-line goal:** reposition the site from a chronological CV into a professional hub for an **AI Product Engineer**, with essays as a first-class part of the identity — without the site ever looking *less* technical than it does today.

## How to read this

- **Phase 1** ships on the *current* design. Every item is independently valuable, independently revertable, and none of it presumes the redesign happens.
- **Phase 2** is the redesign. Its internal order is load-bearing and stated explicitly; the `/cv` route is a hard prerequisite of the homepage swap.
- **Phase 3** is optional and unordered.
- **Every design and structural decision in here is locked.** What remains open is copy, naming and the publication URL — enumerated in [Open inputs](#open-inputs-this-spec-does-not-decide), with what each one blocks. There are no "the implementer decides" holes; if you find one, it is a defect in this document.
- Every numeric claim in this document was measured live in a browser during the ticket that produced it. Nothing here is estimated except the effort column.
- **Code references name symbols and selectors, not line numbers**, except where a line is genuinely the subject (the unlayered `*` rules in `globals.css`). The working tree at the time of writing is ahead of the stated baseline, so line numbers quoted from earlier tickets do not resolve against `4ebb010` — several in the map's own notes no longer do.

## Source decisions

| Ticket | What it settled |
|---|---|
| [#4](https://github.com/Blaise-g/Lorenzo-Germini/issues/4) | Audit + the one binding constraint: never look less technical |
| [#5](https://github.com/Blaise-g/Lorenzo-Germini/issues/5) | Substack RSS mechanics (partly superseded by #10) |
| [#6](https://github.com/Blaise-g/Lorenzo-Germini/issues/6) | Positioning brief — "AI Product Engineer", founders & product leaders, CTA = read the writing |
| [#7](https://github.com/Blaise-g/Lorenzo-Germini/issues/7) | Direction: Variant B "Editorial" + agent-native affordances |
| [#8](https://github.com/Blaise-g/Lorenzo-Germini/issues/8) | Visual treatment: B1 "Warm Print" |
| [#9](https://github.com/Blaise-g/Lorenzo-Germini/issues/9) | `/cv` route, build-generated PDF, two print blocks |
| [#10](https://github.com/Blaise-g/Lorenzo-Germini/issues/10) | Substack integration: RSS, two surfaces, `?email=` handoff, `cacheComponents` |
| [#11](https://github.com/Blaise-g/Lorenzo-Germini/issues/11) | Owner sign-off; Ambient Current accepted as one named, gated exception to the default motion contract |
| [#12](https://github.com/Blaise-g/Lorenzo-Germini/issues/12) | Composition: 220px sticky rail at `lg`+, single measure below |
| [#13](https://github.com/Blaise-g/Lorenzo-Germini/issues/13) | `/writing` pixels: grain dropped, numbering dropped, launch line, feed link |

Prototype reference code lives in `src/components/prototype/` and `src/app/writing/page.tsx` (dev-only, never merged to production routes). It is **reference, not a starting point** — see [Prototype teardown](#prototype-teardown).

---

# Decisions this spec makes

Nine questions were handed to #11 marked *"the spec must decide."* They are
decided here rather than buried in a phase. A tenth decision was added after
the runnable Ambient Current prototype detour produced real-browser evidence.

1. **Mobile navigation below `lg`.** A mono anchor row (`Writing · Work · Projects · CV`) sits directly under the identity band, in the normal document flow. It must clear the fixed theme toggle — see item 2. Rationale: as built, *neither* composition in #12 offered a phone visitor any route to Writing except scrolling past Work, and `/writing`'s always-visible mono nav row was measured working at every width.

2. **Fixed chrome gets reserved gutters, top and bottom.** The theme toggle, `BackToTop` and the command FAB may not overlap content at any width.
   - **Top-right:** below `lg` the masthead reserves `pr-12`, and no in-flow interactive element may enter the top-right 56×56 box.
   - **Bottom-right:** below `lg` the page reserves `pb-20` on its last in-flow block, and the FAB and `BackToTop` share one stacked cluster in a 56px-wide bottom-right column rather than being placed independently. Above `lg` they may sit in the margin, which is 752px wide at 1440 and empty.

   Rationale: two measured collisions — 63px² of the `/writing` CV link hit-testing as "Toggle theme" at 375, and up to 640px² of command FAB over the essay excerpt. The second is a *bottom*-right collision, which a top-right exclusion zone alone does not prevent.

3. **Primary-action treatment — LOCKED.** The subscribe submit becomes the *only* filled control in the system: **solid accent ground, 12px mono uppercase, ≥44px tall**. Every other CTA keeps the 11px mono accent underline. Rationale: #13 measured 11 discrete CTAs in the last ~600px of `/writing`, 10 sharing one treatment — the submit was indistinguishable from a navigation link. A ~44px control is not a "large fill" and does not violate #8's accent discipline.

   **The label colour inverts between modes, and this is not optional:**

   | | fill | label | contrast | |
   |---|---|---|---|---|
   | **light** | `#9c3c1c` | paper `#faf6ef` | **6.34:1** | ✓ ship |
   | **dark** | `#d98d63` | ink `#171412` | **6.93:1** | ✓ ship |
   | ~~dark~~ | ~~`#d98d63`~~ | ~~paper `#ece7de`~~ | **2.15:1** | ✗ AA fail — the trap |
   | ~~light~~ | ~~`#d98d63`~~ | ~~paper `#faf6ef`~~ | **2.45:1** | ✗ (same trap, wrong ground) |

   Paper text on the dark accent fails badly. The dark accent was lightened for legibility *as text on a dark ground*, which makes it a light ground itself — so dark mode takes **ink on accent**. Getting this wrong is the single most likely visual defect in the spec, because it is the intuitive choice.

   *On the 6.34 vs 6.16 discrepancy:* #8 recorded 6.16:1 for the light accent. That measurement was taken **with the grain overlay composited** (#8 noted `multiply` costs a further 1–2%). The grain is dropped, so **6.34:1 is the operative figure** and every accent number on the map that carried the grain penalty is now slightly conservative.

   **Three states, not four — there is no disabled state.**

   | state | treatment |
   |---|---|
   | `hover` | accent darkens ~8% (light) / lightens ~8% (dark); label unchanged |
   | `focus-visible` | the §2.1 ring at 2px offset, so it reads against the fill rather than blending into it |
   | pending | **no custom pending UI.** The form is a GET navigation; the browser's own navigation state is the indicator. Do not build a spinner. Only requirement: the label must not reflow |

   **The submit stays enabled and focusable at all times.** An empty field is not a dead end — attempting submission is how the reader gets the error. Contract: `required` + `type="email"` on the field, and on attempted submission the wired error surfaces through `aria-describedby` + `role="alert"`. This is the no-JS-compatible path, since native validation and the GET fallback both work without it.

   Two reasons a disabled state is rejected rather than merely unnecessary:
   - **It cannot pass contrast with these colours.** The accent at 40% computes to `#d4ac9b` in light (paper label = **1.92:1**) and `#654432` in dark (ink label = **2.12:1**). There is no disabled treatment in this palette that holds 4.5:1.
   - **`aria-disabled` would announce "unavailable" without saying why**, and it requires manually suppressing activation while staying focusable — which breaks the native GET fallback that is the whole reason this mechanism was chosen.

4. **SYSTEMS stays a colophon, deliberately.** It remains at the foot of the page at ~83% depth. Rationale: #12's fold now names a concrete system and per-role `homepageProof` carries technical nouns through Work, so the stack line no longer has to do the "is this person technical" work it was doing when the decision was flagged. Its content sets at 12px so its own 15px heading outranks it.

5. **Heading rank on `/writing`.** `h1 "Writing"` holds 36px; the **lead essay title yields to 28px**, rows to 20px. Rationale: #13 found `h1` and the lead title both at 36px in the same colour, differing only by weight. Demoting the `h1` instead would reproduce exactly the rank inversion #12 fixed.

6. **Substack link budget.** Three surfaces, **never more than two per route**: the subscribe module at the end of `/writing`, the archive link **below** the module (not at the end of the list), and the footer subscribe link **suppressed on `/writing`** where the module already lives. (Per route, not per viewport — the test is countable in the DOM, not dependent on scroll position.) Rationale: #10 decision 6 wanted two placements; #13 measured three inside 400px, with the end-of-list archive link taking the reader off-site *before* the conversion point.

7. **Previewed posts — a threshold, not a paywall detector.** #10 said reading time is "omitted when the body looks previewed." That is not an implementation contract, and the research found **no explicit paid flag in the feed** — so nothing in this spec may claim to detect paid posts.

   What ships instead: reading time is computed from `content:encoded` word count and **omitted when `content:encoded` is absent or under 250 words**. When it is omitted, the metadata row renders the date alone — no `Paid` label, no `—`, no placeholder, because the site cannot prove *why* the body was short. A short free post is indistinguishable from a truncated paid one on the available evidence, and labelling it "Paid" would be a guess rendered as a fact.

   The publication launches free, so this is a guard rail against a lone-date row looking like a data bug, not a paywall feature. **Verifying the actual paywall marker requires a real paid post to inspect** — Phase 3, if the owner ever gates a post. Do not invent the marker before then.

8. **No subscribe success state — accepted deliberately.** The `?email=` handoff cannot confirm a signup. Copy promises a handoff ("continue on Substack"), never success; the typed address is lost on refresh. Documented as a known hole rather than solved, because every mechanism that *could* confirm it is either Cloudflare-blocked (#10) or funnels readers into Substack Recommendations.

9. **Reading-order rule, generalised.** No layout may use CSS `order-*` or `flex-direction: *-reverse` to reorder interactive content against DOM order. Grid `col-start`/`row-start` only. Rationale: WCAG 2.4.3, and #12 found the prototype's own comment falsely claiming this was fixed.

10. **Motion contract — one named Ambient Current exception.** One reveal
    keyed to each section's own mount remains the default motion contract.
    Continuous motion is not generally authorized. The homepage alone may add
    one slow Canvas 2D contour field, **Ambient Current with Rail Instrument
    containment**, at `lg` and above.

    The exception is narrower than the visual-system hypothesis:

    - Hard-clip all drawn pixels to the extreme outer margin and a narrow
      rail-edge instrument lane. Zero generated pixels may enter rail content,
      navigation, metadata, controls, the rail/main gap outside that lane, or
      the reading measure.
    - The canvas is decorative and outside the reading order:
      `aria-hidden="true"`, `role="presentation"`, `tabIndex={-1}`,
      `pointer-events: none`. Scroll-spy remains semantic and independent.
    - Below `lg`, run no continuous loop. The homepage uses no canvas or a
      composed static trace only if the single reading measure remains clear.
    - `/cv` may use a static, screen-only trace in the extreme outer margin.
      `/writing` receives **no continuous-motion exception** from this
      prototype. Print and generated PDFs contain no canvas or decoration.
    - `prefers-reduced-motion: reduce` draws at most one composed static frame
      and starts no animation loop, including during hydration.
    - Pause on `document.hidden` and when the owning surface is genuinely not
      visible. An `IntersectionObserver` attached only to a fixed
      full-viewport canvas does not satisfy the offscreen gate; the
      implementation needs a non-fixed owning surface or another directly
      testable lifecycle contract.
    - Cap effective device-pixel ratio at **1.5** and the loop at **24 FPS**.
      In the browser acceptance environment, Canvas draw work must remain
      **p95 ≤ 1 ms/frame**, create no attributable long task, cause no
      observable scroll degradation, and keep **CLS ≤ 0.01** across motion,
      reduced-motion, initialization-failure, and no-JS states.
    - Loading, failure, and no-JS states preserve exactly the same content
      geometry. Failure is silent and fail-closed: content remains complete
      and the ambient layer disappears.
    - Base lines stay faint and neutral/ink-derived. Terracotta remains a rare
      signal. The validated prototype's density and contrast are ceilings;
      implementation may go quieter, never denser or louder without a new
      decision.

    **Why this exception exists:** the browser prototype measured Canvas 2D at
    ~0.18–0.25 ms average draw cost, ~0.7 ms observed maximum, DPR ≤1.5,
    24 FPS cap, no long tasks, and CLS 0. Pixel and text-range checks found
    zero content-region pixels and zero visible text intersections. The
    Impeccable critique scored 30/32 and judged the rail-bound motif authored
    rather than generic generative decoration. Canvas 2D was visually
    sufficient; WebGL/Radiant is not authorized absent a separate measured
    benefit and decision.

# Open inputs this spec does not decide

These are inputs the implementer needs and does not have. **Nothing in Phase 1 is blocked by any of them.**

| Input | Blocks | Notes |
|---|---|---|
| **Final hero, About and section copy** | §2.6, §2.7 | Constrained below, not written. The fold must name at least one concrete system; #12's `"Right now: the agentic RAG engine behind a compliance platform"` is a *recommendation*, not a locked line. §2.7 is blocked too, because the metadata surfaces mirror the copy verbatim |
| **Substack publication name and URL** | §2.5 | `SUBSTACK_BASE` is `https://lorenzogermini.substack.com` in the prototype; the publication does not exist yet. §2.4 is *not* blocked — the `cacheComponents` migration is site-wide and needs no feed |
| **Whether the essay outranks the positioning statement in type size** | nothing | §2.6 ships the current hierarchy — person outranks writing — **deliberately**, not by default. It is the incumbent's information architecture in a nicer typeface, and inverting it is a one-line type-scale change once the copy exists. Do not hold the swap for it. Listed again in Phase 3 as the experiment |
| **Bilingual EN/IT structure** | nothing | The feed carries no per-item language, so there is nothing to build against until IT publishing starts. **Do not pre-build filtering** |

---

# Phase 1 — Minimal improvements

**Premise:** every item ships on the current slate-indigo design, on `main`, with no visual redesign. Several are confirmed WCAG failures on the live site. Nothing here is throwaway — Phase 2 builds on all of it.

**Rough effort: 2–3 days.**

## 1.1 Cascade-layer fix — do this first

`src/app/globals.css:114-116` and `:131-136` declare `*` rules **outside any cascade layer**. Tailwind v4 puts `border-*` and `outline-*` utilities inside `@layer utilities`, and unlayered rules beat layered ones on layer order regardless of specificity. Measured consequence: on the current production homepage **all 41 bordered elements** compute to `rgb(232,230,227)` — not one gets a per-element border colour — and no component can style its own focus ring.

**Fix:** move both rules inside `@layer base`:

```css
@layer base {
  * { border-color: var(--color-border); }
  *:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-background), 0 0 0 4px var(--color-ring);
  }
}
```

This keeps the defaults and lets utilities win. **Do not simply delete them** — deleting the border rule falls back to `currentColor` on every bordered element, which is a visible regression on the current design.

**Verification:** pick any element with a `border-<color>` utility and confirm the computed `border-color` matches the utility, not `--color-border`. This is a hard prerequisite of the Phase 2 `@theme` migration — #8's single terracotta accent has never rendered anywhere, in any prototype or on the live site.

**Effort: 1h including verification.** Highest value-per-line item on this list.

## 1.2 Focus indicators (WCAG 2.4.7)

`ThemeToggle`, `BackToTop` and the command FAB have **no visible focus indicator at all** — focused computed style is byte-identical to unfocused, and `:focus-visible` does match on all three. Fixed by 1.1 in principle; verify each of the three individually by keyboard, because their Tailwind ring utilities may now win and resolve to transparent stops.

Also: `--color-ring` is `hsl(245 45% 46%)` (`#4941aa`) and the ring's 2px inner halo measures `#fbfaf9` on `#faf6ef` = **1.03:1** — invisible. Give the inner halo a real value, or drop to a single 3px ring. The ring must measure ≥3:1 against both the element and the page ground.

**Effort: 2h.**

## 1.3 Touch targets (WCAG 2.5.8)

**10 links are under 24px tall at 375** on the homepage and **11 on `/writing`**, purely on height — horizontal gaps pass. Worst case: `X` in the footer at **7.9×14px**. `ThemeToggle` is 36×36 and `BackToTop` 38–40×40, both under 44.

Fix at the convention level, not per-element, or every new surface reproduces it (it already reproduced on `/writing`): a shared inline-link class with `py-1.5` minimum, and `min-h-11 min-w-11` on the icon controls. Footer social icons get real padded hit areas.

**Effort: 3h.**

## 1.4 Reduced-motion defect

`globals.css:228-237` collapses `animation-duration` to `0.01ms` but never resets `animation-delay`, and `--animate-fade-in-up` uses fill mode `both`. Measured: under `prefers-reduced-motion: reduce`, item 6 of a staggered list **holds opacity 0 for 452–600ms past its own mount** — five of six essays invisible, and 450ms of blank projects section on the current homepage.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-delay: 0ms !important;
    /* …existing declarations… */
  }
}
```

Also delete the `.delay-100`…`.delay-600` classes' use on page-level reveals (see §2.6). Keyed to its own mount, every item was measured visible within 30ms, at **CLS 0.0000**.

**Effort: 1h.**

## 1.5 Hydration mismatch, dark mode only

The inline theme script in `src/app/layout.tsx`'s `<head>` adds `dark` to `document.documentElement` pre-hydration, while the `<html>` element it mutates carries no `suppressHydrationWarning`. Confirmed on the **current production homepage**: light mode 0 errors, dark mode 1. It hits exactly the visitors for whom the Phase 2 warm dark palette is a first-class requirement.

**Effort: 30m.**

## 1.6 Route-shared shell

The skip link and `#main-content` live in `src/app/page.tsx`, not `layout.tsx`, so no second route inherits them. There is also no `<footer>` anywhere. Both `/cv` and `/writing` need them.

Move the skip link and `#main-content` to `layout.tsx`; add a real `<footer>`.

**Phase 1's footer ships only the links whose destinations exist today:** contact links, social links, and the agents-welcome line pointing at `/llms.txt`. **The CV link, the feed link and the subscribe link are Phase 2** — `/cv` arrives in §2.3 and the publication URL is still an open input. Render them conditionally on their destination existing, so the footer is complete at every commit rather than shipping dead links and waiting for the redesign to justify them. This is what keeps Phase 1 independently shippable.

**Effort: 3h.**

## 1.7 Print CV baseline fixes

A real Chromium A4 render of the *current* print CV measures **3 pages**, page 2 28% blank, page 3 **75% empty** holding Projects alone, one bullet cut **mid-line** across the page-1/2 boundary, and 17 elements at 8px ≈ 6pt. There is no golden print path being preserved here.

- `@page { size: A4; margin: 14mm }`
- `break-inside: avoid` on each role block and each project card
- Remove `.print-force-new-page` from Projects (`globals.css:182-184` + its usage) — it is what strands page 3
- Raise the 8px floor to ≥9pt
- Delete the dead URL-printing pattern at `src/components/project-card.tsx:36` — `hidden … print:visible` cannot work, `visibility` does not undo `display: none`. Link URLs have never printed.

**Effort: 4h.** Superseded in shape by Phase 2 §2.3 but not wasted: the global baseline block survives, and the page-break rules port directly.

## 1.8 Small correctness items

- Exactly two production `target="_blank"` links are missing `rel="noopener noreferrer"` — the location link in `src/app/page.tsx` and the project title link in `src/components/project-card.tsx`. Six others already have it. Find them with `grep -rn 'target="_blank"' src | grep -v noopener` (which also matches prototype files — ignore those, they are deleted at [Prototype teardown](#prototype-teardown)).
- Hover styling on non-interactive skill badges — remove it.
- Verify `--color-muted-foreground` against AA in both modes at its smallest rendered size.
- Retire the hardcoded `dateModified: "2026-04-01"` at `src/components/structured-data.tsx:8` in favour of a build-time or data-derived value.
- **Do not add `Referrer-Policy: no-referrer`.** The site sets no custom headers today; the browser default `strict-origin-when-cross-origin` is what will let Substack's Top Sources attribute signups to this domain. Tightening it silently destroys attribution.

**Effort: 2h.**

---

# Phase 2 — Structural redesign

**Premise:** this is the redesign. The internal order is a dependency chain, not a preference.

```
2.1 tokens ──▶ 2.2 shell ──▶ 2.3 /cv ──▶ 2.4 cacheComponents ──▶ 2.5 /writing ──▶ 2.6 homepage swap ──▶ 2.7 lockstep metadata
```

**The sequencing rule that governs the whole phase:** `/cv` ships *before* the homepage swap, because the swap deletes content that today exists nowhere else. There must never be a commit where the site knows less than it does now. This was #9's strongest call and it is not negotiable without redoing that ticket.

**Rough effort: 13–15 days** (2 + 2 + 3 + 1–2 + 3 + 2 + 0.5, plus no overlap assumed — the chain is sequential by construction, so nothing parallelises).

## 2.1 Warm Print `@theme` migration

**Prerequisite:** Phase 1 §1.1. Without it no border or focus token renders.

Migrate `src/app/globals.css`'s `@theme` block and `.dark` overrides to Warm Print. The palette must live in the tokens, **not alongside slate-indigo as one-off literals** — the prototypes use literals, and left that way shadcn/ui components and every non-homepage surface drift from the redesign.

| Token | Light | Dark |
|---|---|---|
| ground (`--color-background`) | `#faf6ef` | `#171412` |
| ink (`--color-foreground`) | `#1c1917` | `#ece7de` |
| body | `#3f3a35` | `#c9c2b7` |
| faint | `#5c554e` | `#a49a8e` |
| accent | `#9c3c1c` | `#d98d63` |
| `--color-ring` | accent | accent |

- **`faint` must be an explicit token, never `opacity-55`.** Composited, `opacity-55` measures `rgb(128,124,120)` on `#faf6ef` = **3.84:1**, failing AA at 11px, **light mode only** — which is why it survived four tickets whose only dark-mode artifact was a screenshot. It carries every date, tag, tech stack and metadata line in the design. The explicit tokens measure 6.34:1 light / 6.63:1 dark.
- The dark pass is a **first-class requirement**, not a follow-up. Dark ground is warm near-black, not slate or zinc.
- `--color-ring` must leave indigo; `BackToTop`'s background needs a warm value too.
- The accent needs **no contrast work** — `#9c3c1c` on `#faf6ef` = **6.34:1**, `#d98d63` on `#171412` = **6.93:1**, both comfortably AA. (#8 recorded 6.16:1 for the light pair, measured with the now-dropped grain composited; 6.34 is the value without it.) The risk recorded on #8 was aimed at the wrong element and is dismissed.
- Accent is reserved for: hero emphasis italic, section headings, links, the primary control. **Never large fills.**
- Delete `src/components/prototype/warm-print.ts`'s `BORDER_SHIM` concept entirely — it exists only because §1.1 was unfixed.

**Typography:** add Fraunces (variable, `opsz` axis, normal + italic) — the only font addition. Inter unchanged for body, JetBrains Mono for all metadata. Fraunces for wordmark, hero, essay/role/project titles; italic is the emphasis device. Mono metadata against serif display is what keeps the layout from reading as a blog template.

- Section headings: **15px mono, 600, uppercase, `tracking-[0.18em]`, accent, hairline rule.** 13px was measured at 0.43× the smallest `h3` it headed and was the lowest-contrast text on the page.
- Hero: `clamp(2rem, 5.2vw, 3.25rem)`. The prototype's `3.75rem` ceiling produced a **5-line, 324px hero at ≥1280** — 36% of a 900px viewport.
- **No grain overlay.** #8's "one faint grain overlay" is **dropped**: measured, it shifts covers by 0.36/255 (light) / 2.61/255 (dark) and shifts the paper ground by the same amount, so it never treated images differently. At 4× strength it is still under 1.5/255. It bought a full-viewport `mix-blend-multiply` rasterization per scroll frame for nothing.

**Effort: 2 days** including a both-modes contrast sweep of every existing shadcn/ui component.

## 2.2 Shell and composition primitives

**Layout (governs the homepage and, in reduced form, every route):**

- Masthead → `lg:grid-cols-[220px_1fr] lg:gap-14` inside `max-w-5xl`; 220px sticky rail + main column at `lg` and up, single ~688px measure below.
- The rail is `hidden lg:block`. **Below `lg` the rail's content never enters the flow** — not above the `<h1>`, not below the content. The identity band carries it. Above the `<h1>` it buries the positioning statement under ~380px of avatar and bio; below the content it is an orphaned duplicate footer at 80% page depth for +288px of scroll.
- **The rail ships with a scroll-spy active state** — IntersectionObserver → `aria-current="true"` plus an accent left-border. This is a **condition of the composition, not a polish item**: the 220px column is only 44% filled in every frame, and orientation is its entire justification. Without it, it is a jump menu that is always visible and never informative.
- Main content caps at `max-w-[42rem]`; **only Projects releases the cap, and only at `lg`** (`max-w-[42rem] lg:max-w-none`). Never let a block escape the measure below the breakpoint that gives it a second column — at 1023px Projects rendered **943px wide and single-column** under a page of 672px measures.
- One **full-bleed hairline** (masthead rule running to the viewport edge, not stopping at the measure) — the single gesture that makes a centred measure read as intentional.
- Mobile anchor row under the identity band, per [decision 1](#decisions-this-spec-makes).

**Why the rail:** +37% above-fold copy at 1440, +59% at 375; 66% vs 48% of viewport width used; face and nav on screen for 85.6% of the scroll — and it is the only arm the review judged *authored* rather than category-interchangeable.

**Component inventory** (all built and verified in prototypes):

masthead · identity band (below `lg`) · sticky rail with scroll-spy nav · mobile anchor row · section heading + rule · essay lead · essay row · prose-timeline row · project card · systems line · footer · subscribe module · count-aware essay list + space-holding fallback · cover thumbnail + coverless fallback panel.

**Effort: 2 days.**

## 2.3 The `/cv` route

**Ships before the homepage swap.**

- Dedicated `/cv` route rendered from `src/data/resume-data.tsx`. Warm Print tokens at **document density**, not editorial airiness.
- **Export: a build step** renders `/cv` from the same `RESUME_DATA` into `public/lorenzo-germini-cv.pdf`. Primary action is **Download CV (PDF)** with a controlled filename and zero drift. This is categorically different from the hand-maintained static PDF rejected in #9's first pass — same single source of truth.
- `Cmd+P` must also behave: `<title>` exactly `Lorenzo-Germini-CV`, `@page { size: A4; margin: 14mm }`, `break-inside: avoid` per role block, and a mono hint line about unchecking browser headers/footers.
- **Print CSS is two blocks**: a **global baseline** (hide chrome, neutralise `position: fixed`, force white ground + near-black ink for `:root` **and** `.dark`) plus a **`/cv`-scoped** block for page breaks and document specifics. One block scoped to `/cv` leaves `Cmd+P` on the homepage emitting warm paper and dark tokens.
- **Content split — no duplicated *layout*, not no shared facts.** The homepage keeps a body-contrast mono systems line, per-role `homepageProof`, and the one-line credential. `/cv` holds full role bullets, full degrees with institutions and dates, the enriched skills taxonomy, and full contact. Read the ticket before narrowing this: as originally locked it cut the homepage from 18 proof statements to 4 and deleted **every** technical noun in the data — multi-provider LLM infrastructure, agentic RAG, evaluation frameworks, pgai, tracing — because the layout renders `description[0]`, and `description[0]` for Complaion is the business sentence. That violates the audit's one binding constraint.
- Discoverability: mono `CV →` in the sticky rail, repeated in the footer; command-menu **Print** becomes context-dependent (**View CV** off-route, **Print CV** on-route).
- An **"Updated \<month year\>"** line — the highest-trust-per-byte element on the surface, and it retires the hardcoded `dateModified`.
- `/cv` gets `Person` / `alumniOf` / `hasOccupation` JSON-LD, not the homepage's `ProfilePage`.
- `/cv` needs **its own OG image**. It currently inherits a dark slate-indigo card captioned "Full-Stack AI Engineer" — a palette this redesign abandons and a title it replaces. For many recipients the OG card *is* the CV's first impression.
- `sitemap.ts` emits exactly one entry today; add `/cv`. **Do not expect `priority` or `changeFrequency` to keep Google from picking `/cv` as the entry result** — [Google ignores both](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). #9 recorded that as the mechanism and it is wrong. The controls that actually work are the ones to use: a self-referencing canonical on `/cv`, the homepage as the only internally-linked hub (every route links home, `/cv` is linked *from* the rail and footer and links back), a `title`/`description` on `/cv` that reads as a document rather than a landing page, and the homepage's richer `ProfilePage` JSON-LD against `/cv`'s narrower `Person`. Set the sitemap fields to sane values if you like; just do not treat them as the guard rail. `/resume` 301s to `/cv`.
- **ATS extraction must be verified, not assumed.** A two-column grid with subsetted variable Fraunces and `tracking-[0.12em]` uppercase mono is a known mangling combination. The generated PDF collapses to a single column, and the acceptance test extracts its text.

**Effort: 3 days**, of which ~1 is the PDF build step and its CI wiring.

## 2.4 `cacheComponents` migration

`next.config.ts` does not enable `cacheComponents`, which is the prerequisite for `use cache` / `cacheLife` / `cacheTag`. #10 chose the idiomatic Next 16 path over the cheaper `fetch(…, { next: { revalidate } })` fallback, **accepting that the flag changes prerender semantics for every route**.

This is a **blocker, not a follow-up**: it needs a site-wide prerender audit with Suspense boundaries, covering `/cv` and its build-generated PDF. Doing it after `/writing` means auditing a moving target.

**Effort: 1–2 days**, the widest uncertainty band in the spec.

## 2.5 `/writing` and the Substack integration

**Feed:** native `https://<pub>.substack.com/feed`, **server-side only** — browser `fetch` is CORS-blocked. `fast-xml-parser` (new dependency) in a server `src/lib/substack.ts` with `"use cache"` + `cacheTag('substack-feed')`. No full text is ever hosted locally; entries link out to `/p/<slug>` from the feed's `link`.

**Failure-tolerant fetch.** An unreachable, empty or malformed feed renders the section as **absent** — never a broken or empty centerpiece, never a failed build. This also removes launch-day ordering as a constraint: the site can deploy before the first post exists.

**Cache policy — the one place failure-as-absence and caching interact badly.** #10 chose `cacheLife('days')`, and the pinned Next 16 profile for `days` is `stale: 5min / revalidate: 1 day / expire: 1 week`. Combined with failure-as-absence, deploying before the first post exists caches *"there is no writing"* and serves it for up to a day after publication — on the surface the site's primary CTA points at, during the only week anyone is looking. `cacheTag` alone does not fix this; a tag does nothing until something calls `revalidateTag`.

Locked policy, all three parts:

1. **Successful feeds** use `cacheLife('hours')` (`revalidate: 1 hour`) until the archive reaches **4 posts**, then move to `'days'`. One line, one constant, and the comment names the threshold.

   The threshold is a **chosen operational policy, not an empirical optimum** — there is no measurement behind "4". It is picked because it coincides with the last count-aware rendering transition: at n=4 the surface becomes a stable full index, so it stops changing shape on publish and hourly revalidation stops earning its keep. Move it if publishing cadence turns out different; nothing else depends on the number.

2. **Empty, unreachable and malformed results get their own short profile** — a custom `feedMiss` profile at `stale: 60 / revalidate: 300 / expire: 900`. A miss must never inherit a success lifetime. **This is the actual fix**; part 1 alone still caches a miss for an hour.

3. **A manual invalidation endpoint, fully specified** (no implementer choice here — the spec says there are none, so this one gets nailed down):

   | | |
   |---|---|
   | Route | `POST /api/revalidate/substack` — a Route Handler |
   | Auth | `Authorization: Bearer <secret>` from an environment variable |
   | Missing/wrong secret | `401`, no body, no timing difference worth exploiting |
   | Success | `revalidateTag('substack-feed')` and **only** that tag, then `204` |
   | Forbidden | **No `GET` mutation, and the secret never travels in the query string** — a `GET` that revalidates is a prefetch away from being triggered by a crawler |

   Do not rely on redeploy-to-purge. The whole point of the feed is that the site does not redeploy when Lorenzo publishes.

Verifying part 2 is an acceptance test, not an inspection: the empty-feed fixture must be observed *recovering*, not just rendering as absent once. Note that revalidation is **request-driven** — after the 300s window the first request may still receive the stale absence while triggering regeneration, and a subsequent request observes the recovered feed. The test asserts that two-step sequence, not instant recovery.

**Count-aware rendering.** The publication does not exist yet and its launch is coupled to the site's, so **day one is exactly one post**. 0 → section absent entirely. 1 → lead treatment only, no archive link. 2–3 → lead + compact rows. 4+ → full index and a "Read all essays" link to **`${SUBSTACK_BASE}/archive`** (an off-site Substack URL — there is no local `/archive` route and none is planned). The section must never imply more writing exists than does. At n=1 a mono **launch line** renders ("First essay published \<date\> · new ones roughly fortnightly") — without it the page read as *a page with one thing on it* under a standfirst promising "essays" plural.

**No numbering, anywhere.** #10's publication-order numbering and #7's numbered lead feature are both **dropped**. Verified live: numbers derived from the *fetched feed window*, not the archive, so the same essay rendered **04 at four items and 06 at six** — exactly the renumbering the decision existed to prevent, and it will happen in production the moment Substack's feed window slides past the archive. No reader could decode the scheme either (it counted up while the list counted down, with no total and no key). **The homepage teaser loses its numbers too.**

**Metadata row:** date + computed reading time, in the explicit `faint` token. Language chips and topic tags are **dropped** — the feed has no per-item language (channel-level only), no tags, no reading time. Reading time is computed from `content:encoded` word count; see [decision 7](#decisions-this-spec-makes) for previewed posts.

**Covers — thumbnails on `/writing` only; the homepage stays typographic.** One image per entry from the feed's `enclosure`. Requires `substackcdn.com` and `substack-post-media.s3.amazonaws.com` in `next.config.ts` `remotePatterns`, plus `fill` and a fixed aspect ratio, since `enclosure` reports `length="0"` and carries no intrinsic dimensions.

The real cover risk is **luminance against the ground**, which #10 never considered:

| cover | vs paper (light) | vs near-black (dark) |
|---|---|---|
| near-white diagram | **1.04:1** — no edge at all | **17.43:1** — brighter than any text on the page |
| Substack auto-generated title card | 1.07:1 | 15.68:1 |
| dark photographic | 4.53:1 | 1.06:1 — no edge |

Text on the page runs 6.6–13:1, so a white cover out-shouts every word around it in dark mode and has no boundary at all in light. **Substack auto-generates white cards, so this is the default case.** Therefore: **every cover carries a hairline in both modes** (≥3:1 against the ground — it is a functional boundary, not decoration), and light covers are knocked back in dark (`dark:brightness-[0.82]`). Deliberate cover art is a standing obligation the owner accepted in #10.

- Rows are **16:9**, like the lead. A 4:3 row box cropped ~25% of 16:9 art and decapitated title cards ("Costruire" → "ostruire").
- The lead cover is the LCP element and must not be `loading="lazy"` (Next was logging the warning). **Do not use `priority`** — it is deprecated as of Next 16. And do not reach for `preload` either: the official Next.js Image documentation is explicit that *"in most cases, you should use `loading="eager"` or `fetchPriority="high"` instead of `preload`"* ([Image component — `preload`](https://nextjs.org/docs/app/api-reference/components/image#preload)). `preload` injects a `<link>` in `<head>`, which is for images the parser has not reached; the lead cover is in the initial HTML of the route it lives on. **Use `loading="eager"` + `fetchPriority="high"`.** The other five stay lazy.
- `sizes` must be `(min-width: 640px) 160px, 100vw`. A bare `sizes="160px"` served a 160px file into a 325px slot at DPR 2 on every phone.
- The coverless fallback panel becomes a full-width empty box on a phone — drop it below `sm`.

**Subscribe module:** a `"use client"` leaf. Themed email field; the form's `action` **is** the Substack subscribe page over GET, so the browser builds `https://<pub>.substack.com/subscribe?email=<urlencoded>` itself — **verified working without JS**, with correct encoding of `+` and `@`. `email` is the only param name that prefills (`user_email`, `prefill_email`, `e` are no-ops).

- Real `<label>`, not a placeholder alone. `aria-invalid`, `aria-describedby`, `role="alert"` wired.
- Empty → "Enter an email address to continue." Invalid → "That doesn't look like an email address."
- Copy promises a **handoff**, never success.
- **The row stacks below `sm`.** `flex-wrap` cannot fire against `min-w-0 flex-1`: at 375 the field was **133px** and the placeholder truncated to "you@company.c" — the smallest control on the page was the one an errored user had to fix.
- ~30–40% text-expansion budget for IT copy. Measured at ~14% more characters and zero extra lines at 375, but that holds only because "Continua su Substack →" happens to match the English button width.
- Rejected mechanisms, for the record: the **iframe** funnels new subscribers into Substack's Recommendations — a doorway out of the hub, cutting directly against the destination. `POST /api/v1/free` is **Cloudflare-403-walled** as of 2026-07-25 (a bogus sibling path returns 404, so it is a deliberate rule, not general bot detection), independently corroborated by two upstream PRs that deleted their server-side subscribe code. It is dead on mechanics, not merely ToS-risky.

**Semantics:**

- **Fix the essay link semantics.** As built, each essay was a single 221–268-character link — ~1,500 characters of link text across six tab stops — with no list semantics, and rows were `h3` under the lead's `h2`, so heading navigation announced the other five essays as *sections of* the lead. Link the title, associate the rest, wrap rows in `ul`/`li`.
- Heading rank per [decision 5](#decisions-this-spec-makes).
- The lead excerpt caps with everything else — it set at **90 characters per line** (688px) while every other paragraph ran 63–74, because `max-width` computed to `none` on all nine paragraphs.
- Substack link budget per [decision 6](#decisions-this-spec-makes).
- One mono `RSS feed →` beside the agents-welcome line. The footer told agents where `/llms.txt` was and told a human engineer nothing — on an essay index whose audience lives in feed readers.
- Add the publication URL to `src/data/resume-data.tsx` (absent today).

**Effort: 3 days.**

## 2.6 Homepage swap

**Blocked on:** §2.3 (`/cv` must exist first) and the copy rewrite.

- Composition and shell per §2.2.
- Writing section: text-only lead-feature teaser, no numbers, no covers, no subscribe module — keeping #6's single CTA ("read the essays") uncontested. Links into `/writing`.
- **`homepageProof` becomes a real field** in `resume-data.tsx` — hand-written, technically-led proof per role, replacing the rendered `description[0]`. It currently lives in a throwaway prototype file and was measured as the strongest element in it.
- **Motion: one reveal, keyed to each section's own mount, plus decision 10's
  single named homepage exception.** No page-level `delay-*` on streamed
  sections. `cacheComponents` streams sections in via Suspense, so the #8
  "~90ms stagger across masthead → rail → hero → writing → work → projects"
  is **dropped**: the chunk lands ~700ms after navigation and all items mount
  in the *same* frame, so the stagger is not sequential arrival but a uniform
  delay tax on a section that already arrived late — and under reduced motion
  it holds five of six items blank. Space-holding fallbacks measured
  **CLS 0.0000**. Hover = underline/opacity only. Ambient Current is not
  scroll-triggered; scrolling changes only the semantic rail active state.

**Copy constraints** (the rewrite is the owner's; these bind it):

1. Identity label **"AI Product Engineer."** Replaces "Full-Stack AI Engineer."
2. Written for **founders & product leaders**. AI-engineer peers are served below the fold, not by the hero's first sentence.
3. **Writing sits in the hero, second position** — "builds X … and writes about Y." Shipping leads; writing is named in the same breath and is unmissable.
4. The building half is **outcome-led** ("turns frontier AI into shipped products"); domains (compliance, health, education) are supporting proof, not the headline. The writing half **enumerates the honest range** — tech, startups, and strategy. No single sharp theme is claimed yet.
5. About paragraph: **arc → belief.** Pharma → digital health → founded a GenAI startup → compliance AI, landing on the operating belief that technical depth must connect to what's worth building.
6. **Primary CTA: read the writing.** Contact stays reachable but secondary.
7. **The fold must name at least one concrete system.** Measured: the incumbent names 3 technical terms above the fold; both #12 arms named **0**. This is the audit's one binding constraint and composition was never the variable that decided it — copy is.
8. The hero clause that pushed it to five lines duplicates the WRITING section immediately beneath. Shorten rather than only lowering the clamp.
9. Copy stays centralized in `resume-data.tsx` and cheap to change. **The positioning is an experiment** — do not over-commit structure to any one framing.

**Effort: 2 days** after copy is in hand.

## 2.7 Lockstep metadata

These drift the moment the copy lands, and they drift silently. Do them in the same commit as §2.6.

- `RESUME_DATA.about` still says "Full-Stack AI Engineer" while the hero says "AI Product Engineer."
- `src/components/structured-data.tsx`: `hasOccupation.name` is the hardcoded string `"AI Engineer"`. `jobTitle` is *not* hardcoded — it reads `RESUME_DATA.work[0]?.title`, which is the employer's job title ("AI Engineer"), not the positioning label. Both need to say "AI Product Engineer" without overwriting the employer-accurate title in the work history, so the label needs its own field rather than being derived from `work[0]`. (The map recorded both as hardcoded; only the first is.)
- `llms.txt:7` calls the homepage "Full interactive resume and portfolio" — false once `/cv` exists.
- `llms.txt` / `llms-full.txt` structure adopts #7's key/value manifest shape (from Variant C — the *structure*, not the visual design).
- OG image and metadata title/description.
- `sitemap.ts`: `/cv` and `/writing`.
- A visible **agents-welcome** affordance pointing at `/llms.txt` — #7's chosen agent-native carry-over.
- Minimal `Blog` structured data on `/writing`.

**Effort: 4h.**

## Prototype teardown

Delete on merge of §2.6: `src/components/prototype/` (all of it) and the dev-only `src/app/writing/page.tsx` prototype. Keep `docs/prototypes/*/NOTES.md` and the screenshots — they are the evidence base for this spec.

---

# Phase 3 — Optional advanced

Unordered, none blocking. Each is a real idea that survived a ticket without earning a place in the critical path.

| Item | Why it might be worth it | Why not Phase 2 | Effort | Primary risk | Revisit when |
|---|---|---|---|---|---|
| **Substack custom domain** ($50 one-time) | Makes the `?email=` handoff read as the owner's own property, not a jump to substack.com | Pure polish on a working mechanism; #10 explicitly did not decide it | 1h + DNS propagation | Changing the domain later breaks the feed URL and every `?email=` link at once — do it before the archive grows or not at all | Before the 2nd or 3rd post, or never |
| **MDX-native essays** | First-party hosting, full control, no feed-window dependency | The publication does not exist yet; `/writing` is built RSS-now/MDX-ready-later by design | 3–5 days | Splits the corpus across two sources; needs a migration and a canonical story for essays that exist in both places | Substack becomes a constraint, not a convenience |
| **Bilingual EN/IT surface** | Stated part of the Italy focus (#6) | The feed carries no per-item language, so the only routes are a hand-maintained slug→language map or two publications — the latter is publication strategy, out of scope | 1 day (slug map) / unknown (two pubs) | A hand-maintained map silently rots; the wrong language chip is worse than none, which is why the inert chip was dropped | IT publishing actually starts |
| **A live artifact / working demo in the hero** | "Shows he can build" is the brief's weakest-served claim | Answered by default — textual proof works. `homepageProof` measured as the strongest element in the prototype, and once the fold names a system the claim is served above the fold. The only candidate, *L'Oracolo della Ghigliottina*, is a sidelined side project whose own `techStack` leads with "Side Project" | 1 week+ per artifact | A hero demo that is slow, broken or obviously a toy is worse than prose — and it becomes maintenance on the highest-traffic surface | An artifact worth promoting exists |
| **Essay outranks the positioning statement in type** | Ranked by size, the design says the *person* is the product and the writing is a section — the incumbent's IA in a nicer typeface | §2.6 ships the current hierarchy deliberately (see Open inputs); inverting it is a type-scale change, not a rebuild | 2h + a critique pass | Demoting the positioning statement undercuts #6's primary reader, who is judging the person first | The copy rewrite has landed and 4+ essays exist |
| **Excerpt leads at display size, no cover at all** | The largest object on `/writing` is art Substack generated — #13's sharpest provocation | Cheap experiment, but it contradicts the cover-art obligation #10 accepted; needs real covers to judge fairly | 4h | Removing covers makes the index denser and less scannable; the fix for bad covers may be better covers | Real cover art exists for 3+ posts |
| **Self-host / optimize the GitHub avatar** | Only perf candidate the audit found; posture is otherwise excellent | Marginal — one remote image | 1h | Avatar drifts from the GitHub profile it mirrors | Bundling a real photo shoot, or the remote host gets slow |
| **Richer `Article` structured data per essay** | SEO on the writing surface | §2.7 ships minimal `Blog`; per-essay `Article` needs real posts | 3h | Marking up excerpts as `Article` when the body lives on Substack invites duplicate-content ambiguity — canonical must point at Substack | 4+ posts, or Search Console shows the essays indexing badly |
| **`SYSTEMS` moved out of the colophon** | An AI engineer will `Cmd+F` "pgvector" before scrolling to 83% depth | Decided against — see [decision 4](#decisions-this-spec-makes) | 2h | Moving a 12px stack line up the page competes with `homepageProof` for the same job and may read as keyword stuffing | Analytics show peer/engineer traffic, or the fold's system name tests weak |

---

# Acceptance tests

Run against every phase that touches the surface in question. Every one of these corresponds to a defect actually found and measured on this map.

## Tooling

Nothing below is a manual eyeball check unless it says so.

| Check | How |
|---|---|
| Build / types / lint | `bun run build`, `npx tsc --noEmit`, `bun run lint` — all three clean |
| Contrast, computed styles, geometry, hit-testing | `/agent-browser` against `bun run dev` at 375 / 768 / 1024 / 1440, both modes. This is how every number in this spec was produced; reproduce the method, not just the threshold |
| Automated a11y sweep | axe-core via the browser tool, per route per mode. Zero violations at `serious` or `critical` |
| Design review | `/impeccable critique` on each new surface before it merges. It caught the WCAG failure and the violated brief constraint that four prior tickets missed |
| CLS | Chrome DevTools Performance trace, or `PerformanceObserver` on `layout-shift` in the browser tool |
| Print | Headless Chromium `printToPDF` at A4 and Letter, both modes |
| PDF text | `pdftotext -layout` on the built PDF, then assert on the extracted string |
| Feed states | Local fixtures, not the live feed — see below |

## Contrast

- No text fails WCAG AA at its rendered size, **in both modes**. Light-mode-only failures are the pattern here: `t.faint` survived four tickets because the only committed dark artifact was a screenshot. Every contrast assertion runs twice, once per mode, or it does not count.
- The primary control passes in both modes **with its mode-specific label colour** — the dark-mode inversion is the whole point (light **6.34:1**, dark **6.93:1**; paper-on-dark-accent would be **2.15:1** and is the failure this test exists to catch).
- Focus rings measure ≥3:1 against both the element and the page ground. Check the primary control specifically, where the ring sits on a filled ground.
- Cover hairlines measure ≥3:1 against the ground — they are functional boundaries, not decoration. Test with a near-white cover, which is Substack's default output and the case that breaks.

## Keyboard and reading order

- Tab through every route at 375 and 1440. **Assert the y-coordinate of the first focusable inside `<main>` is within the first viewport.** The defect this catches put the first five tab stops at y≈3184 on a phone, and the file's own comment claimed it was fixed.
- No `order-*` or `*-reverse` reordering of interactive content, anywhere. Grep for it as well as testing it.
- Heading outline of `/writing` does not nest rows under the lead. Extract the outline programmatically rather than reading the JSX.
- Skip link and `#main-content` work on all three routes.
- **No link's accessible name exceeds 80 characters** — a hard threshold, asserted on `accessibleName` for every link on the route. The defect was ~1,500 characters of link text across six tab stops, so the exact cutoff is not load-bearing; having *a* cutoff is.

## Reduced motion

- With `prefers-reduced-motion: reduce`: **query every animated element's computed `opacity` after two `requestAnimationFrame`s following its own mount, and assert exactly zero elements below 1.** Do not assert on wall-clock timing — the "30ms" figure from #13 is the measurement that found the bug, not a stable threshold to test against; the observable contract is "nothing is left invisible."
- Assert `animation-delay` computes to `0s` under reduced motion on any element carrying a delay class.
- **CLS ≤ 0.01** on streamed arrival at n=1 and n=6 (measured 0.0000, but an exact-zero assertion is brittle across engines and font-loading timing).

## Ambient Current named exception

- Run the homepage at 1024 and 1440 in both modes. Pixel-sample the canvas:
  zero non-transparent pixels in rail content, navigation, metadata, controls,
  the reading measure, and outside the explicitly declared rail-edge lane.
  Repeat with text-node client rectangles and require zero intersections.
- At 375 and 768, assert no continuous canvas loop, document width equals
  viewport width, and the single reading measure is unchanged.
- Assert the canvas is absent from the accessibility tree and sequential focus,
  `pointer-events` computes to `none`, and hit-testing returns the underlying
  page element at sampled contour coordinates.
- Under reduced motion, record frame count across 1.2 seconds and require a
  delta of zero. Test initial hydration, not only a preference change after
  mount.
- Block client scripts and force canvas initialization failure independently.
  For each, compare main, hero, rail/navigation, scroll height, and document
  width against the motion state; require equal geometry and **CLS ≤ 0.01**.
- Background the tab for at least one second and require frame count to hold.
  Exercise a real offscreen transition of the owning surface and require frame
  count to hold. Hiding a fixed canvas manually is not evidence for the second
  assertion.
- At requested DPR 2, assert effective DPR ≤1.5 and frame cap ≤24. During a
  representative scroll trace, require Canvas draw **p95 ≤1 ms/frame**, zero
  attributable long tasks, and no observable scroll degradation.
- If any containment or performance gate cannot be met without adding
  complexity, remove the continuous loop and revert the homepage to the
  default one-reveal contract. Do not add WebGL/Radiant to rescue it.
- Perform one attended 60–90 second reading pass in light and dark. The field
  should be noticed before reading and then forgotten. If it repeatedly pulls
  focus, remove the continuous loop; do not increase complexity to rescue it.
- `/cv` screen: zero running frames and zero drawn pixels outside the extreme
  outer margin. A4 and Letter, light and dark: no ambient pixels or screen
  chrome in print/PDF.

## Touch targets

- Every link and control is **≥24×24 CSS px** at 375 (SC 2.5.8 is a two-dimensional minimum; the map's "purely height" note was an observation about *this* codebase's failures, not a narrower rule). Icon controls ≥44×44.
- No fixed chrome overlaps or clips content at any width from 375 to 1440. **Hit-test both corners:** `document.elementFromPoint` on the top-right masthead cluster and on the bottom-right FAB cluster. The measured failures were 63px² top-right and up to 640px² bottom-right.

## Print / PDF

- `Cmd+P` at A4 **and** Letter, in light **and** dark mode, on `/` **and** `/cv` — eight combinations. No role block splits, no orphaned company headers, no bullet cut mid-line, nothing under 9pt.
- **Automated assertions**, with values:
  - **Page count ≤ 2** at A4 and ≤ 2 at Letter. The incumbent measures 3; two is the target for a 6-role CV at document density, and a 3rd page is a failure, not a variance.
  - **Minimum fill on the last page ≥ 33%** of the text block height at both sizes. The incumbent's page 3 was **75% empty** and passed every eyeball review it ever had — this is the assertion that would have caught it. Fill is measured as the y-extent of rendered content over the printable height.
  - Zero role blocks split across a page boundary, and zero company headers orphaned as the last line of a page.
- **Manual, once per size:** a visual read of the rendered PDF for typographic damage that geometry checks cannot see (broken ligatures, mono tracking collapse, italic substitution).
- `public/lorenzo-germini-cv.pdf` builds from `RESUME_DATA`, opens with the right filename, and **`pdftotext -layout` output is a single readable column** with role/company/date adjacency intact (ATS).

## Substack — fixture-driven

Fixtures, not the live feed: the live feed is one publication with a sliding window, and half these states cannot be produced on demand.

- **Count boundaries, all six:** n=0 (section absent entirely), n=1 (lead + launch line, no archive link), n=2 and n=3 (lead + compact rows, no full index), n=4 (full index and archive link appear — the transition), n=6. Testing only n=1 and n=6 misses both transitions.
- **No numbering at any count.** The specific regression: the same essay must render identically at n=4 and n=6. That is the exact renumbering #10's dropped decision existed to prevent.
- **Miss states:** unreachable, empty, and malformed feed each build successfully and render the surface as absent — and each **recovers within the `feedMiss` lifetime**, verified by swapping the fixture and re-requesting. A miss must not inherit a success cache lifetime.
- **Short-body fixture** (`content:encoded` under 250 words, and absent entirely): reading time omitted, **date renders alone, no `Paid` label and no placeholder**.
- `?email=` handoff works **with JavaScript disabled**, with `+` and `@` correctly encoded.
- Manual `revalidateTag('substack-feed')` invalidation works and is secret-guarded.
- **No `Referrer-Policy` header is set** — assert on response headers, since this is a silent-failure item.
- At most **two** Substack links per route.

## Tokens

- No palette literals outside `globals.css`'s `@theme` / `.dark` / print-override blocks. Search **all of `src/`** — `.tsx`, `.ts`, `.css` — for every colour syntax, not just hex:

  ```
  rg -n --glob 'src/**/*.{ts,tsx,css}' \
     -e '#[0-9a-fA-F]{3,8}\b' -e '\b(rgb|rgba|hsl|hsla|oklch|color-mix)\('
  ```

  Hex-in-`.tsx` alone would have missed the `color-mix(in srgb, var(--color-primary) …)` pair already in `globals.css`'s `.card-hover`, and misses any token helper that lands in a `.ts` file — which is exactly where the prototype kept them (`warm-print.ts`).
- Note that `/impeccable`'s detector has **no hardcoded-colour rule in JSX regex mode** — #12 confirmed a clean run on a file with ~20 palette literals. A clean detector result is not evidence here; run the search above.
- Pick any element with a `border-<color>` utility: computed `border-color` matches the utility, not `--color-border`. Run this on all three routes — the defect was site-wide, 41 of 41 elements on the current homepage.

## Content

Two distinct tests, often confused:

- **Technical-term count above the fold: ≥3** at 375 and 1440. This is *parity with the incumbent*, which names 3 — a floor, not a target. Both #12 arms scored 0.
- **At least one named concrete system** above the fold. A system name typically contributes 2–3 terms, so this is a stronger constraint than the count and does not replace it. Both must pass.
- **Retained-proof manifest.** "Every technical noun survives the split" has no reproducible oracle in prose, so it is a **machine-readable fixture**: [`docs/spec/retained-proof.json`](./retained-proof.json) (56 entries, explained in [`retained-proof.md`](./retained-proof.md)). Each entry declares either `acceptedAnyOf` (aliases — pass on any one) or `requiredAllOf` (a term *and* its figure — pass only on all), so nothing is left for a test to infer. Assert every entry against the concatenated visible text of `/` and `/cv`; filter `additive: true` entries when running against the current site. Written as prose, this constraint was violated by a decision that passed review.

# Risk register

`Source` distinguishes risks **measured** on this map from ones **projected** by it. Only the first kind has evidence behind its likelihood.

| Risk | Source | Likelihood | Mitigation |
|---|---|---|---|
| `cacheComponents` breaks prerendering on a route nobody audited | Projected — #10 accepted that the flag changes prerender semantics for every route, untested | Medium | §2.4 before `/writing`; the site-wide audit is the deliverable, not a side effect. Widest effort band in the spec |
| An empty feed is cached across launch | **Documented/derived** — follows directly from the pinned Next 16 `days` profile (`revalidate: 1 day`) combined with failure-as-absence. Read from the docs, not observed live | Medium, if the policy is skipped | The three-part cache policy in §2.5. The `feedMiss` profile is the actual fix; the `hours` profile alone still caches a miss for an hour |
| The site reads *less* technical after the swap | **Measured** — the incumbent names 3 terms above the fold, both #12 arms named 0; #9's locked decision 5 would have cut 18 proof statements to 4 | Medium | The binding constraint. Three acceptance tests exist for it, including the retained-proof manifest. #9's amendment history shows how easily a reasonable-looking decision violates it |
| The `@theme` migration regresses shadcn/ui components | Projected — the prototypes never rendered a shadcn component under Warm Print | Medium | Both-modes sweep of every existing component is part of §2.1's effort, not a follow-up. Note that no border has ever rendered correctly, so "it looks fine today" is not a baseline |
| The copy rewrite never lands and blocks §2.6 | Projected — it is fog on the map, never ticketed | Medium | §2.1–2.5 are all copy-independent. `/cv` alone is a shippable increment |
| PDF build step is fragile in CI (headless Chromium) | Projected — the build step does not exist yet | Medium | Fail the build loudly rather than shipping a stale PDF; `Cmd+P` on `/cv` is the designed fallback and is specified to work on its own |
| ATS mangles the generated PDF | **Measured risk factors** — subsetted variable Fraunces + `tracking-[0.12em]` uppercase mono + two-column grid is a known mangling combination | Medium | Single-column collapse is specified, and `pdftotext` extraction is an acceptance test rather than an assumption |
| Ambient Current distracts or misses containment/performance gates | Projected for production — the disposable prototype passed measured cost and clipping ceilings, but natural offscreen lifecycle and attended reading remain unresolved | Low | Treat the gates as binary: simplify or go quieter within the signed Canvas 2D contract; if they still fail, remove the continuous loop and ship the default one-reveal contract. Do not add WebGL/Radiant |
| The rail is built without scroll-spy and reads as dead space | **Measured** — the 220px column is 44% filled in every frame at 1280 | Low | Stated as a condition of the composition, not a polish item. Orientation is its entire justification |
| Fixed chrome collides on a surface nobody re-tested | **Measured twice** — 63px² on `/writing` at 375, up to 640px² on the homepage; the same conventions reproduced the defect on a second route | Low, given the reserved gutters | Decision 2's two gutters, plus a corner hit-test in the acceptance suite that runs per route |
| Substack changes `?email=` or walls the feed | **Measured precedent** — `POST /api/v1/free` was Cloudflare-walled between #5 and #10, six weeks apart | Low | Handoff degrades to a plain subscribe link; the fetch is failure-tolerant by design |
| The positioning turns out to be wrong | Accepted by the owner | Accepted | It is an experiment. Copy stays centralized and cheap to change; no structure commits to one framing |
