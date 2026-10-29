# The board's life (v3)

What moves on the `/path` board on top of its build: ambient motion, the narration's beats,
the arrival, the marker duo, click answers, occasional moments, the landmarks' ink grade and
sound. Spec: §4(d) and §4(e) of `docs/research/path-v3-benchmark.md`. Code lives in
`src/components/path/scene/` (`life.ts`, `beats.ts`, `piece-beats.ts`, `play.ts`,
`moments.ts`, `grade.ts`, and the patches in `paint.ts`) and `src/app/path/sound*.ts*`.

## When it moves

| State          | Ambient, moments                 | Beats                   | Click answers              |
| -------------- | -------------------------------- | ----------------------- | -------------------------- |
| Tour playing   | yes                              | yes                     | yes                        |
| Paused         | frozen where they are            | frozen                  | yes: the visitor asked     |
| Ended          | come to rest after the pull-back | none                    | yes                        |
| Reduced motion | none                             | end state shown at once | a pool of light, no motion |

The pause rule is WCAG 2.2.2's. The suite runs under reduced motion by default, which is
why "a settled scene draws nothing" holds there; with motion the board draws while it lives.

## Ambient

- Grass and tree crowns sway (about 1°, crowns breathe 0.5%) in a vertex patch.
- Water flows; a `surge` beat runs it 4× as fast, a `calm` beat stills its normals.
- Cloud shadows: a 96² value-noise cookie, 15 units a tile, scrolling at (0.34, 0.13) units/s,
  multiplied into the sun's light. Shade 0.34 by day, 0.18 by night.
- The idle pawn squashes 1.6% every 3 s, starting 3 s after it lands.
- Phones grow half the grass and keep the cloud shadows.

## Beats

One table, `beats.ts`, keyed `<step>:<prop>`. A beat moves a piece's handle and the parts it
names (below); a piece lacking them swells whole.

| Cue prop               | Beat                                                                      | ms   | Sound |
| ---------------------- | ------------------------------------------------------------------------- | ---- | ----- |
| home:plateau           | surge: the rivers run                                                     | 2600 | low   |
| home:school            | light                                                                     | 2600 | high  |
| turin:mole             | rise                                                                      | 900  | low   |
| turin:coils            | own: coils swell in turn, rotor spins up 3 turns                          | 1800 | high  |
| switzerland:lake       | calm: the lake stills                                                     | 2800 | low   |
| switzerland:roche-dial | own: needle swings back up and settles                                    | 1400 | high  |
| switzerland:jet-d-eau  | own: plume falls and springs back                                         | 1600 | high  |
| cuneo-2022:schoolroom  | light                                                                     | 2600 | high  |
| cuneo-2022:mvp-window  | own: lights on its first cue, pulses, dims and shutters close on its last | 1500 | high  |
| lille:pipe-loop        | own: a bright slug runs the loop                                          | 2200 | high  |
| lille:clock-face       | own: hand sweeps once round                                               | 1400 | high  |
| lille:belfry           | rise                                                                      | 900  | low   |
| lille:courtyard        | light                                                                     | 2600 | high  |
| now:startup-desk       | own: monitor glows on                                                     | 2000 | high  |
| now:office             | light                                                                     | 2600 | high  |
| next:blank             | own: five slots pulse in turn                                             | 1600 | high  |

The Bisalta has no beat. A `light` on a generated landmark goes through its grade, at most
0.6 and weighted by texel lightness squared, so it reads as lit stone, not a lamp (the first
cut at full strength lit the Bourse like a lantern by night).

### Node names for generated models

A model swapped in for a piece names its parts these to keep its own beat and click answer
(`BEAT_NODE` in `piece-beats.ts`): `coil` (several) and `rotor` (turns on y), `needle`
(z), `glass` and `shutter` (several, hinged on y), `hand` (z), `pipe`, `screen`, `slot`
(several), `plume` (scales on y). The marker's handles are `marker-lorenzo` and
`marker-robot` (`MARKER` in `world.ts`); a model goes inside its handle.

The toy props (v3-toys, `toys.ts`) were generated as static bodies, so their moving parts are
added in code at the model's spots, named as above: the coils' rotor (the coils themselves
are cut out of the fused mesh by angle as it loads), the dial's needle, the window's glass
and two shutters, the clock's hand, the desk's screen and the plinth's five slots. The
parts stand in the model's frame and are never squashed with it. The window's shutters are
built shut over the glass and stand open flat beside it, so its last cue swings them shut.
Every beat was watched at 0.25× on the board on 2026-10-29.

## Arrival

- The landing dips the tile 0.07 units in 55 ms and springs back
  within 350 ms, with 12 dust sprites over 720 ms.
- A landmark rises out of its tile on a spring (about 0.6 s to settle) while the tile's
  grass grows out radially from its foot over 1.2 s, replacing the fold.
- Trees and small props within 1.9 units of the pawn's foot hop once as it passes (600 ms).

## The duo

The figure (`marker-lorenzo`, 1.45 units) and its buddy (`marker-robot`, 0.58 of his
height), toy models since v3-toys; until each arrives the code pawn and robot stand in, so
the duo is never absent. Every gesture moves the handle, so each plays on the model as it did
on the stand-in. A model that arrives while the duo is seen swaps at the top of a hop: the
stand-in rises on a soft spring, the model takes its place stretched at 90 ms, and lands with
a squash at 280 ms, the spring's zero crossing, with no sideways travel. Unseen, or under
reduced motion, it swaps at once.
The buddy follows 130 ms behind on the same path, its hop 0.82 of the figure's height for
its size, stretching 10% in the air, standing 1.05 units to the figure's left. When it lands
they high-five: both lean in, the buddy hops.

## Click answers and moments

Everything here is springs (`play.ts`), so a second click retargets the motion where it is
and a quick repeat within 1.4 s adds 25% more, up to 50%. Three feels: snappy (k 420, c 16)
for taps, soft (180, 15) for gestures, turn (70, 13.5) for headings that land without
swinging.

Clicks, on the shown tile or the duo: figure waves; buddy spins, then jabs, by turns; dial's
needle swings; coils' rotor spins up; sailboat bobs; trees shake; MVP shutters flap and the
glass flashes; the clock's hand sweeps and the post shakes; the slots pulse; the monitor
glows; the plume surges; a landmark squashes, bounces and glints. A click on another tile
still goes there. A fine pointer gets the pointer cursor and a faint pool of lamplight under
the piece. The canvas reports which in `data-path-pointing` (`step` or `piece`).

Moments: every 20–40 s while the board lives and is quiet (no beat, no move, no build), never
the same twice running: the wave, spin or jab, a flock of seven crossing in 2.8 s, and per
tile the plume surging (Switzerland), the boat tacking (Switzerland), the clock chiming
with the belfry shaking (Lille), the Mole glinting (Turin). Skipped: a cloud shadow sweeping a
single tile, since the cookie is board-wide.

## Ink grade

Generated models (textured materials only: the landmarks, and since v3-toys the toy props
and the duo) are pulled toward a ramp from slate through terracotta to the stock by
lightness, and their black point lifted toward the stock: amount 0.08 and lift 0.03 by day,
0.10 and 0.08 by night. It was 0.35 and 0.10 by day, 0.38 and 0.20 by night, for the
photo-textured landmarks; on the toys, already painted in the board's colours, that greyed
them by night. Checked close up on every model in both modes on 2026-10-29: they keep their
colours, the Bourse's brick and the figure's shirt included, by night.

## Sound

See "Sound (v3)" in `docs/path-assets.md`: six synthesized effects and a 20 s bed, 0 bytes.
The engine and its `AudioContext` are made in the Sound switch's click; until then nothing
about sound exists on the page.
