# The `/path` camera

v3's camera rig (ticket v3-camera) flies the self-playing tour as the benchmark's §4(a) lays it
out (`docs/research/path-v3-benchmark.md`). The rig lives in
`src/components/path/scene/camera-rig.ts`. Its timings and framing are pure functions, which
`tests/path-camera.spec.ts` checks without a GPU, and the stage names the current shot in
`data-camera-shot`.

## Shots

A shot is a target on the board, a distance, an elevation, a yaw and a lens. Each phase blends
two shots on an authored curve. A critically damped follow with a 0.12 s half-life runs on top,
so a selection that cuts a curve short still moves smoothly. Distance blends geometrically, so a
pull-back reads as even.

| Phase              | Duration                                                               | Easing                                                          |
| ------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| Opening            | 2.4 s, or 1.2 s when the visit enters at a step other than home        | `easeInOutCubic`, FOV 30° → 24° (a portrait phone stays at 30°) |
| Close-up (dwell)   | The narration plus 0.8 s, at least 5 s                                 | Linear 6° orbit; 1% breathing dolly, sine at 0.15 Hz            |
| Pull back          | 0.9 s, to 2.2× the close-up's distance (×1.3 more on a portrait phone) | `easeInOutCubic`                                                |
| Travel             | 0.56 s a tile, the camera 0.25 s behind the pawn                       | Follow damping, half-life 0.12 s                                |
| Push in            | 1.2 s; the stage reports `settled` at its end                          | `easeOutQuart`                                                  |
| Landing beat       | 0.35 s                                                                 | Spring, bounce 0.2 (a 20% squash)                               |
| Skip               | 0.3 s hold, then a 1.1 s flight in an arc over the board               | `easeInOut`, the site's `cubic-bezier(0.77, 0, 0.175, 1)`       |
| End (after `next`) | 2.0 s, back to the whole board, then held                              | `easeInOutCubic`                                                |
| Reduced motion     | A cut, the old frame crossfading out over 150 ms                       | None: no drift, no breathing, no autoplay                       |

The tour's own advance travels. A pick from the list or a tile, Back, Next and a hash typed by
hand all take the skip flight. `scene-stage.tsx` tells the two apart by whether the hash changed
inside the tour's replace (`isReplacingStep()`). A pause freezes the camera, the pawn and the
build where they are, mid-curve. A pick made while paused plays its flight, then holds still:
the close-up drifts and breathes only while the tour plays. A theme change or a turn made while
paused still plays out. Replay after the end pull-back flies back to `next`'s close-up.

## What was tuned, and why

These were set from recorded video at 1440×900 and 375×812, in light and dark, over three
rounds. The clips are kept in `/tmp/orch-path-v2/camera/`.

- **Yaw: −30° off the board's front, not §4(a)'s 45° diagonal.** Every backdrop stands at the
  back of its tile and the pawn at the front-right. Seen from the right, the pawn stood in
  front of home's school. Seen from the front-left, it stands beside the diorama.
- **Close-up slot: 66% of the stage's safe height.** A diorama does not fill its own bounding
  box. With a 60% slot, round 1 measured home's diorama at about 51% of the frame height. At
  66% it reads at about 60%. The slot sits 6% of the height above centre (10% on a portrait
  phone), and on landscape 6% of the width right of centre, above the caption bar and
  clear of the transport.
- **Travel overlaps its phases.** The hops start 0.63 s into the 0.9 s pull-back, and the
  push-in starts as the last hop does. The pawn therefore lands 0.56 s into the push-in, not in
  its last 0.3 s. Timing the push-in to end 0.3 s after a one-tile landing would start it before
  the pawn has left and, with `easeOutQuart`'s hard start, have the camera at the close-up while
  the pawn is still on the previous tile.
- **The skip's hop.** The pawn's one long hop starts 0.15 s into the flight and lands 0.2 s
  before its end. It rises higher the farther it goes: 1× for one tile, up to 2.2× (`movePose`).
- **The pawn.** It is larger (radius 0.45, height 1.45, from 0.42 and 1.3). It casts a soft
  contact shadow, has a ring on the tile under it, and squashes 20% on landing. Round 1's 0.5 and
  1.65 looked too big beside the dioramas; 0.46 put home's pawn on the tile's front band.
- **Settled.** `settled` now fires at the push-in's end. `data-build-state` still means the
  props are up, and the build rises on into the dwell. `tests/path-camera.spec.ts` proves every
  step's build ends inside its dwell, the shortest one included, however the camera arrived.

## For the lighting

`rig.focus()` returns the current shot's focus in world space: `{ target, radius }`. The target
is the point the camera looks at. The radius is the larger half-extent of the frame at the
target's depth: the half-width on a landscape stage, the half-height on a portrait one. The sun's
shadow frustum can be fitted to it, padded: the camera looks down at 28° to 70°, so the ground it
sees behind the target reaches farther than the radius.

## Open

- §4(a)'s landing beat also asks for a 2 cm tile thump and a dust puff. Neither is built.
- The stills are landscape renders. On a phone the taller stage shows them `object-contain`.
