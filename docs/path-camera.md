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
| Lean (duo moment)  | 0.7 s in, held 2.4 s, 0.9 s out; 30% closer, 60% toward the duo        | `easeInOutCubic`; only in a dwell, never under reduced motion   |
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

## The light and the lens follow the shot

`rig.focus()` returns the current shot's focus in world space: `{ target, radius, wide }`. The
target is the point the camera looks at. The radius is the larger half-extent of the frame at the
target's depth: the half-width on a landscape stage, the half-height on a portrait one. `wide` is
that radius as a share of the whole-board shot's: about 0.3 to 0.5 at a close-up, 1 at the
overview.

Each draw (`runtime.ts`, `followShot`) hands it to the lit board's chain:

- **The sun's shadow** (`lighting.setFocus`) is fitted to the target and radius. It is refitted only
  when the target moves or the radius crosses a step of about 9%, so a close-up's breathing does
  not make the shadow's texels swim. A close-up's 2048² map then covers a tile and its
  neighbours, and its contact shadows read crisp.
- **The tilt-shift's sharp band** (`post.setFocus`) is centred on the target's height on screen,
  so a close-up's subject is never what is blurred. Its strength follows `wide`
  (`tiltShiftFor`): at a close-up a band half the stage high stays sharp, and the blur outside it
  is mixed in at 60%. From the travel shot out to the whole board it fades to 15% over a band
  wider than the stage, which leaves that shot all but sharp. v3-light's fixed band blurred the
  upper half of a close-up, Lille's subject included.

Night has a lantern (v3-emil-polish, `lighting.ts`): a warm point light hung over the
focus target. It sits 2.4 units up plus a quarter of the radius, and reaches 3.2 units or
1.6 radii, whichever is larger. It is at 0 by day and rises with the night mix. It lights the
dwell's tile so the subject reads in colour at night, the robot's face included on a phone.
The night also keeps more of the day: the sun at 0.85 and the sky at 0.4 of their day
strength, the environment at 0.13, and the grade's saturation at 1.02.

A turn refits the shots every frame it moves, since the fit depends on the board's turn. That
costs about 0.02 ms a frame, measured. The fit cache keeps one entry per shot, its latest
turn, so a turn no longer floods it and flushes the shots at rest.

A landmark fills its layout box only as far as its proportions allow. Turin's Mole is 3.3 high in
the layout and about 2.4 as built. So the runtime measures each piece as it builds it
(`pieceHeight`), and a close-up frames what stands, not the box. Framed on the box, Turin's
close-up held a quarter of the stage of empty sky above the Mole.

## Open

- §4(a)'s landing beat also asks for a 2 cm tile thump and a dust puff. Neither is built.
- The stills are landscape renders. On a phone the taller stage shows them `object-contain`.
