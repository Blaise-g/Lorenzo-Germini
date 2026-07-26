# Visual direction — issue #8

**Question:** what typography, palette, density, texture and motion should the chosen Variant B ("Editorial") homepage adopt?

**Chosen (2026-07-25): B1 — "Warm Print."**

Three treatments were built as real code on the winning layout (same masthead, sticky rail, numbered essay index, prose timeline) and switched via `?variant=b1|b2|b3`. Screenshots in this directory (light full-page for all three, dark viewport for b1/b3).

| | B1 Warm Print | B2 Slate Editorial | B3 Broadsheet |
|---|---|---|---|
| Reads technical | yes — mono metadata carries it | weakest | strongest |
| Reads editorial | strongest balance | restrained | loud |
| Founders / product leaders | yes | yes | risk of shouty |
| Palette cost | full light+dark pass | **none** (reuses theme tokens) | full pass |
| Distinctiveness | high | medium | highest |

B2 was the cheap option (no palette work at all, print CSS and shadcn/ui untouched) but read as a polished template rather than a point of view. B3 was the most memorable and the most likely to alienate the brief's primary reader. B1 buys real character for the cost of one palette migration.

## Constraints for the spec

These are the decisions, not final pixel values. Exact values live in `src/components/prototype/variant-b.tsx` (`TREATMENTS.warm`) as the reference implementation.

**Typography**
- Display: **Fraunces** (variable, `opsz` axis, normal + italic) for the wordmark, hero, essay titles, role titles, project titles. Italic is the emphasis device — used in the hero and on project hover.
- Body: **Inter** stays, unchanged.
- Metadata: **JetBrains Mono**, ~11px, uppercase, wide tracking (~0.12em) for nav, section headings, dates, tags, tech stack, the EN·IT label and the agents-welcome line. This is the treatment's main technical signal — mono metadata against serif display is what keeps an editorial layout from reading as a personal-blog template.
- Both fonts already load via `next/font/google`; Fraunces is the one addition.

**Palette** — warm paper, not the current slate-indigo. A single accent, used sparingly.
- Light: paper background, near-black warm ink, terracotta accent.
- Dark: warm near-black background (not slate/zinc), warm off-white ink, a lightened terracotta so the accent keeps AA contrast on dark. The dark pass is a first-class requirement, not a follow-up — the palette is warm in both modes.
- Accent is reserved for: hero emphasis italic, essay numbers, section headings, CTA, links. Never for large fills.
- **Open constraint:** the warm palette should *replace* the slate-indigo `@theme` tokens in `globals.css` rather than sit alongside them as one-off literals — otherwise shadcn/ui components and the rest of the site drift from the homepage. The prototype uses literals; the real implementation must migrate the tokens. Fold this into the phased spec (#11).

**Density** — generous, editorial. Large section gaps (~5rem), roomy essay rows, one-bullet-per-role work timeline, `max-w-6xl` page with a 240px rail. Hairline-to-2px rules; dividers at low opacity. Not dense — density was B3's move and was rejected.

**Texture** — a single faint full-page grain overlay (SVG fractal noise, ~3.5% light / ~6% dark, multiply/screen), fixed, pointer-events-none. It is the only texture; no gradients, no shadows, no cards. Must be `print:hidden` and should respect no-preference for reduced-data if trivial.

**Motion** — one orchestrated page-load reveal: `fade-in-up` (already in `@theme`) staggered ~90ms across masthead → rail → hero → writing → work → projects. Hover states are underline/opacity only. No scroll-triggered animation, no micro-interactions elsewhere. Must honour `prefers-reduced-motion`.

## Carried-forward risks

Reviewed by `/impeccable critique` during #9 (2026-07-25). Status of each risk below; snapshot in `.impeccable/critique/`.

- **Mobile serif sizing** — confirmed, and worse than recorded. The hero switches to `md:text-6xl` at the *same* breakpoint that turns on the 240px rail, leaving a 384px main column at 768px — 9–10 lines for a 22-word sentence. Below `md` the rail stacks first, pushing the `<h1>` below the fold. Now owned by #12; fix is `clamp(2rem, 5.2vw, 3.75rem)` and moving the rail to `lg:`.
- **Print CV** — resolved by #9: a dedicated `/cv` route plus a build-generated PDF, with print CSS split into a global baseline and a `/cv`-scoped block.
- **Grain overlay `z-50`** — **dismissed.** Radix portals append to `body` after the overlay, so equal `z-index` resolves in the dialog's favour by DOM order, and the skip link is `focus:z-[100]`. The real cost is compositing: `fixed inset-0` + `mix-blend-multiply` forms a blend group against the root and forces full-viewport rasterization every scroll frame. Also still missing the `print:hidden` this document requires. Move the noise to a `body` `background-image` with `background-blend-mode`, or cut it.
- **Accent contrast** — **dismissed.** `#9c3c1c` on `#faf6ef` measures **6.16:1**; `#d98d63` on `#171412` measures **6.93:1**. Both comfortably AA; the dark accent was chosen well.
- **`t.faint` contrast — new, and the real failure.** `opacity-55` over `#1c1917` on `#faf6ef` composites to ~`rgb(128,124,120)` = **3.84:1**, below AA at 11px. It carries every element this document nominates as the technical signal: essay dates, tags, work dates, tech stacks, the `EN · IT` label and the agents-welcome line. It fails **light mode only** (dark is 5.21:1), which is why the committed dark screenshot hid it. Must become an explicit token (light ~`#5c554e`), not an opacity — and be re-verified with the grain composited, since `multiply` shaves a further 1–2%.
- **Reduced motion — new.** `globals.css:228` never resets `animation-delay`, and `fade-in-up` uses `both` fill mode, so pre-animation state is `opacity: 0`: a reduced-motion user gets 450ms of blank projects section. The stagger survives the media query entirely. Add `animation-delay: 0s !important; animation-fill-mode: none !important;`.
- **Composition was never the variable — new.** All three treatments held the masthead, 240px sticky rail, numbered index, prose timeline and project grid constant, differing only in hue and stroke weight. The rail, the responsive break and the section-heading hierarchy are therefore unexamined; #12 re-prototypes them before the spec.
