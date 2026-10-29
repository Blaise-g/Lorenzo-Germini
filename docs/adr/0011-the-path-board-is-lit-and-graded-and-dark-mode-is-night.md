# The path board is lit and graded through a post chain, and dark mode is night

Decided in v3's light ticket (v3-light, 2026-10-29), from the v3 benchmark's §4(c) and §4(f).
It amends ADR-0010's baseline light and token list. It supersedes ADR-0009's supersampling:
SMAA now does that job.

**Superseded in part by ADR-0012** (v3-toys) for the GPU budget: the toys' textures raised it
to 440 MB. The light, the grade, the post chain and night stand, and apply to the toys.

v3-world left the board under a plain baseline light: a hemisphere, a 1024² PCF sun and a small
room, with nothing graded. Beside the benchmark's references it read flat and evenly lit. Dark
mode was the same board on a dark table. That read as a darker print, not as a scene.

What ships:

- **One light, mixed from the path tokens by one value**, 0 for day and 1 for night
  (`lighting.ts`).
  - Day is a warm sun, high over the camera's left shoulder.
  - Night is a cool moon, lower and from behind on the right, with a slate sky and the room
    turned down.
  - A theme change crossfades the light with the paint over `THEME_MS`.
  - The sun's shadow frustum is fitted to one box, `shadowBounds()`: the whole board today, and
    the shot's focus once the camera rig passes it one.
  - The shadow map is back at 2048².
- **Dark mode is night on the same board.** Light and dark share the board's colours and differ
  only in the fog, which is the table under the board.
  - By night most windows are lit, along with the desk monitor and the pipe loop's flow, and
    bloom carries them (`paint.ts`, `lamp`).
  - About one window in three stays dark.
- **A post chain** (`post.ts`; pmndrs `postprocessing` and `n8ao`):
  1. N8AO at half resolution;
  2. bloom over a luminance threshold past 1, which in practice leaves only the lit things
     glowing. It selects by brightness, not by object, so the day's bloom is kept weak;
  3. a tilt-shift band;
  4. AgX;
  5. a 16³ LUT graded from the palette, for day or night;
  6. soft-light paper grain, frozen under reduced motion;
  7. a vignette;
  8. the page's ground, where the board is not;
  9. SMAA.

  The canvas sits opaquely on the page, so wherever the board is not drawn, the chain returns the
  page's own ground, shaded by the table's shadow. A grade or vignette over an empty table would
  otherwise draw the stage as a box.

- **SMAA replaces supersampling.** A screen is drawn at its own pixel ratio, at least 1. A
  desktop is capped at 2 and a phone at 1.5. Keeping ADR-0009's floor of 2 would cost every post
  pass four times as much on a ratio-1 screen.
- **A governor drops quality when frames run long.** If a quarter of a 24-frame window runs past
  20 ms, it drops AO first, then pixel ratio to 75% and then 50%, and it never steps back up. A
  phone starts without AO and with half-size bloom.
- **Two tokens are added: `--path-felt` (the board's baize) and `--path-ink-sun` (the third ink,
  for bands and lamplight).** That makes six path tokens. Each is set in `@theme`, `.dark` and
  print.
- **The GPU budget is raised from 64 MB to 360 MB** (`GPU_BUDGET_MB` in `drawing-buffer.ts`;
  `docs/path-measurements.md`). The post chain holds about 78 bytes of targets per drawing
  pixel, on top of the canvas's 8. At the pixel cap that comes to 334 MB, against 331.5 MB
  measured.

## Considered options

**Keep the renderer's own tone mapping and add no post.** Rejected. It cannot give the board
contact AO, bloom on the lit windows or a grade. Those are what the benchmark found missing.

**An alpha canvas over the page.** Rejected. The canvas covers the step's still, which shows
while the scene loads and when it falls back. An alpha canvas would show the still through it.
The chain draws the page's ground instead.

**Make night a darker grade of the day.** Rejected. A dimmed day reads as an underexposed photo.
A night with lit windows gives dark mode something to show.

**Keep the 64 MB budget by dropping AO or the half-float buffers.** Rejected. AO is most of the
solid look. Without half-float, bloom has nothing over 1 to find, and AgX has no range to roll
off.

## Consequences

- The scene's JavaScript is about 159 KB larger (`postprocessing` and `n8ao`). The cold transfer
  per scene is 842 KB, under 1.5 MB.
- A landmark model now has about 26 MB of GPU headroom at the pixel cap (360 MB against 334 MB).
- On a ratio-1 screen the board is drawn at ratio 1, so its edges are smoothed by SMAA, not by
  supersampling.
- The stills are rendered by the same chain, so they carry the grade and the grain.
