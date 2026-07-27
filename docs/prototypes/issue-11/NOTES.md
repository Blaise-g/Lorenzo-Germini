# Return handoff: Ambient Current motion prototype — issue #11

## Question

Can the selected **Ambient Current with Rail Instrument containment** motion
system remain distinctive, peripheral, accessible, and performant enough to
amend the locked redesign specification?

## Status

**Decision reconciled and owner-signed on 2026-07-26.**

The disposable Canvas 2D prototype was runnable during evidence collection and
the required Impeccable critique is complete. Its code has now been deleted;
the measurements, screenshots, print artifact, critique, and this handoff are
retained.

The implementation spec permits Ambient Current as one narrowly named,
homepage-only exception to the default one-reveal contract. It does not
authorize continuous motion generally or on `/writing`.

## Prototype shape

- Canvas 2D only; Radiant/WebGL was not needed.
- One sparse contour field clipped to the extreme outer margin and a narrow
  rail-edge instrument lane.
- Homepage motion only at `lg` and above.
- No canvas at 375px or 768px.
- Reduced motion draws one composed static frame and starts no loop.
- CV screen uses a static outer-margin trace only.
- Print removes canvas, theme control, switcher, command control, and all
  screen-only chrome.
- Canvas is `aria-hidden`, `role="presentation"`, `tabIndex={-1}`, and
  `pointer-events:none`.
- Scroll-spy is a separate semantic observer and exposes `aria-current`.

## Observed evidence

| Gate                        | Result                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| 1440 light/dark             | Same Warm Print line character; terracotta remains rare             |
| 1024                        | Motion active; rail 220px; no visible text in draw zones            |
| 768 / 375                   | Rail and canvas absent; document width equals viewport              |
| Reduced motion              | Runtime `static`; frame delta 0; zero running animations            |
| Initialization failure      | Runtime `failed`; no canvas; CLS 0                                  |
| No JS                       | Transparent default canvas only; content geometry unchanged         |
| Hidden tab                  | Frame count held while hidden; resumed on return                    |
| Offscreen simulation        | Frame delta 0 while host hidden; runtime `paused`                   |
| Natural offscreen lifecycle | **Unresolved:** fixed viewport target cannot leave viewport         |
| DPR / FPS                   | Effective DPR capped at 1.5; target 24 fps                          |
| Draw cost                   | ~0.18–0.25ms average; ~0.7ms observed maximum                       |
| Sustained automated scroll  | No long tasks; no observable degradation                            |
| Clipping                    | 0 sampled pixels in rail body/content; 0 visible text intersections |
| Input / accessibility       | No pointer interception; absent from a11y snapshot/focus order      |
| Geometry / CLS              | Motion and failure exact; no-JS layout equal; CLS 0                 |
| CV screen                   | Static outer-margin trace; frame count 0                            |
| CV print                    | One tagged, JavaScript-free Letter page; no decoration/chrome       |

The print proof covers Letter only. The real `/cv` implementation must repeat
the suppression check at A4.

## Evidence files

Screenshots are in `docs/prototypes/issue-11/screenshots/`:

- `home-light-1440.png`
- `home-dark-1440.png`
- `home-light-1024.png`
- `home-light-768.png`
- `home-light-375.png`
- `home-reduced-motion-1440.png`
- `home-canvas-failure-1440.png`
- `home-no-js-1440.png`
- `home-reading-scroll-1440.png`
- `cv-light-1440.png`
- `cv-dark-1440.png`
- `cv-print.png`

The browser-generated print evidence is
`docs/prototypes/issue-11/ambient-current-cv-print.pdf`.

## Required Impeccable critique

Method: independent dual assessment.

- Design review: no visible design blocker; authored and product-specific,
  because the field is bound to the functional rail rather than used as a
  generic generative backdrop.
- Source detector: 0 findings.
- Rendered detector: intentional metadata/readability advisories only; no
  motion-specific defect.
- Canvas 2D is visually sufficient; Radiant/WebGL would add unjustified
  complexity.

Design blockers: **none visible**.

Production implementation acceptance gates:

1. A real offscreen lifecycle target/test; the fixed full-viewport observer
   cannot naturally become offscreen.
2. An attended 60–90 second sustained-reading pass in both themes.
3. A narrow named-exception contract rather than a general relaxation of the
   one-reveal rule.
4. A4 print suppression when the real CV route exists.

## Signed decision

Keep the locked one-reveal contract as the default and add one named exception
for Ambient Current:

- desktop-only Canvas 2D;
- one homepage motif;
- clipped to extreme margin and rail seam;
- decorative, non-semantic, pointer-transparent, and unfocusable;
- no continuous loop below `lg`;
- immediate static reduced-motion state;
- hidden/offscreen pause;
- capped DPR and frame rate;
- static outer-margin-only CV screen expression;
- complete A4/Letter print suppression.

The spec carries the unresolved runtime checks as production acceptance gates,
not as open design questions. Do not restore or promote this prototype
directly; implement the signed contract as production code with proportional
tests when the homepage ticket reaches implementation.
