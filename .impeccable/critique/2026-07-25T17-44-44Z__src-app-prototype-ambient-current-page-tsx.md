---
target: "Ambient Current motion prototype — issue #11"
total_score: 30
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
timestamp: 2026-07-25T17-44-44Z
slug: src-app-prototype-ambient-current-page-tsx
---

Method: dual-agent (A: impeccable_assessment_a2 · B: impeccable_assessment_b)

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                   |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 4         | The rail exposes semantic section state independently from the canvas.                      |
| 2         | Match System / Real World       | 4         | Editorial typography plus an instrument-like trace fits the technical-authorial identity.   |
| 3         | User Control and Freedom        | 3         | OS reduced motion is respected, but there is no explicit situational pause control.         |
| 4         | Consistency and Standards       | 4         | Warm Print typography, hairlines, accent, and route behavior remain coherent.               |
| 5         | Error Prevention                | 4         | The decorative canvas carries no navigation meaning and cannot intercept input.             |
| 6         | Recognition Rather Than Recall  | 4         | Section labels, active state, and CV access remain explicit.                                |
| 7         | Flexibility and Efficiency      | n/a       | Portfolio/experience surface, not a repeated productivity workflow.                         |
| 8         | Aesthetic and Minimalist Design | 3         | Strong restraint, though the inner contour is close to becoming a second divider at 1024px. |
| 9         | Error Recovery                  | 4         | Canvas failure and no-JS states preserve content and geometry.                              |
| 10        | Help and Documentation          | n/a       | Not applicable to this portfolio surface.                                                   |
| **Total** |                                 | **30/32** | **Excellent, with acceptance evidence outstanding.**                                        |

## Design Specificity Verdict

**LLM assessment:** Authored and product-specific. The contour reads as a technical instrument or system trace tied to Lorenzo's AI-engineering identity and to the functional 220px rail. It avoids generic AI glow, particles, gradient mesh, and spectacle. Hard containment is the decisive move: without the rail boundary and extreme-margin clips, the same field would become interchangeable generative decoration.

Light and dark remain recognizably Warm Print. Terracotta behaves as a rare signal rather than atmosphere. At 1024px the trace occupies the narrow rail seam without entering text. At 768px and 375px the continuous expression disappears. Reduced-motion keeps a composed static frame; initialization failure and no-JS preserve the hierarchy; CV screen uses an outer-margin static trace and print removes it.

**Deterministic scan:** `detect.mjs` ran exactly once over the six prototype targets and returned `[]` (exit 0). Rendered detector analysis reported three `all-caps-body` warnings on intentional mono metadata, one legitimate secondary `line-length` warning on the systems inventory, two false-positive `overused-font` advisories for the mandated Inter/Fraunces pairing, and an em-dash content advisory unrelated to motion.

**Visual overlays:** Mutable injection and `detect.js` console capture succeeded in a fresh headless browser session. No reliable user-visible `[Human]` overlay is available because the available browser ran headless. The helper server was stopped and its live annotation directories were cleaned.

## Overall Impression

The visual hypothesis survives the browser. It adds authorship at the exact place where the rail previously read as underused space, and it recedes once reading begins. Canvas 2D is visually sufficient; WebGL/Radiant would add complexity without a demonstrated visual need.

The result is not yet fully validated for a spec amendment. Screenshots and automated scroll cannot prove that motion is forgotten during a sustained 60–90 second reading session, and the current fixed full-viewport observer target cannot naturally leave the viewport. The right decision is **constrain further, then amend conditionally**: preserve the one-reveal rule as the default and define Ambient Current as one named exception only after the remaining gates close.

## What's Working

1. **Containment is real, not aspirational.** Pixel sampling found non-transparent pixels only in the extreme outer margin and narrow rail-edge band; the rail body and content region sampled zero. A text-range intersection check found zero visible text inside the final draw zones.
2. **Fallback identity survives.** Reduced motion held frame count at zero; initialization failure and blocked-script fallback preserved main, hero, nav, scroll height, and width; print contained no contour or prototype chrome.
3. **Performance is proportionate.** Canvas 2D averaged roughly 0.18–0.25 ms per drawn frame, peaked around 0.7 ms, capped effective DPR at 1.5 and target FPS at 24, produced no long tasks, and measured CLS 0.

## Priority Issues

### [P1] Offscreen pausing is wired but not naturally exercisable

**Why it matters:** The observed host is `position: fixed; inset: 0`, so its `IntersectionObserver` target never leaves the viewport during normal route use. A manual `display:none` simulation paused at zero additional frames, but that is not the real lifecycle gate named by the handoff.

**Fix:** Observe an owning route/surface lifecycle target that can genuinely become non-visible, or add an explicit reusable visibility contract and test hook. Require a real offscreen transition before spec authorization.

**Suggested command:** `$impeccable harden`

### [P1] Temporal reading quality remains unproven

**Why it matters:** Still images and automated scrolling cannot establish whether motion is noticed and then forgotten, whether the rare terracotta signals recur too often, or whether it draws attention away from role evidence during sustained reading.

**Fix:** Run an attended 60–90 second reading pass in both themes at realistic scroll speed. Lock maximum density, contrast, speed, and signal cadence from that observation.

**Suggested command:** `$impeccable animate`

### [P2] The exception needs a narrow specification boundary

**Why it matters:** A broad "continuous motion allowed" clause could legitimize future animation behind content, on mobile, or across multiple motifs.

**Fix:** Preserve one reveal as the default. Name one desktop-only Canvas 2D exception, clipped to outer margin/rail seam, decorative and non-semantic, absent below `lg`, static under reduced motion, static outer-margin-only on CV screen, and fully removed from print.

**Suggested command:** `$impeccable document`

### [P2] Rail-edge density is already near its useful ceiling

**Why it matters:** At 1024px the inner band can read as a second divider. Increasing density or contrast would turn a peripheral signature into page chrome and compete with the active rail marker.

**Fix:** Treat the prototype's final density and contrast as maxima, not defaults to embellish. Keep a measured clear gutter around rail text and the content edge.

**Suggested command:** `$impeccable quieter`

### [P2] Print evidence covers Letter only

**Why it matters:** The generated PDF proves complete decoration suppression on a tagged one-page Letter output, but the locked CV contract also requires A4.

**Fix:** Repeat the same suppression and page-fill inspection on A4 when the real `/cv` implementation exists.

**Suggested command:** `$impeccable audit`

## Persona Red Flags

**Time-poor hiring manager:** No current content-access blocker. The trace stays outside the reading path and concrete technical language remains dominant. Risk returns only if production motion becomes denser or repeatedly flashes terracotta.

**Motion-sensitive visitor:** The reduced-motion state is visually sound and no continuous loop starts in the tested state. An explicit pause remains absent for situational sensitivity outside the OS preference.

**Technical peer scrutinizing craft:** Canvas 2D restraint reads as judgment. WebGL complexity, dropped frames, battery cost, or an unverifiable pause contract would invert that signal into gimmickry.

## Blockers and Acceptance Gates

**Design blockers:** None visible in the supplied browser evidence.

**Implementation acceptance gates:** Real offscreen lifecycle pause; attended sustained-reading check; capped DPR/FPS/frame cost; zero long tasks and scroll degradation; immediate static reduced-motion state; hidden-tab pause; geometry and CLS equality across motion, failure, and no-JS; pointer/focus/accessibility-tree exclusion; hard clipping at every desktop width; no continuous mobile loop; CV static containment; A4 and Letter print suppression.

## Minor Observations

- The fixed evidence switcher overlaps content on mobile and during scroll; this is prototype-only harness noise and must not enter production.
- At 375px the masthead's "AI PRODUCT ENGINEER" label clips beneath the theme control. This is an incumbent responsive defect, independent of the canvas.
- The Axe landmark violation is limited to prototype helper copy/switcher; there is no canvas-specific accessibility violation.
- No clean-session browser error or hydration warning appeared; only expected development/HMR and analytics debug messages.

## Questions to Consider

1. Is the original decision session willing to define Ambient Current as a named exception rather than relaxing the motion contract generally?
2. What concrete owning surface should determine "offscreen" for a route-level fixed ambient layer?
3. During an attended 60–90 second reading pass, does the inner rail-edge current disappear perceptually soon enough, or should only the extreme-margin field remain animated?
4. Should a future motion control provide an explicit pause, or is OS reduced motion plus lifecycle pausing the intended contract?
