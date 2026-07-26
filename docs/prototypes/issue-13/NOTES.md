# Issue #13 — the `/writing` index and subscribe module as pixels

Prototype of the surface #10 decided in prose. Everything below is measured in a
real browser (agent-browser, Chrome, DPR 2) against the settled Warm Print
tokens — no estimates.

## What was built

| file | what |
|---|---|
| `src/app/writing/page.tsx` | dev-only route; `notFound()` in production |
| `src/components/prototype/writing-index.tsx` | the index: count-aware list, thumbnails, metadata row, footer |
| `src/components/prototype/subscribe-module.tsx` | the subscribe module, client leaf |
| `src/components/prototype/writing-feed.ts` | a fake feed in the shape `src/lib/substack.ts` will return |
| `src/components/prototype/warm-print.ts` | Warm Print tokens copied from `variant-d.tsx`, plus the border shim |
| `public/prototype/covers/*.png` | five placeholder covers spanning the tonal range |

Parameters, so each open question can be seen both ways in one file:
`?n=1|3|6` · `?grain=on|off` · `?reveal=mount|stagger` · `?stream=on|off` · `?it=on`

Screenshots in this directory: `n1/n3/n6-light-1440`, `n6-dark-1440`,
`n6-light-375/768/1024`, `n1-light-375`, `n1-light-1440-it`,
`subscribe-error-1440`.

## The three questions

### 1. Thumbnails vs the grain overlay — **the grain is a non-event; the covers have a different problem**

Measured by toggling the overlay in-page (same load, no layout change) and
diffing screenshot crops:

| region | at spec opacity (0.035 light / 0.06 dark) | at 4× (0.12) |
|---|---|---|
| lead cover, light | mean \|Δ\| **0.36/255**, max 2 | 1.15, max 7 |
| lead cover, dark | mean \|Δ\| **2.61/255**, max 6 | 5.18, max 11 |
| paper ground, light | 0.62, max 2 | 1.99, max 7 |
| added texture on flat paper (σ) | **0.00 → 0.49** | 0.00 → 0.79 |

So: not mud — but not texture either. The overlay shifts covers by ≤2/255 in
light and ≤6/255 in dark, and it shifts the paper ground by the *same* amount,
so it does not treat images differently at all. At 4× strength it is still
under 1.5/255 on the covers. It is paying a full-viewport `mix-blend-multiply`
composite per scroll frame (already logged as a perf item) for an effect that
is not visible on any surface. **Decide: raise it until it is visible and
re-test over covers, or drop it.**

The real thumbnail risk is **cover-vs-ground luminance**, which #10 did not
consider:

| cover | light mode vs paper | dark mode vs near-black |
|---|---|---|
| near-white diagram | **1.04:1** (no edge at all) | **17.43:1** — brightest object on the page |
| light title card (Substack's auto-generated default) | 1.07:1 | 15.68:1 |
| dark photographic | 4.53:1 | 1.06:1 (no edge) |

Text on this page runs 6.6–13:1, so a white cover in dark mode out-shouts every
word on it. And in light mode a light cover has no boundary — visible in
`n3-light-1440.png`, where the Italian title card reads as loose text floating
on the paper with a stray rule above it. **Every cover needs a hairline border
in both modes, and dark mode needs the light ones knocked back.** Substack
auto-generates white title cards, so this is the default case, not the edge one.

Also: 16:9 cover art in the row's 4:3 box crops ~25% of the width, which
decapitates title-card covers ("ostruire con gli LLM" in `n6-light-375.png`).
Row thumbs should be 16:9 like the lead, or `object-contain` on a paper panel.

### 2. The streamed reveal — **confirmed defect, and the fix is measured**

Chunk lands ~700 ms after navigation (simulated Suspense boundary). All six
articles mount in the *same* frame, so a "stagger" is not sequential arrival —
it is a uniform delay tax on a section that already arrived late.

Under `prefers-reduced-motion: reduce`, `animation-duration` collapses to
`1e-05s` but `animation-delay` is **not** reset and `fade-in-up` fills `both`:

| arm | opacity after its own mount |
|---|---|
| `reveal=stagger` (today's pattern) | item 1 visible at 30 ms; item 6 **holds opacity 0 for 452–600 ms** — blank until ~1.3 s after navigation |
| `reveal=mount` (no delay classes) | **every** item at opacity 1 within 30 ms |

Under normal motion the stagger costs the last row another 452 ms after the
chunk arrives (visible ~1.17 s), for a sequence the user cannot perceive as
sequential anyway.

`ListFallback` holds the space: **cumulative layout shift 0.0000** at n=1 and
n=6 on streamed arrival.

**Spec:** reveals key off their own mount, no page-level `delay-*` classes on
streamed sections, and the reduced-motion block must reset `animation-delay`
(the class is used elsewhere on the site).

### 3. n=1 — reads as deliberate, but the page says nothing about being new

`n1-light-1440.png` / `n1-light-375.png`. It does not read as a broken or empty
section: cover, date, reading time, title, excerpt, CTA, then the subscribe
module and footer. What it does read as is *a page with one thing on it* — the
standfirst promises "essays", plural, and delivers one, and nothing on the page
frames that as a launch. Two cheap answers, for the owner to pick:
a launch line in the standfirst ("The first essay went out 21 July; new ones
roughly fortnightly"), or no `/writing` route at all until n≥2, with the
homepage teaser linking straight to the post.

## Everything else measured

**Contrast — #10's constraint 1 holds.** No text on the page fails AA in either
mode. Lowest is the 11px mono metadata row at **6.34:1 light / 6.63:1 dark**,
using the explicit `faint` token instead of `opacity-55` (3.84:1). Error text
`#a32f13` at 12px.

**The `?email=` handoff works.** A valid submit produces
`https://lorenzogermini.substack.com/subscribe?email=lorenzo%2Btest%40example.com`
— the browser URL-encodes `+` and `@` itself, because the form's `action` *is*
the subscribe page (GET). It therefore also works with JS disabled. Empty
submit → "Enter an email address to continue." with `aria-invalid`,
`aria-describedby` and `role="alert"` wired; invalid → "That doesn't look like
an email address."

**IT copy fits.** At 375 the Italian strings add ~14% characters on the
standfirst and cost **no extra lines** anywhere (heading 1 line, standfirst 3,
hint 2 in both languages). The button happens to be identical in width because
"Continua su Substack →" is the same length as the English; a longer Italian
label would break it, because of the next item.

**Defect — the subscribe row does not wrap at 375.** `flex-wrap` never
triggers, because `flex-1 min-w-0` lets the input shrink instead: at 375 the
email field is **132.5px** wide next to a 182.5px button (visible in
`n1-light-375.png`). It must stack below `sm`.

**SC 2.5.8 (24×24) — 11 links under 24px at every width**, the same class of
defect #12 found on the homepage, reproduced by the same conventions: the
masthead nav row at 16.5px tall (`Home`, `Writing`, `CV`), the whole 14px
footer cluster including **`X` at 7.9×14px**, "Read all essays on Substack" at
19px. Submit button 34.5px, input 42px (pass 24, fail the 44px AAA target).

## Two findings that are not about this surface

### `globals.css`'s unlayered `*` rules beat every Tailwind border and outline utility

`globals.css` declares `* { border-color: var(--color-border) }` outside any
cascade layer; Tailwind v4 puts `border-*` utilities inside `@layer utilities`.
Unlayered wins on layer order regardless of specificity. Measured:

- On this route before the shim, **every** bordered element computed to
  `rgb(232,230,227)` (`--color-border`) — masthead, hairlines, the terracotta
  CTA underline, the error-state input border.
- On **#12's chosen composition** (`/?variant=b1a`, dark), the hero CTA's
  `border-[#d98d63]` computes to `rgb(37,37,45)` — the slate `--color-border`,
  a cool grey on a warm near-black page.
- On the **current production homepage**, all 41 bordered elements compute to
  `rgb(232,230,227)`. Not one gets a per-element border colour.

So #8's "single terracotta accent" underline and every Warm Print rule have
never rendered in any prototype or on the live site. The prototype restores them
via an explicitly-marked `data-rule` shim (`BORDER_SHIM` in `warm-print.ts`);
the spec fix is to delete the global rule as part of the `@theme` migration.

The same mechanism governs focus: `*:focus-visible { outline: none; box-shadow:
… }` is also unlayered, so a component's own `focus-visible:outline-*` utilities
are dead. Reached by keyboard, the submit button and the input both take the
global ring — `#fbfaf9` 2px inner + `#4941aa` indigo 4px outer, i.e. #12's
off-palette ring with the 1.03:1 invisible inner halo. A new component cannot
style its own focus ring until those rules are layered or deleted.

### Small things worth one line in the spec

- The coverless fallback panel is fine on desktop (160px) but becomes a
  ~281px-tall empty box on a phone, where it is the largest element in its row.
  Consider dropping the panel entirely below `sm` and letting the row be text.
- At n=6 the phone page is **4,411 CSS px** tall, and the subscribe module sits
  under all of it. That is #10's intended "highest intent" placement, but worth
  a conscious accept.
- Reading time is omitted, not guessed, for the previewed (paid) post — visible
  on `02 19 MAY 2026` in `n6-light-1440.png`.

---

## Decisions taken on this evidence (2026-07-25)

The owner decided four things on the rendered surface. All four are now in the
prototype; `final-*.png` are the after screenshots.

1. **n=1 gets a launch line.** One mono line under the standfirst — "First
   essay published 21 Jul 2026 · new ones roughly fortnightly" — rendered only
   at n=1. `/writing` ships from day one.
2. **The grain overlay is dropped.** It measured ≤2/255 (light) and ≤6/255
   (dark) on every surface while paying a full-viewport `mix-blend-multiply`
   composite per scroll frame. This **amends #8**, which specified "one faint
   grain overlay" as part of Warm Print, and it closes the grain perf item on
   the map's improvement list. `?grain=on` still renders it so the decision can
   be re-tested cheaply.
3. **A feed link ships.** One mono `RSS feed →` in the footer beside the
   agents-welcome line. The footer told agents where the machine-readable index
   was and told a human engineer — the most technical slice of the audience —
   nothing.
4. **Numbering is dropped.** This **amends #10 decision 4** and the numbered
   lead feature from #7. Verified: numbers derived from the fetched feed window,
   not the archive, so the same essay renders **04 at four items and 06 at six**
   — precisely the renumbering the decision existed to prevent, and it will
   happen in production the moment Substack's feed window slides past the
   archive. The critique also measured that no reader can decode the scheme.
   Date + reading time carry the metadata row alone. **The homepage teaser loses
   its numbers too.**

Three measured defects were fixed in the same pass, because the spec would
otherwise have been written from them:

- **Row thumbs are 16:9, not 4:3**, and every cover carries a hairline in both
  modes with light covers knocked back in dark (`dark:brightness-[0.82]`).
- **`sizes` fixed**: rows were `sizes="160px"` while rendering full-width below
  `sm` — a 325px/DPR-2 slot served a 160px file on every phone. Now
  `(min-width: 640px) 160px, 100vw`; re-measured, natural width 375 for a 325px
  slot. The lead cover is the LCP element and now carries `priority` (Next was
  logging the warning; the other five stay lazy).
- **The subscribe row stacks below `sm`.** `flex-wrap` could never fire against
  `min-w-0 flex-1`; the field was 133px at 375. Now full-width and stacked
  (re-measured: input 327px, `stacked: true`).

## `/impeccable critique` — 22/36, "Acceptable" (heuristic 10 n/a)

Two isolated parallel sub-agents (design review; detector + browser evidence),
synthesized in the parent, not degraded. Snapshot:
`.impeccable/critique/2026-07-25T15-36-04Z__src-components-prototype-writing-index-tsx.md`

Verdict: **specific skin, generic bones** — the Warm Print tokens are authored,
the composition (hero card → hairline rows with left thumbs → email capture →
two-column footer) is the default Ghost/Substack/Medium index. Strengths: the
handoff mechanism and its copy, the count-aware list (CLS 0.0000), metadata
restraint with nothing failing AA.

Findings that became spec constraints rather than prototype edits:

- **No primary action.** Every CTA on the page is the same 11px mono terracotta
  underline — "Read the essay", the submit, the archive link, "Subscribe to the
  essays", "CV →". 11 discrete choices in the last ~600px, 10 sharing one
  treatment, three pointing at Substack. The submit needs one treatment nothing
  else uses, and the archive link belongs **below** the module (as built, the
  natural end-of-list gesture leaves the site before the conversion point).
- **`h1` "Writing" and the lead title are both 36px** in the same colour,
  differing only in weight.
- **Each essay is one 221–268-character link**, six of them, with no list
  semantics; rows are `h3` under the lead's `h2`, so heading navigation implies
  they are sections *of* the lead essay.
- **The theme toggle overlaps the CV nav link at 375.** CV's box is
  15.8×16.5 at (335, 48); the fixed 36×36 toggle spans (323, 16); 63px² of
  overlap, and the top pixel row of CV hit-tests as "Toggle theme".
- The lead excerpt sets at 688px / **90 characters per line** while every other
  paragraph is 63–74; `max-width` computes to `none` on all nine paragraphs.
- Row hairlines measure **1.19:1** against paper — the only structural device
  between essays.
- The page does not change after a successful handoff, and a refresh loses the
  typed address. There is no success state and by design there cannot be one;
  the emotional hole at the end of the journey is real and unresolved.
- Static detector: **exit 0, zero findings** on both files (validated). In-page
  detector, identical on three views: `line-length` on the lead excerpt,
  `overused-font` on Inter + Fraunces (deliberate; a design-intent verdict).

## `/impeccable audit` — 11/20, "Acceptable (significant work needed)"

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 2 | Reduced motion blanks 5 of 6 essays; 11 links under 24px (SC 2.5.8); misleading heading nesting; 250-char link names |
| 2 | Performance | 2 | Row thumbs served at ¼ resolution (fixed); lead LCP lazy (fixed); grain composite (dropped) |
| 3 | Theming | 2 | Unlayered `*` rules kill every border and outline utility site-wide; `--color-ring` off-palette; palette still literals pending the `@theme` migration |
| 4 | Responsive | 2 | Subscribe row could not wrap (fixed); targets under 24px; nothing in the layout changes above 736px; 51% of a 1440 viewport used |
| 5 | Implementation integrity | 3 | Static scan clean, intent commented; the numbering promise did not hold |

Passing outright: no horizontal overflow at 375–1440, **no overflow at 200% root
font size**, AA contrast in both modes, CLS 0.0000, form semantics, skip link,
`aria-current`, JS-off form, `?email=` encoding.
