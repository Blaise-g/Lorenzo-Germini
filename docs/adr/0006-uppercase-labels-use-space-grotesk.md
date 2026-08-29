# Uppercase labels use Space Grotesk, not the mono

Decided directly, without an issue — the request was "swap these h2 fonts for something more
elegant and in tune with the rest of the design," and the scope question it opened was answered in
the same session.

The redesign spec locked JetBrains Mono for every metadata and label role (§2.1, and decision 3 in
[the decisions section](../spec/redesign-implementation-spec.md#decisions-this-spec-makes)). At
`text-xs`/`15px` with `tracking-[0.12em]`–`tracking-[0.18em]`, that face was doing two jobs badly.
Its round bowls read soft against Fraunces' sharp serifs, and a monospace advance under wide
tracking sets loose: the fixed advance already pads the narrow letters, so the tracking lands on
top of padding rather than on the letterforms.

Uppercase label roles now resolve `--font-label`, which is Space Grotesk — a neo-grotesque with
squarer counters and a proportional advance. That is one token and one utility (`font-label`)
covering section headings, both navs, the anchor row, the sticky rail, the eyebrows and the button
labels. **JetBrains Mono is unchanged everywhere its advance is load-bearing**: the date columns
that carry `tabular-nums`, the technical strings (`/llms.txt`, `/sitemap.xml`, tech stacks,
badges), the CV contact block and the footer colophon.

The face was chosen by rendering the candidates in a browser at the shipped colour and tracking,
not from description. Palantir's site — the reference the request named — ships Alliance No.1/No.2
(Degarism), which is commercially licensed and not on Google Fonts, so the audition was among free
neo-grotesques and squarer monos.

## Considered options

**Keeping the mono and only changing the section headings** was the smallest possible diff and is
wrong. It leaves two label voices in the same composition: on `/cv` the nav row and the `PROFILE`
heading below it are the same word in two faces, stacked. The label system is one role, so it
takes one face.

**Moving the date stamps too** was rejected on the axis that actually matters. `tabular-nums` needs
a fixed advance to hold a column; the discriminator is "has `tabular-nums`", not "is a date". This
is why `/writing`'s `4 AUG 2026 · 5 MIN READ` — a date with nothing to align against — is a label
and moves, while the Work section's `Jan 2024 – Present` stays mono one section above it. The two
faces on one page are deliberate and mark that boundary.

**Archivo and IBM Plex Mono** were the runners-up. Archivo is cleaner but more anonymous; IBM Plex
Mono barely moved off JetBrains Mono at label sizes, since it keeps the monospace advance that was
half the problem. Fraunces was rejected outright — it is the display face, and using it for labels
collapses the display/label contrast that the serif was introduced to create.

**Self-hosting a subset** would save ~11 KB on a 22 KB variable file, and was declined for now:
unlike the OpenGraph subsets, nothing would guard it, so new label copy would silently fall to the
fallback face rather than failing a test.

## Consequences

**A fourth family loads on every route**, +22.3 KB against ~238 KB of already-preloaded font. The
variable file is the cheap form here — three static weights (400/500/600 are all in use) would cost
~40 KB. JetBrains Mono keeps its 40 KB: 19 call sites survive, several above the fold.

**The label role is pinned by a test.** `tests/warm-print-design-system.spec.ts`'s locked-families
test asserted four families and not the label role, which is why the swap passed green. It now
asserts Space Grotesk on a section heading alongside JetBrains Mono on the date column beside it,
so the boundary above cannot collapse back into a single family unnoticed.

**Label width is now a layout input.** Space Grotesk sets narrower than the mono, so a flex row
that wrapped on label width alone may stop wrapping. It did, once: the homepage's two Writing CTAs
began sharing a row at 375, where the primary CTA's `pb-0.5` drops its box 1px under
`items-baseline` and inverts visual order against DOM order, tripping the mobile-flow contract in
`tests/responsive-hub-shell.spec.ts`. That pair is now `flex-col` below `sm` and a row from `sm`,
so the stack is stated rather than inherited from label width. The hit areas were measured and do
**not** conflict side by side — `.touch-target` is `width: 100%` under `translate: -50%`, so it
never grows past its box horizontally.

**The CV's print tracking had to come down, and this is the one place the face change was not
free.** §2.3 named "subsetted variable Fraunces + `tracking-[0.12em]` uppercase mono + two-column
grid" as the _measured_ ATS mangling combination. Changing one term broke it: regenerated at
`tracking-[0.18em]`, `pdftotext -layout` extracted two of the five section headings as
`P R O J E CTS` and `E D U CAT I O N`. Space Grotesk sets narrower than the mono, so the same
tracking leaves a wider gap relative to glyph width and crosses pdftotext's word-break threshold —
and it does so per letter pair, which is why `PROFILE`, `EXPERIENCE` and `SKILLS` survived and the
failure looked arbitrary. `print:tracking-[0.08em]` on the CV headings fixes it, and the
`CURRICULUM VITAE` eyebrow takes the same print value so the two do not disagree on paper — it
extracted cleanly at `0.16em`, but tightening can only reduce extraction risk. Screen tracking is
unchanged in both cases. The check is an acceptance test (`tests/cv-route.spec.ts`), not an inspection, so it
caught this on the regenerated PDF rather than in someone's inbox.

**The OpenGraph cards diverge.** `src/components/og-rule-card.tsx` still draws its eyebrows in
`OG_FONT.mono`, so the baked PNGs show label roles in JetBrains Mono while the pages show Space
Grotesk. Closing that means a fifth `OgFace`, a `vendor/og-fonts` entry and a
`bun run generate:og-fonts` run. Left open deliberately.
