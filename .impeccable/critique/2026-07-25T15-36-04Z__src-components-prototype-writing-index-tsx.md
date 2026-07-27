---
target: "src/components/prototype/writing-index.tsx (/writing index + subscribe module, issue #13)"
total_score: 22
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 5
timestamp: 2026-07-25T15-36-04Z
slug: src-components-prototype-writing-index-tsx
---

Provenance: two isolated parallel sub-agents (Assessment A design review, Assessment B detector + browser evidence), synthesized in the parent. Not degraded. Every number below was measured in a real browser by A, B, or the parent; parent re-verified the three claims that change the spec.

## Design specificity — **specific skin, generic bones**

The tokens are authored: Fraunces at optical size, JetBrains Mono uppercase at 0.12em for metadata, one terracotta (#9c3c1c / #d98d63), warm paper #faf6ef / warm near-black #171412 rather than reflexive slate. Swap them and it is a different site.

The composition is category-interchangeable: hero card → hairline rows with left thumbnails → email capture → two-column footer, i.e. the default Ghost/Substack/Medium index. Nothing structural knows this is an AI product engineer's page; the technical signal is carried by essay titles, which are content, not design.

Two things cut against the audit's binding constraint (_never look less technical_):

- At `?n=1` — the launch state — the largest object on the page is a 688×387 decorative cover **Substack generated**, 26% of a 1,482px document.
- There is **no RSS/Atom/JSON feed link anywhere**, on an essay index for AI engineers, while the footer does advertise `/llms.txt`. The page is machine-readable to agents and not to humans.

## Design health score

| #         | Heuristic                       | Score           | Key issue                                                                                                                                                                             |
| --------- | ------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of system status     | 2               | No pending state; page is byte-identical after a successful handoff; under reduced motion 5 of 6 essays compute `opacity: 0`; 8 links open new tabs unannounced                       |
| 2         | Match system / real world       | 3               | Copy is audience-fluent, but "06/05/04…" is a scheme no reader can derive and row 02 silently drops reading time                                                                      |
| 3         | User control and freedom        | 2               | Every essay link is `target="_blank"` unannounced while nav/CV stay in-tab — inconsistent within one page                                                                             |
| 4         | Consistency and standards       | 2               | Two aspect ratios for one content type (16:9 lead / 4:3 rows, and 4:3 crops the art); five link types share one treatment; error hue ≈ focus hue; rows are `h3` under the lead's `h2` |
| 5         | Error prevention                | 3               | `type=email`, `inputMode`, `autoComplete`, real `<label>`, permissive regex, works with JS off — undercut by a 133px field at 375                                                     |
| 6         | Recognition over recall         | 2               | Accessible names measure **221–268 chars each**; undecodable numbering                                                                                                                |
| 7         | Flexibility and efficiency      | 2               | Skip link, `aria-current`, JS-off form, `?email=` prefill — but no title-only scan path, no list semantics, no feed                                                                   |
| 8         | Aesthetic and minimalist design | 3               | Genuinely restrained; deductions for the decorative cover leading, the invisible coverless panel, and a full-viewport `mix-blend-multiply` that renders nothing                       |
| 9         | Error recovery                  | 3               | Specific, `role="alert"`, `aria-invalid`, value preserved, clears on input; focus never moves to the field                                                                            |
| 10        | Help and documentation          | n/a             | An essay index has nothing to document; the one place guidance is needed (the handoff) carries it inline and well                                                                     |
| **Total** |                                 | **22/36 (61%)** | **Acceptable**                                                                                                                                                                        |

## Cognitive load — 4 of 8 failed (high), concentrated in the last 600px

The list itself is low-load: one decision per screen, no filters, no sort, no tags. Failures: single focus (the archive link sits **above** the subscribe module, so the natural end-of-list gesture leaves the site before the conversion point); chunking and minimal choices (**11 discrete choices in the final ~600px**, 10 sharing one treatment, 3 pointing at Substack); visual hierarchy (`h1` "Writing" and the lead title are **both 36px in the same colour**, differing only in weight; every CTA on the page is the same 11px mono terracotta underline, so there is no primary anything). Progressive disclosure passes — the count-aware states are exactly that, done well.

## Emotional journey

Entry is the peak and earns it: 2px masthead rule, "Writing" in Fraunces, one standfirst sentence that says what the essays are about. Then a dip — the eye lands on a brown blur, not a title. Scanning is flat: six rows of equal weight over a divider measured at **1.19:1** against paper, with two thumbnails that either vanish into the paper (1.02:1) or glare out of the dark (12.4:1). The valley is the reduced-motion arm: a reader who asked for _less_ motion gets _more_ blankness. The end inverts the peak-end rule — at 375 the final impression is a 133px field whose placeholder is cut to "you@company.c", and after a successful submit the page does not change at all. The one genuinely reassuring moment is the handoff sentence: _"Opens Substack with your address filled in — you confirm the subscription there."_

## Strengths

1. **The handoff, mechanism and copy together.** The form's `action` _is_ the Substack subscribe page over GET, so the browser builds `?email=` itself — no third-party script, works with JS off — and the copy promises a handoff rather than success, precisely where a reader would otherwise be misled (`subscribe-module.tsx:92-97`).
2. **The count-aware list.** `?n=1` → lead only, no numbering, no archive link, no "0 more essays"; `ListFallback` holds the exact space the essays will occupy (`writing-index.tsx:269-280`) and measures **CLS 0.0000** on streamed arrival.
3. **Metadata restraint and contrast honesty.** Date + computed reading time, nothing invented; reading time omitted rather than guessed on the previewed post; the explicit `faint` token instead of `opacity-55`. Lowest text contrast on the page is **6.34:1 light / 6.63:1 dark** at 11px. Nothing fails AA in either mode.

## Priority issues

**[P1] Reduced motion turns the index into five blank rows.** `writing-index.tsx:50,52-60`. With `prefers-reduced-motion: reduce`, `animation-duration` collapses to `1e-05s` but `animation-delay` survives at 0.1–0.5s and `fill: both` holds the 0% keyframe: articles 2–6 compute `opacity: 0`, the last held 452–600ms past its own mount on top of the ~700ms stream. Fix: no page-level `delay-*` on streamed sections; reveals key off their own mount; the site-wide reduced-motion block must reset `animation-delay`. → `/impeccable animate`

**[P1] Covers have no boundary in light mode, glare in dark, and the 4:3 row box decapitates the art.** `writing-index.tsx:71-74,93-103`. Near-white cover vs paper **1.04:1**; the same cover vs near-black **12–17:1**, brighter than any text on the page and 1.9× the metadata that labels it. In light mode the only visible part of the Substack default title card is a rust bar baked into the artwork at 3.41:1, 6px above the metadata row, where it reads as a mis-coloured hairline. 16:9 art in a 4:3 box crops "Costruire" → "ostruire" and "LORENZO GERMINI" → "ENZO GERMINI". Substack auto-generates those cards, so this is the default case. → `/impeccable polish`

**[P1] Five identical CTAs, no primary, and the escape hatch sits above the conversion point.** `writing-index.tsx:152-157,252-264,398-407`, `subscribe-module.tsx:145-151`. The submit is 182×35px of 11px mono, indistinguishable from "Read the essay" (navigation) and "CV →" (internal). The archive link renders above the module; the footer repeats a third Substack link within 400px. → `/impeccable bolder`

**[P1] The subscribe row can never wrap; at 375 the field is 133px.** `subscribe-module.tsx:123,139`. `flex-wrap` cannot fire because `min-w-0 flex-1` lets the input shrink instead: input **133×42**, button **182×35**, placeholder truncated to "you@company.c". On the error path the field the reader must fix is the smallest control on the page. → `/impeccable adapt`

**[P1] Row thumbnails are served at a quarter of the resolution they render at.** `writing-index.tsx:99`. `sizes="160px"` is correct only above `sm`; below it the thumb is full-width. Measured at 375/DPR 2: displayed **327 CSS px = 654 device px**, `naturalWidth` **160**. Five of six covers are visibly soft on every phone. Fix: `sizes="(min-width: 640px) 160px, 100vw"`. → `/impeccable optimize`

**[P2] Each essay is one 250-character link, and the "stable" numbering is not stable.** `writing-index.tsx:132-136,180-185`; `writing-feed.ts:96-109`. Accessible names measure 221, 244, 260, 268, 262, 221 characters — ~1,500 characters of link text across six tab stops, with no list semantics. And numbering derives from the fetched window, not the archive: parent verified that the same essay is **04 at `?n=4` and 06 at `?n=6`**. #10 decision 4's entire purpose — "publishing a new essay never renumbers the existing ones" — does not hold once Substack's feed window slides past the archive. → `/impeccable harden`

## Persona red flags

**Sam (screen reader / keyboard):** essay links announce 221–268 characters; heading levels make the five rows `h3` children of the lead's `h2`, so heading navigation implies they are sections _of_ "The demo-to-production gap"; eight links open new tabs unannounced while the masthead stays in-tab; the error state is a 2px `#a32f13` underline beside a `#9c3c1c` focus state — indistinguishable — and focus never moves to the offending field; the `X` footer link is a 7.9×14px box named "X"; under reduced motion five of six essays are invisible.

**Casey (one-handed, 375):** the primary action is at the bottom of a **4,411px** page; every control is a text link (nav 16.5px tall, footer 14px, submit 35px); the fixed theme toggle overlaps the CV link — parent hit-tested (343, 49) and got **"Toggle theme"**, with 63px² of overlap on a 15.8×16.5px target.

**Riley (stress tester):** `?n=4` renumbers the lead essay from 06 to 04; row 02 shows a date with no reading time and nothing explains it (correct behaviour for a paid preview, reads as a data bug); after submitting, the page is byte-identical and a refresh loses the typed address.

**Priya (senior AI engineer, 90 seconds, deciding whether this person is technical):** the biggest element is a blurry decorative cover; **there is no feed link**, so the one action she would take is unavailable and the only offered path is handing over her email; the metadata signals nothing about depth; every essay opens on Substack, so she cannot judge this site's engineering from `/writing` at all.

## Minor observations

- Lead excerpt runs 688px / **90 chars per line** (detector flagged ~86) while the standfirst above (62 chars) and row excerpts below (~70) are narrower. `max-width` computes to `none` on all nine paragraphs — the 688px comes from the grid column alone. The 13px subscribe hint runs 87 chars/line.
- The lead cover is the LCP element and carries `loading="lazy"` with no `fetchpriority` (Next.js logs the warning). `size === "lead"` is already branched on for `sizes`, so `priority` costs one line.
- Static detector: **exit 0, zero findings** on both target files (validated against a sibling file that returns 2, so the tool works). In-page detector, identical on `?n=6`, `?n=1`, `?n=6&it=on`: `line-length` on the lead excerpt, `overused-font` on Inter + Fraunces (both deliberate — the rule is a design-intent verdict, and it reports both faces as "primary" at the same percentage, a reporting quirk).
- The coverless fallback repeats the date ~150px to the left of the same date in the metadata row, and its interior measures 1.04:1 against the ground — only its 1.31:1 border defines it.
- The error message is the only lowercase mono text on the surface; all other mono is uppercase and tracked.
- Row thumbnails stay 160px from 640 to 1440 while the lead cover grows to 688 — a 4.3× ratio inside one list. Nothing in the layout changes above 736px; at 1440 the design uses 51% of the viewport.
- Row hairlines measure 1.19:1 against paper — the only structural device between essays.
- IT copy costs no extra lines anywhere at 375; the button is the same width only because "Continua su Substack →" happens to match the English.
- Text at 200% root font size: **no overflow at 375** (scrollWidth 375 = viewport).

## Questions

- The numbers read as a countdown and the same essay is "04" at a different feed length. If a reader cannot decode them and they are not stable, what are they for?
- The largest object on the page is a cover Substack generated. What if `/writing` led with the _sentence_ — the excerpt at display size, no image — and covers were 16:9 hairlines in the rows?
- Every CTA is the same 11px mono underline. If exactly one had to look like a button, which earns it — and what does that say about whether this surface is Read or Persuade?
- The footer tells agents where the machine-readable index is and never tells a human engineer where the feed is. Which audience is `/writing` for?
- A reader who asks for reduced motion sees five blank rows. What is the animation buying that is worth that?
- At `?n=1` the standfirst promises "essays", plural, and delivers one, with nothing framing it as a launch. Is the fix a launch line, or not shipping `/writing` until n≥2?
