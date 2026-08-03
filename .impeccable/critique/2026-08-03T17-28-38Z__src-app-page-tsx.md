---
target: "the site — homepage, /cv, /writing (issue #74 closeout)"
total_score: 25
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
timestamp: 2026-08-03T17-28-38Z
slug: src-app-page-tsx
---

Method: dual-agent (A: critique_design · B: critique_detector)

Target: the site — `/`, `/writing`, and `/cv` at 375/1024/1440, light + dark + print evidence. Closing critique for issue #74 after #85–#89 merged.

## Design Health Score

| #         | Heuristic                       |     Score | Key Issue                                                                                                                           |
| --------- | ------------------------------- | --------: | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     |         3 | Theme and section state are legible; the promoted field note cannot be live until the coordinated launch.                           |
| 2         | Match System / Real World       |         3 | Editorial language and document-like CV fit expectations; the pre-publish article promise is intentionally unresolved until launch. |
| 3         | User Control and Freedom        |         4 | Home, Writing, CV, section anchors, theme control, and browser-native outbound navigation are explicit.                             |
| 4         | Consistency and Standards       |         3 | Warm Print is coherent; the three routes intentionally use different composition patterns.                                          |
| 5         | Error Prevention                |         3 | Subscription handoff is clear and native validation remains available; publication state is the remaining external dependency.      |
| 6         | Recognition Rather Than Recall  |         4 | Route and section labels are explicit at every relevant breakpoint.                                                                 |
| 7         | Flexibility and Efficiency      |       n/a | Portfolio/experience surface with no repeated operational task.                                                                     |
| 8         | Aesthetic and Minimalist Design |         3 | Restrained and authored; the mobile orientation band and repeated narrative add density.                                            |
| 9         | Error Recovery                  |         2 | The honest n=0 Writing state recovers transparently but cannot offer a real article before publication.                             |
| 10        | Help and Documentation          |       n/a | Portfolio/experience surface whose content is self-explanatory.                                                                     |
| **Total** |                                 | **25/32** | **Strong; pre-launch implementation is complete, with launch-state and later-scope questions remaining.**                           |

## Design Specificity Verdict

**Authored, but not yet unmistakable.** Fraunces-led editorial typography, terracotta rules, warm paper/near-black modes, mono metadata, the portrait rail, and technically specific copy form a coherent personal system. The deterministic source scan returned exact JSON `[]`: zero findings in `src/app/page.tsx`.

Runtime overlays reported contextual warnings: homepage 4 unique rules / 5 instances, Writing 3 instances, CV 19 instances. Most are deliberate system choices rather than defects: Inter is the signed body face; uppercase mono is the metadata/navigation tier; cream is Warm Print ground; the CV eyebrow is a document label. The credible warnings are long CV lines and editorial em-dash density. Responsive inspection found zero horizontal overflow at 375, 1024, and 1440.

No user-visible overlay remains. Injection succeeded internally on `/`, `/writing`, and `/cv`, but the browser runner has no presentation command and its isolated session was closed.

## Overall Impression

The implementation seams that made the first critique fail are gone: the Writing route is wired into the masthead and article area, footer geometry is route-aware, print-only defects are fixed, the command palette is retired, and every personal-site icon now uses the distinct Warm Print `LG` mark. The remaining tension is not unfinished UI; it is the intentionally coupled launch state. The homepage promises a named field note while the feed is n=0, and #67 explicitly accepts that risk under publish-then-announce.

## What's Working

1. **The first viewport is confident and authored.** The portrait, headline, editorial measure, and terracotta emphasis establish a credible builder-writer identity.
2. **Responsive transformation is stable.** The desktop rail becomes a mobile identity band and anchor row without overflow or broken reading order.
3. **The visual system survives light, dark, and print.** Real theme-toggle evidence reached Warm Print light; dark remained intentional; native browser PDF generation exercised print output.

## Priority Issues

### [P1] The writing-first promise depends on launch order

**Why it matters:** Before publication, the homepage promotes `Drop the Bloat` while `/writing` truthfully reports n=0. This is the site's highest-trust journey.

**Fix:** No pre-launch code change. Follow #67's signed coordinated-launch sequence: publish, verify the real article URL and RSS n=1 state immediately, then announce. Treat a failed post-publish verification as a launch blocker.

**Suggested command:** `$impeccable harden`

### [P1] Mobile orientation precedes the core proposition

**Why it matters:** At 375px, the identity band, social controls, CV route, theme control, and five section anchors create 11 interactive choices before the headline.

**Fix:** Record for later evidence-led reconsideration, not #74. The identity band and mobile anchors are locked by the signed redesign composition; changing them here would reopen #3.

**Suggested command:** `$impeccable distill`

### [P1] Technical authority is concentrated in few artifacts

**Why it matters:** The writing-first AI Product Engineer claim is strong, but the homepage offers one project card and a compact Systems colophon as inspectable proof.

**Fix:** Revisit after launch when real writing and traffic evidence exist. Adding new proof artifacts now changes approved content scope rather than polishing the implemented design.

**Suggested command:** `$impeccable bolder`

### [P2] Repeated narrative softens momentum

**Why it matters:** Hero, About, and Work revisit adjacent Complaion/agents/evals positioning.

**Fix:** Keep the #71 owner-approved copy for launch. Use post-launch reading evidence before reopening exact copy.

**Suggested command:** `$impeccable clarify`

### [P2] The n=0 Writing route ends in absence

**Why it matters:** At 1440px the honest empty state leaves a large quiet field before the footer.

**Fix:** No code change: n=0 disappears at the coordinated launch, and the count-aware n=1 transition is already fixture-tested. Verify the real feed immediately after publication.

**Suggested command:** `$impeccable harden`

## Persona Red Flags

**Jordan, first-time founder/product leader:** Before publication, Jordan can follow the Writing route and encounter the n=0 state after seeing a named article on the homepage. Launch sequencing must ensure no announced visitor sees this mismatch.

**Priya, technical hiring manager:** Priya can verify chronology, stack, and delivery scope, especially on `/cv`, but must infer some engineering depth from prose because the homepage intentionally stays compact.

**Marco, time-poor mobile recruiter:** Marco gets an early CV route and a strong downloadable document, but must pass a dense orientation band before the homepage proposition and scan compact CV metadata at 375px.

## Minor Observations

- The homepage has three adjacent writing choices: hero anchor, field-note CTA, and `All writing`. Their destinations are now valid structurally, but the final external article URL remains a launch-day fact.
- Runtime `overused-font`, `cream-palette`, `all-caps-body`, and `hero-eyebrow-chip` warnings are false positives against the signed Warm Print system.
- The homepage's 10 em dashes are an editorial-density warning, not an implementation defect; #71 owns the approved copy.
- CV line-length warnings are credible at 1024, but the CV remains coherent and free of horizontal overflow.
- The detector's Writing `cramped-padding` warning may be measuring the visible control rather than its pseudo-element hit area; no action without target-level confirmation.
- A browser-generated homepage PDF showed a blank portrait frame in Assessment A. This is not the shipped CV path and may be lazy-image timing; keep it as a print-regression clue, not a launch blocker.

## Questions to Consider

1. After article one is live, does real visitor behavior support keeping five mobile section anchors before the headline?
2. What inspectable proof would most increase credibility with a skeptical staff engineer without turning the homepage back into a chronological CV?
3. Once n=1 is real, does the Writing route's composition still feel intentionally quiet, or merely sparse?

Questions skipped for closeout: every new observation is either governed by the coordinated-launch verification, locked by the signed redesign, or non-critical post-launch evidence work. No owner decision is needed to close #74.
