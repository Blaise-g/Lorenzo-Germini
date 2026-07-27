# Design System

<!-- impeccable:design-schema 1 -->

## Direction

**Warm Print** is an editorial, technically literate system for Lorenzo
Germini's professional home. It should feel like a carefully designed
publication with the precision of an engineering interface: warm rather than
clinical, distinctive rather than ornamental, and dense with real evidence
without reading like a chronological resume.

The visual experience should make visitors think:

- this person understands both AI systems and why products matter;
- there is substantial work and writing here to explore;
- the design is authored, restrained, and memorable;
- nothing feels generated from a generic AI-site template.

The site is minimal, but not static or anonymous. Its signature comes from
editorial typography, asymmetric composition, exact hairlines, the functional
desktop rail, and one subtle generative-motion idea at a time.

## Sources of Truth

- Product intent: `.impeccable/PRODUCT.md`
- Locked implementation decisions:
  `docs/spec/redesign-implementation-spec.md`
- Required retained terminology: `docs/spec/retained-proof.json`
- Prototype evidence: `src/components/prototype/` and
  `src/app/writing/page.tsx`
- Existing prototype critiques: `.impeccable/critique/`

This document translates those sources into a reusable visual language. Where
it conflicts with the implementation spec, the implementation spec wins.

## Brand Character

- **Editorial:** considered hierarchy, strong reading rhythm, typographic
  contrast, and meaningful whitespace.
- **Technical:** precise metadata, concrete system language, visible structure,
  and functional motion rather than science-fiction decoration.
- **Warm:** paper and ink instead of sterile white and blue-black; terracotta
  instead of neon.
- **Direct:** short claims, specific proof, and restrained calls to action.
- **Curious:** writing may range across AI, product, entrepreneurship, business,
  and personal performance without being forced into a single niche.

Avoid aspirational startup language, generic “building the future” claims,
abstract AI imagery, glowing orbs, chat-interface motifs, and visual effects
that imply sophistication without conveying information.

## Color

### Light

| Role   | Value     | Use                                        |
| ------ | --------- | ------------------------------------------ |
| Ground | `#faf6ef` | Page background                            |
| Ink    | `#1c1917` | Display text and strongest body text       |
| Body   | `#3f3a35` | Paragraphs and descriptions                |
| Faint  | `#5c554e` | Dates, tags, technology, metadata          |
| Accent | `#9c3c1c` | Emphasis, links, headings, primary control |

### Dark

| Role   | Value     | Use                                        |
| ------ | --------- | ------------------------------------------ |
| Ground | `#171412` | Page background                            |
| Ink    | `#ece7de` | Display text and strongest body text       |
| Body   | `#c9c2b7` | Paragraphs and descriptions                |
| Faint  | `#a49a8e` | Dates, tags, technology, metadata          |
| Accent | `#d98d63` | Emphasis, links, headings, primary control |

Use the accent as information, not atmosphere. It may mark the active rail
section, a serif italic phrase, section labels, links, and the subscribe
control. It must not become a large background field.

The filled subscribe control uses paper text on the light accent and ink text
on the dark accent. Do not use paper text on the dark accent.

## Typography

- **Fraunces variable:** wordmark, hero, essay titles, role titles, project
  titles, and selective italic emphasis. Use the optical-size axis.
- **Inter:** body copy, descriptions, form fields, and interface prose.
- **JetBrains Mono:** metadata, dates, tags, eyebrow labels, navigation,
  section headings, and compact actions.

### Hierarchy

- Hero: `clamp(2rem, 5.2vw, 3.25rem)`, compact leading, never the prototype's
  oversized five-line treatment.
- Route `h1`: 36px.
- Lead essay: 28px.
- Row title: 20px.
- Section label: 15px mono, 600, uppercase, `0.18em` tracking.
- Metadata and actions: 11–12px mono with explicit accessible color; never
  opacity-based fading.
- Body copy: 15–17px with a comfortable editorial line height.

Serif creates authorship; mono creates precision; sans carries sustained
reading. Do not add a fourth typographic voice.

## Composition

### Shared Shell

- Use a `max-w-5xl` frame.
- The masthead contains the identity and one full-bleed hairline that extends
  toward the viewport edge.
- Below `lg`, use one approximately 688px reading measure.
- Fixed controls receive explicit top-right and bottom-right exclusion zones.
- DOM and visual reading order must agree.

### Homepage

- At `lg` and above, use a `220px` sticky rail plus main content with a `56px`
  gap.
- The rail contains compact identity, location/contact context, section
  navigation, CV access, and the active scroll position.
- The main column caps at `42rem`; only Projects may release the cap at `lg`.
- The rail is absent below `lg`. A normal-flow mono anchor row replaces its
  navigational function.
- Preserve substantial proof in the page: concrete systems, technical nouns,
  role evidence, selected work, writing, current interests, and contact.

### Writing

- Treat Writing as a publication index, not a stack of cards.
- Use a clear route heading, an optional lead story, hairline-separated rows,
  dates, excerpts, and reading time only when supported by source content.
- The list is count-aware and must look intentional with one item or many.
- The filled subscribe module concludes the reading flow. The archive link
  follows it; competing subscribe surfaces are suppressed on this route.

### CV

- Use Warm Print at document density: compact, skimmable, credible, and
  print-first.
- Preserve full experience, education, systems/projects, skills, dates, contact,
  and an “Updated <month year>” line.
- Avoid editorial expansiveness inside the document. The CV should feel like
  the same identity under tighter constraints, not a miniature homepage.
- Decorative or animated elements must be excluded from print.

## Spacing and Rules

Use an 8px-derived spacing rhythm, with deliberate exceptions for hairlines and
document density.

- Keep related metadata tight: 4–8px.
- Separate a title from its description by 8–12px.
- Separate rows by 20–32px plus a hairline.
- Separate major homepage sections by 64–96px depending on viewport.
- Use whitespace to establish hierarchy before adding containers.
- Borders are one-pixel warm hairlines. No heavy boxes, floating cards, or
  repeated rounded shells.

Alignment should look measured rather than perfectly symmetrical. Dates,
labels, and content columns may form an editorial grid, but body text should
retain a stable reading measure.

## Imagery and Surfaces

- Do not use a large portrait as the hero.
- Do not invent testimonials, client marks, metrics, screenshots, or project
  proof.
- Article covers may appear where the source provides them. Coverless entries
  use a restrained typographic fallback, not synthetic artwork.
- Do not use a grain overlay. It adds rendering cost without meaningful visual
  separation.
- Avoid glass, gradients, large shadows, decorative pills, and generic 3D.

The default surface is the page itself. The subscribe module is the only
deliberately filled interface block and the submit is the only filled control.

## Motion

Motion is a quiet signature, not a layer of content. The preferred reference is
the subtle peripheral animation on the Paul Bakaus homepage, not the more
animated inner pages.

### Selected Hypothesis

**Ambient Current with Rail Instrument containment.**

- The homepage may use one slow, sparse contour field confined to the desktop
  rail and extreme outer margin.
- Writing receives no Ambient Current loop or other continuous route-specific
  echo under this named exception.
- The CV may use a static screen-only contour. It has no continuous animation
  and no printed decoration.
- Use hard clipping geometry from the Rail Instrument concept: no generated
  line may enter navigation, metadata, controls, or the reading measure.
- Render the base field in a faint neutral or ink-derived tone. Terracotta is
  reserved for rare signal points and informational inflections rather than
  used as atmospheric fill.
- Below `lg`, run no continuously animated canvas. A composed static trace may
  appear only where it leaves the single reading measure clean.

The implementation spec now authorizes this selected ambient system as one
named, homepage-only exception to its default “one reveal” motion contract.
The exception remains subordinate to the spec's explicit containment,
performance, lifecycle, fallback, reduced-motion, responsive, CV, and print
gates. It is not general authorization for continuous motion on other routes.

### Principles

1. Use exactly one generative motif for the authorized homepage expression.
2. Keep it hard-clipped to the extreme outer margin and the narrow rail-edge
   instrument lane.
3. Never place moving contrast behind headings, body copy, metadata, inputs, or
   interactive controls.
4. The animation should be noticed before reading and largely forgotten during
   reading.
5. Favor sparse mathematical systems—flow fields, contours, attractors,
   phyllotaxis, or traveling signals—over particles that resemble generic AI
   visualizations.
6. Do not treat the homepage motif as a template for route-to-route animation.
7. Pause when offscreen or when the page is not visible.
8. Respect `prefers-reduced-motion` with an immediate, composed static frame.
9. Exclude motion from print and keep content fully intelligible if canvas or
   WebGL never runs.

### Implementation Guardrails

- Use Canvas 2D. WebGL or an external shader is not authorized without a
  separate measured benefit and owner decision.
- Use CSS masking or strict clipping so the visual cannot leak into the reading
  measure.
- Keep line contrast low and terracotta use sparse.
- Cap effective frame rate and device-pixel ratio where needed; motion may not
  compromise scrolling, interaction latency, or battery disproportionately.
- Loading, hydration, failure, and reduced-motion states must all preserve the
  same composition.

### Parameters to Tune in Browser

The prototype established ceilings rather than targets: production may go
quieter, never denser or louder without a new decision. Tune within the
implementation spec's measured gates:

- opacity and line density;
- speed and pause cadence;
- rail-only versus outer-edge extent;

## Interaction

- Links use the mono accent-underline treatment; keep hit areas at least 24px
  and target 44px for isolated controls.
- The subscribe submit is at least 44px tall and always enabled and focusable.
- Focus indicators use the accent and reach at least 3:1 against both control
  and ground.
- The desktop rail exposes `aria-current="true"` through scroll-spy and uses a
  precise accent left border.
- Hover states may sharpen contrast or shift an underline; they should not
  produce layout movement.
- Forms rely on native semantics, visible errors, `aria-describedby`, and
  `role="alert"`.

## Responsive and Theme Behavior

- Mobile is a designed single-column state, not a collapsed desktop board.
- The desktop rail disappears below `lg`; its essential routes remain in the
  identity/nav flow.
- Fixed chrome must never overlap navigation, prose, form controls, or final
  page content.
- Light and dark modes are equal expressions of Warm Print. Dark mode remains
  warm near-black, never slate.
- Test the sparse and populated writing states at 375px and 1440px.
- Maintain keyboard access, semantic headings, readable reflow, and useful
  print output independently of visual effects.

## Copy and Content

- Lead with **AI Product Engineer**.
- Connect AI-native technical execution to product judgment, business context,
  and practical value.
- Name concrete systems and decisions early enough that the homepage never
  looks less technical than the current site.
- Prefer specific evidence over claims such as “innovative,” “cutting-edge,” or
  “transformative.”
- Keep the voice lean, assured, and human. Avoid startup bravado and repeated
  self-description.
- Let the writing surface carry Lorenzo's broader interests without pretending
  every post belongs to one content strategy.

## Non-Negotiables

- No big hero portrait.
- No generic AI glow, gradient mesh, glassmorphism, or ornamental dashboard
  language.
- No animation behind readable content.
- No motion dependency for navigation or comprehension.
- No fabricated evidence.
- No reduction in discoverable technical proof.
- No visual-only DOM reordering.
- No inaccessible muted text or dark-mode control contrast.
- No drift between the route surfaces, generated PDF, and shared source data.

## Validation Standard

Before this system is considered implementation-ready, verify:

- homepage in light and dark at desktop and mobile widths;
- populated and sparse Writing states;
- CV screen density, A4 print behavior, and generated PDF;
- keyboard navigation, focus, touch targets, and form errors;
- reduced motion, no-script/failure fallback, and offscreen animation pause;
- the selected motion system at realistic scroll speeds;
- no text or control overlap with animated or fixed chrome;
- retained proof against `docs/spec/retained-proof.json`.
