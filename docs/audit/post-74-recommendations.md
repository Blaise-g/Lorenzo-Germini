# Post-#74 future improvements

**Status:** deferred until after launch

**Date:** 2026-08-03

**Decision:** none of these items blocks launch

## Purpose

This document records the non-blocking observations from the closing #74 critique so they are not lost and do not get mistaken for unfinished launch work.

The launch path remains unchanged: finish the existing open tickets under [#67](https://github.com/Blaise-g/Lorenzo-Germini/issues/67), then run the coordinated publish–verify–announce sequence in [#78](https://github.com/Blaise-g/Lorenzo-Germini/issues/78). Do not open another pre-launch design or UX ticket from this document.

## Source evidence

The source is the dual-agent closing critique at [`.impeccable/critique/2026-08-03T17-28-38Z__src-app-page-tsx.md`](../../.impeccable/critique/2026-08-03T17-28-38Z__src-app-page-tsx.md).

That run inspected `/`, `/writing`, and `/cv` at 375, 1024, and 1440px with light, dark, and print evidence. It found:

- no source-detector findings in `src/app/page.tsx`;
- no horizontal overflow at any inspected width;
- coherent Warm Print behaviour in light, dark, and print contexts;
- no remaining P0 issue;
- several broader design and content questions that need real post-launch evidence.

The closing score was 25/32. It is not directly comparable to the earlier 26/40 because the closing run correctly marked two portfolio-inapplicable heuristics as `n/a`.

## Future improvements

### 1. Reassess mobile orientation density

**Observation:** At 375px, the identity band, social controls, CV route, theme control, and five section anchors create 11 interactive choices before the headline.

**Why it may matter:** A first-time visitor has to process the site's navigation and identity before reaching the core proposition. That can weaken the first-view hierarchy even though every individual control is understandable and usable.

**Why it waits:** The mobile identity band and anchor row are signed redesign decisions. The anchor row fixed a real earlier defect: mobile visitors had no practical route to Writing. [ADR-0003](../adr/0003-chrome-controls-sit-in-flow-instead-of-reserving-gutters.md) has also removed the floating controls and reserved gutter that previously made the first viewport more expensive.

**Revisit when:** Real mobile behaviour shows repeated first-viewport abandonment, low anchor use alongside normal scrolling, or qualitative feedback that visitors do not reach the proposition quickly.

**Possible direction:** Run `$impeccable distill` on the mobile identity and anchor sequence. Test whether fewer first-view destinations improve comprehension without making Writing, Work, Projects, or CV harder to reach.

### 2. Add more inspectable technical proof

**Observation:** The homepage's technical authority is concentrated in the Work proof lines, one project card, and the compact Systems colophon.

**Why it may matter:** A skeptical technical reader can verify tools and scope, but must infer some engineering depth from prose rather than inspect multiple concrete artifacts.

**Why it waits:** The signed implementation contract deliberately keeps Systems as a colophon and uses `homepageProof` to preserve technical evidence without returning the homepage to a stack inventory. Adding placeholder cards or generic architecture diagrams would make the page busier without making it more credible.

**Revisit when:** Two or three real artifacts exist—published field notes, public repositories, product demos, system diagrams, or measurable outcomes—or repeated founder/hiring feedback says the site does not establish technical depth.

**Possible direction:** Run `$impeccable bolder` using only real artifacts. Keep the retained-proof contract and the rule that the site must never look less technical.

### 3. Review the real n=1 Writing composition

**Observation:** The n=0 Writing state is honest but leaves a large quiet field at desktop widths and ends primarily in subscription.

**Why it may matter:** Once a real field note exists, the route should feel like the intentional first page of a body of work, not an empty publication with one item inserted.

**Why it waits:** The n=0 state is temporary, and the count-aware n=1 transition is already fixture-tested. Redesigning absence immediately before it disappears would optimize the wrong state.

**Revisit when:** `Drop the Bloat` is live, the feed renders n=1 in production, and the real cover, excerpt, date, and launch line can be judged together.

**Possible direction:** Run `$impeccable layout` on the production n=1 route. Preserve the count-aware contract and avoid implying that more writing exists than does.

### 4. Recheck narrative repetition

**Observation:** The hero, About, and Work sections revisit adjacent Complaion, agents, and evaluation themes. The runtime detector also counted ten em dashes on the homepage.

**Why it may matter:** Repeated positioning can soften momentum by making readers feel that a later section restates the opening instead of adding evidence.

**Why it waits:** The copy was owner-approved under #71 and is synchronized across multiple identity surfaces. The em-dash count is an editorial-style signal, not a defect. Changing exact copy before launch would reopen settled language without reader evidence.

**Revisit when:** Reader feedback shows that the roles of hero, About, and Work are hard to distinguish, or analytics suggest readers repeatedly leave during the repeated narrative sections.

**Possible direction:** Run `$impeccable clarify` section by section with owner approval. Keep distinct jobs: hero for proposition, About for operating belief, and Work for evidence and outcomes.

### 5. Reassess CV reading measure

**Observation:** Runtime detection flagged several CV lines at roughly 93–114 characters at 1024px.

**Why it may matter:** Dense lines can slow scanning, especially for a recruiter reading dates, roles, metadata, and bullets quickly.

**Why it waits:** The CV is a dense document surface rather than a prose article. It remained coherent, printable, and free of horizontal overflow. A generic 80-character detector target is not sufficient evidence for changing an otherwise stable document.

**Revisit when:** Print readability, recruiter scanning, pagination, or real-device overflow fails.

**Possible direction:** Run `$impeccable typeset` on `/cv`, testing measure and metadata density together so a narrower column does not damage pagination or create a longer document without a readability gain.

### 6. Reproduce the homepage print portrait anomaly

**Observation:** One browser-generated homepage PDF showed a blank portrait frame.

**Why it may matter:** If deterministic, the print stylesheet or image-loading path is dropping a first-page identity element.

**Why it waits:** The observation may be lazy-image timing, did not affect the shipped CV path, and was not reproduced. One ambiguous capture is not enough evidence for an image-loading or print-CSS change.

**Revisit when:** A post-launch print check can reproduce the blank frame after the image reports complete with a non-zero natural width.

**Possible direction:** Generate the homepage PDF twice through the same production-like path. Open a defect only if both outputs fail consistently.

### 7. Reconsider hierarchy only after the writing corpus exists

**Observation:** The page still makes the person and professional proposition visually dominant, while Writing is a first-class section rather than the largest object.

**Why it may matter:** If the publication becomes the strongest proof of Lorenzo's thinking, the hierarchy may eventually understate it.

**Why it waits:** The signed spec deliberately ships the current hierarchy. With one field note, increasing Writing's visual rank would claim a corpus that does not yet exist.

**Revisit when:** At least four real field notes exist, matching the Phase 3 trigger in the redesign implementation spec.

**Possible direction:** Test the signed experiment in which the field-note excerpt outranks the positioning statement in type size. Compare comprehension and route choice without demoting the professional identity accidentally.

### 8. Reassess covers after real visual evidence exists

**Observation:** A cover can become the largest visual object on `/writing`, while the site's authored character otherwise comes from typography and structure.

**Why it may matter:** Generic or inconsistent Substack covers could make the Writing route feel less specific than the rest of Warm Print.

**Why it waits:** One cover cannot establish a pattern, and fixture images are not a fair basis for judging the real publication.

**Revisit when:** At least three real covers exist, matching the Phase 3 trigger in the redesign implementation spec.

**Possible direction:** Compare the current cover-led index with the signed coverless, display-excerpt experiment. Keep covers if they improve scanning and identity; remove them only if the real set consistently weakens both.

## Findings that are not future work

The following detector warnings conflict with intentional project decisions and should not enter the backlog:

- `overused-font`: Inter is the signed body face;
- `cream-palette`: `#faf6ef` is Warm Print Ground;
- `all-caps-body`: uppercase mono is the navigation and metadata tier;
- `hero-eyebrow-chip`: `Curriculum vitae` is a document label, not a generic product chip;
- the n=0 homepage/Writing mismatch: this is already governed by #78's publish–verify–announce gate and disappears only when the real field note is live.

These are not ignored risks. They are either false positives against [ADR-0001](../adr/0001-warm-print-has-seven-colour-roles.md) or launch-state facts already owned elsewhere.

## Guardrails for future work

Any future improvement from this list must:

- start from production evidence gathered after launch;
- preserve the owner-signed [redesign implementation spec](../spec/redesign-implementation-spec.md) unless the owner explicitly reopens a decision;
- preserve all retained technical proof;
- keep the seven Warm Print roles and their light/dark/print parity;
- respect [ADR-0002](../adr/0002-each-shell-owns-its-footer-inset.md) for route-owned geometry;
- respect [ADR-0003](../adr/0003-chrome-controls-sit-in-flow-instead-of-reserving-gutters.md) rather than reintroducing floating chrome or reserved mobile gutters;
- treat substantive exact-copy changes as owner-gated and resynchronize every identity surface;
- receive a fresh browser critique at the real state being changed, not at a fixture or pre-launch substitute.

## Bottom line

Ship first. Keep these as evidence-gated post-launch improvements, not as unfinished launch scope. The site is now more likely to benefit from real readers than from another speculative refinement pass.
