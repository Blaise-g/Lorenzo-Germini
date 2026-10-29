# The 3D path's measurements

#152 measures the prototype of `/path` (home and Lille, the scenes #148 and #149 built, with #150's
voice) against the budgets in #141's acceptance and research §9 and §11
(`docs/research/experience-rethink.md`). The figures stay here. "How this was made" at the foot of
`/` describes them in words, because decision 10 keeps numbers off the page.

Measured 2026-10-29 at `15e2380` plus #152's commit, on a production build (`bun run build`, then
`next start -p 3211`). KB here is 1,024 bytes.

## The camera (v3)

v3's camera rig (ticket v3-camera, `docs/path-camera.md`) flies the tour in close-ups, and the
stage is taller on a phone: `clamp(20rem, 48svh, 34rem)`, against `clamp(16rem, 80vw, 26rem)`.
The rig also fits the lit board's sun shadow and tilt-shift to each shot.

Measured 2026-10-29 on a production build of the v3-camera tree at `b89df3b`, with v3-light and
the generated landmarks merged in (`next build`, then `next start -p 3285`). As for the lit
board below: muted Chromium on the machine's GPU (ANGLE Metal, Apple M5), the cache disabled,
the same units, and the canvas counted at 8 bytes a pixel.

| Budget                   | Budget | Measured                                                        | Within                   |
| ------------------------ | ------ | --------------------------------------------------------------- | ------------------------ |
| Transfer per scene, cold | 1.5 MB | 3,098.8 KB, of which the landmark models are 2,246.3 KB         | **No**, by the landmarks |
| GPU memory, live         | 360 MB | 125.6–380.4 MB; 348.0 MB at 1440×900 ×2                         | **No** at 2560×1440 ×2   |
| Each still               | 150 KB | 28.6–70.1 KB; the largest `lille-light.webp`                    | Yes                      |
| Frame time, with motion  | 33 ms  | Median 8.3 ms, 95th percentile 8.9–9.3 ms, at every size tested | Yes                      |

**The camera adds nothing measurable; the landmarks are over both budgets.** The same build,
with `landmarks.json` answered with an empty index so every piece stands in, gives the lit
board's own figures below to 0.1 MB of textures at every size (266.5 MB at 1440×900 ×2,
against 266.6). The seven landmark models add 49 MB of textures and 2.2 MB of transfer. That
takes 2560×1440 ×2 to 380.4 MB, 20 MB past the 360 MB budget, which left about 26 MB for a
landmark's textures. Neither is the rig's to fix: they are the landmarks ticket's, and are
listed for it below.

**Transfer.** `#next`, cold at 1440×900 ×2, the larger of `#home` and `#next` by 1.4 KB:

- JavaScript 512.8 KB, which carries v3-light's post chain;
- fonts 255.7 KB;
- the landmark models 2,246.3 KB;
- the still, `grain.webp` and `landmarks.json` 54.6 KB.

**GPU memory**, counted as below, once Lille has built under reduced motion. "Stand-ins" is
the same build with an empty landmark index.

| Viewport (CSS px, pixel ratio) | Stage (CSS px) | Canvas (device px) | Textures | Buffers | Renderbuffers | Drawing buffer | Total, MB (MiB) | Stand-ins, MB |
| ------------------------------ | -------------- | ------------------ | -------- | ------- | ------------- | -------------- | --------------- | ------------- |
| 375×812, ×3                    | 375×390        | 750×780            | 115.7    | 3.9     | 1.4           | 4.7            | 125.6 (119.8)   | 91.6          |
| 1280×720, ×2                   | 1200×375       | 2400×750           | 222.4    | 4.6     | 2.6           | 14.4           | 244.0 (232.7)   | 196.4         |
| 1440×900, ×1                   | 1360×555       | 1360×555           | 142.6    | 4.6     | 1.5           | 6.0            | 154.8 (147.6)   | 107.2         |
| 1440×900, ×2                   | 1360×555       | 2720×1110          | 315.5    | 4.6     | 3.8           | 24.2           | 348.0 (331.9)   | 300.5         |
| 1920×1080, ×1                  | 1840×735       | 1840×735           | 188.2    | 4.6     | 2.1           | 10.8           | 205.8 (196.2)   | 158.2         |
| 2560×1440, ×2                  | 2480×1095      | 2774×1225          | 344.4    | 4.6     | 4.2           | 27.2           | 380.4 (362.7)   | 332.8         |

The phone row was taken without touch emulation, so the page did not take the phone's quality
rung: its canvas is at ratio 2, not 1.5, and it keeps AO.

**Frame time.** From `requestAnimationFrame` gaps at 375×812 ×3, 1440×900 ×2 and 2560×1440 ×2,
over 2.5 s of Lille's close-up drifting while the tour plays, 2.5 s of a Replay of its build,
and 1.5 s of the skip flight to Turin: a median of 8.3 ms (the display's 120 Hz) in every
sample, and a 95th percentile of 8.9–9.3 ms. **Rendering is no longer idle while the tour
plays**: the close-up drifts and breathes through the dwell, so the board draws every frame
until the tour is paused or ends. Paused, after the end pull-back, and under reduced motion it
draws only on demand, as before.

**Stills.** All 14 were rendered again by `generate:path-stills` at each step's close-up,
through the post chain and with the landmarks, at 1440×900 ×1.5: 2040×833, 28.6–70.1 KB each.

## The lit board (v3-light)

v3-light put the solid board through a post chain and made dark mode night (ADR-0011):

1. N8AO at half resolution;
2. bloom;
3. tilt-shift;
4. AgX;
5. a palette LUT;
6. grain;
7. a vignette;
8. the page's ground;
9. SMAA.

Measured 2026-10-29 on a production build of the v3-light tree (`next build`, then
`next start -p 3266`). Chromium was muted and ran on the machine's GPU (ANGLE Metal, Apple M5),
with the cache disabled. Units are as above.

| Budget                   | Budget     | Measured                                                        | Within |
| ------------------------ | ---------- | --------------------------------------------------------------- | ------ |
| Transfer per scene, cold | 1.5 MB     | 842.3 KB                                                        | Yes    |
| GPU memory, live         | **360 MB** | 59.0–331.5 MB; 299.1 MB at 1440×900 ×2                          | Yes    |
| Each still               | 150 KB     | Largest 38.1 KB (`cuneo-2022-light.webp`)                       | Yes    |
| Frame time, 95th pct     | ~20 ms     | 16.7–16.8 ms at the display's 60 Hz; 4.5–5.0 ms drawn, uncapped | Yes    |

**The GPU budget is raised from 64 MB to 360 MB.** The post chain needs targets the size of the
drawing buffer, and v2's budget held only the canvas and its textures:

- the composer's two half-float buffers;
- N8AO's output;
- three depth textures;
- SMAA's edges and weights;
- the half-size targets of AO, bloom, tilt-shift and the ground's half-float copy.

The chain holds about 78 bytes per drawing pixel (`POST_BYTES_PER_PIXEL`), on top of the
canvas's 8, and 42 MB does not scale with the canvas. At the 3.4-million-pixel cap that
comes to 334 MB. The budget leaves about 26 MB for a landmark model's textures.
`tests/path-scene-contract.spec.ts` checks that the per-pixel model covers the measured totals
and that the cap keeps the budget.

Two cuts brought the first measurement, 371.6 MB at 1440×900 ×2, down to 299.1 MB:

- N8AO found the table's transparent shadow catcher on every frame and kept two full-size
  half-float transparency targets for it, one with a depth texture. The catcher writes no depth,
  so takes no occlusion, and detection is now off.
- The canvas has no depth or stencil, since the composer's buffers carry the depth. It holds
  8 bytes a pixel, not 12.

The shadow map went back to 2048² (33.6 MB) for the contact shadows.

| Viewport (CSS px, pixel ratio) | Canvas (device px) | Quality at start | Textures | Buffers | Renderbuffers | Drawing buffer | Total, MB |
| ------------------------------ | ------------------ | ---------------- | -------- | ------- | ------------- | -------------- | --------- |
| 375×812, ×3 (phone)            | 562×450            | No AO, ×1.5      | 51.6     | 4.6     | 0.8           | 2.0            | 59.0      |
| 1280×720, ×2                   | 2400×750           | Full             | 173.5    | 4.6     | 2.6           | 14.4           | 195.1     |
| 1440×900, ×1                   | 1360×555           | Full             | 93.7     | 4.6     | 1.5           | 6.0            | 105.9     |
| 1440×900, ×2                   | 2720×1110          | Full             | 266.6    | 4.6     | 3.8           | 24.2           | 299.1     |
| 1920×1080, ×1                  | 1840×735           | Full             | 139.3    | 4.6     | 2.1           | 10.8           | 156.9     |
| 2560×1440, ×2                  | 2774×1225          | Full             | 295.5    | 4.6     | 4.2           | 27.2           | 331.5     |

A ratio-1 screen is now drawn at ratio 1, not supersampled at 2, because SMAA smooths the edges.
A phone is capped at ratio 1.5.

**Frame time.** The rAF gaps were measured over a 2.5 s Replay of Lille's build. With vsync on,
every viewport above gave a median of 16.7 ms and a 95th percentile of 16.7–16.8 ms. This run's
display, and a blank page, both ran at 60 Hz. v3-world's 8.3 ms was at 120 Hz, so the two cannot
be compared directly.

To see under the vsync, Chromium was run again with `--disable-gpu-vsync
--disable-frame-rate-limit`, counting only gaps over 1 ms, the frames the board drew:

| Viewport                 | Median  | 95th percentile |
| ------------------------ | ------- | --------------- |
| 375×812 ×3, phone rung   | 2.8 ms  | 3.8 ms          |
| 1280×720 ×2              | 3.4 ms  | 5.1 ms          |
| 1440×900 ×1              | 3.1 ms  | 4.3 ms          |
| 1440×900 ×2, three runs  | 3.4–6.8 | 4.5–8.1 ms      |
| 1920×1080 ×1             | 2.9 ms  | 3.5 ms          |
| 2560×1440 ×2, three runs | 4.1–4.3 | 4.9–5.0 ms      |

The 1440×900 ×2 run of 6.8 ms and 8.1 ms was the first run, cold. The two repeats gave
3.4–3.6 ms and 4.5–4.7 ms.

**Per pass.** These are from `EXT_disjoint_timer_query_webgl2`, read on the dev server at
1440×900 ×2, as the median ms per pass. The queries overlap on ANGLE Metal: they sum to about
21 ms against a 3.5 ms frame. So the column to read is the share, not the ms.

| Pass                          | Timer ms | Share |
| ----------------------------- | -------- | ----- |
| Render (scene and shadow map) | 1.4      | 7%    |
| N8AO, half resolution         | 3.0      | 14%   |
| Ground copy, half size        | 2.9      | 14%   |
| Bloom and tilt-shift          | 6.2      | 30%   |
| AgX, LUT, grain and vignette  | 3.3      | 16%   |
| SMAA and the ground           | 3.9      | 19%   |

**The governor.** If a quarter of a 24-frame window runs past 20 ms, it drops AO, then
pixel ratio to 75% and then 50%. It acts within the fallback's 60-frame sample, so a GPU a
little too slow sheds AO in time for the later frames to bring the median under 33 ms. The
sample still counts the frames before the step, so a GPU far too slow goes to the stills as
before. No rung was taken at any size here.

**Stills.** All 14 were rendered again by `generate:path-stills` through the post chain:
2040×833, 25.0–38.1 KB each. Grain and the night grade did not push any of them near 150 KB.

## The solid board (v3)

v3's board (ticket v3-world) replaced the printed cards with a board modelled in code: thick
bevelled tiles, solid props and landmark stand-ins, rough `MeshStandardMaterial`s under a
hemisphere light, a soft-shadowed sun and a small PMREM room (ADR-0010).

Measured 2026-10-29 on a production build of the v3-world tree (`next build`, then
`next start -p 3264`). Chromium was muted and ran on the machine's GPU (ANGLE Metal, Apple M5).
The cache was disabled. Units are as below for v2: KB is 1,024 bytes, and an MB is a million
bytes.

| Budget                   | Budget | Measured                                                 | Within |
| ------------------------ | ------ | -------------------------------------------------------- | ------ |
| Transfer per scene, cold | 1.5 MB | 681.5 KB                                                 | Yes    |
| GPU memory, estimated    | 64 MB  | 29.2–57.9 MB (27.9–55.2 MiB); 53.3 MB at 1440×900 ×2     | Yes    |
| Each still               | 150 KB | Largest 36.5 KB (`cuneo-2022-dark.webp`)                 | Yes    |
| Frame time, a build      | 33 ms  | Median 8.3 ms, 95th percentile 8.9–9.1 ms, at every size | Yes    |

**Transfer.** Every landing still loads the same files. `/path#home`, `#lille` and `#next`, cold
at 1440×900 ×2, came within 1.5 KB of each other. The figures below are `#next`, the largest:

| What                                         | KB    |
| -------------------------------------------- | ----- |
| The `/path` HTML                             | 17.2  |
| Five WOFF2 fonts                             | 255.7 |
| CSS                                          | 12.3  |
| JavaScript, Next's and the route's, three.js | 348.3 |
| `grain.webp` and `landmarks.json`            | 12.0  |
| The step's still, behind the canvas          | 36.0  |
| **Total**                                    | 681.5 |

The cards' 735.6 KB is gone. The JavaScript grew 38.8 KB, for `GLTFLoader`, the meshopt
decoder, `RoomEnvironment` and the board's own code. While `landmarks.json` is `{}`, no model
is fetched. Each model the landmark package ships adds its own bytes, and it then counts against
the same 1.5 MB.

**GPU memory** is now counted as what is live once Lille has built. The same wrapped calls as
before are used, but a deleted texture, buffer or renderbuffer is subtracted, and each texture is
sized by its own format (half-float targets at 8 bytes a texel). The drawing buffer is unchanged:
12 bytes a canvas pixel.

| Viewport (CSS px, pixel ratio) | Canvas (device px) | Textures | Buffers | Renderbuffers | Drawing buffer | Total, MB (MiB) |
| ------------------------------ | ------------------ | -------- | ------- | ------------- | -------------- | --------------- |
| 375×812, ×3                    | 1125×900           | 10.3     | 6.0     | 0.8           | 12.2           | 29.2 (27.9)     |
| 1280×720, ×2                   | 2400×750           | 10.3     | 6.0     | 0.8           | 21.6           | 38.7 (36.9)     |
| 1440×900, ×1                   | 2720×1110          | 10.3     | 6.0     | 0.8           | 36.2           | 53.3 (50.8)     |
| 1440×900, ×2                   | 2720×1110          | 10.3     | 6.0     | 0.8           | 36.2           | 53.3 (50.8)     |
| 1920×1080, ×1                  | 2917×1165          | 10.3     | 6.0     | 0.8           | 40.8           | 57.9 (55.2)     |
| 2560×1440, ×2                  | 2774×1225          | 10.3     | 6.0     | 0.8           | 40.8           | 57.9 (55.2)     |

The first v3 build was over the budget, at 91.9 MB at 1440×900 ×2:

- **The sun's 2048² shadow map** cost 33.6 MB: an RGBA colour target and a depth texture, each
  16.8 MB. It is now 1024², at 8.4 MB in all. The contact shadows were checked at 1440×900 and
  still read soft and a texel or two wide.
- **The PMREM room** was blurred at 256 and its generator was kept until dispose. That cost two
  768×1024 half-float targets, 12.6 MB, and a depth renderbuffer. It is now blurred at 128 into
  a 384×512 map, and the generator is freed at once.

The stage is wider than in v2's measurement: 1360×555 at 1440×900, against 920×678. Its
drawing buffer is therefore 36.2 MB, not 29.9 MB, so a model's textures have about 10 MB of
headroom at the largest stages. The stage's layout is the overlay's, not this ticket's.

**Frame time.** From `requestAnimationFrame` gaps over a 2.5 s Replay of Lille's build on the
GPU: a median of 8.3 ms (the display's 120 Hz), and a 95th percentile of 8.9–9.1 ms, at
375×812 ×3, 1280×720 ×2, 1440×900 ×1 and ×2, and 2560×1440 ×2. Rendering is still on demand: the
board draws only while something moves, so it costs nothing when settled. The water and the
grass move only while it draws. Always-on ambient motion is for a later package (W5).

**Stills.** All 14 were rendered again by `generate:path-stills` from the solid board, settled on
each step, at 1440×900 ×1.5, after the shadow map went to 1024²: 2040×833, 33.2–36.5 KB each
(492.9 KB in all), last rendered after the review's fixes to the water and the rise. The transfer above was measured with the first render, whose `next-light.webp`
was 36.0 KB, against 35.7 KB now.

## The board (v2)

The one-scene runtime was replaced by one 3D paper board (v2's board ticket): seven printed tiles
whose die-cut cards fold up, drawn through an ink-separation shader (ADR-0009).

Re-measured 2026-10-29 for v2 polish, round 2, on a production build of the round-2 tree (`bun
run build`, then `next start -p 3241`), with the method below, except that Chromium ran on the
machine's GPU (ANGLE Metal, Apple M5) rather than SwiftShader.

**Units.** KB is 1,024 bytes. The GPU budget is **64 MB of a million bytes each, 64,000,000
bytes**, and GPU figures are given in MB of that size, with MiB (1,024² bytes) beside them. v2's
first report gave 61.4 "MB" against the budget; that was 61.4 MiB, which is 64.4 MB, over it.

| Budget                   | Budget | Measured                                             | Within |
| ------------------------ | ------ | ---------------------------------------------------- | ------ |
| Transfer per scene, cold | 1.5 MB | 1,396.8 KB                                           | Yes    |
| GPU memory, estimated    | 64 MB  | 30.5–59.1 MB (29.1–56.4 MiB); 48.3 MB at 1440×900 ×2 | Yes    |
| Each still               | 150 KB | Largest 65.1 KB (`lille-light.webp`)                 | Yes    |
| Frame time, a build      | 33 ms  | Median 8.3 ms, 95th percentile 9.1 ms, at every size | Yes    |

Every step is a tile on the one board, so every landing loads the same thing: the page, the
runtime, every card and one still. `/path#home`, `#lille` and `#next` arriving cold, at
1440×900 ×2 (the three landings were within 0.4 KB of each other):

| What                                         | KB      |
| -------------------------------------------- | ------- |
| The `/path` HTML                             | 17.7    |
| Five WOFF2 fonts                             | 255.7   |
| CSS                                          | 12.2    |
| JavaScript, Next's and the route's, three.js | 309.5   |
| The 21 card files and `grain.webp`           | 735.6   |
| The step's still, behind the canvas          | 65.4    |
| **Total**                                    | 1,396.8 |

The rows other than the still are those of the previous measurement, unchanged to the 0.1 KB.

GPU memory, from wrapping `texStorage2D`, `texImage2D`, `bufferData` and `renderbufferStorage*`
with the whole board built: 17.5 MiB (18.35 MB) of uploads, textures counted as RGBA with a third
more for mipmaps, the 768² shadow map and the hinge tabs' one 256×40 separation included. The
drawing buffer is the canvas in device pixels at 12 bytes a pixel (`drawing-buffer.ts`): colour
and packed depth-stencil, 4 bytes each, and the compositor's copy of the last frame, 4 more.

| Viewport (CSS px, pixel ratio) | Stage (CSS px) | Canvas (device px) | Ratio drawn | Drawing buffer | Total, MB (MiB) |
| ------------------------------ | -------------- | ------------------ | ----------- | -------------- | --------------- |
| 375×812, ×3                    | 375×300        | 1125×900           | 3           | 12.2 MB        | 30.5 (29.1)     |
| 1280×720, ×2                   | 760×498        | 1520×996           | 2           | 18.2 MB        | 36.5 (34.8)     |
| 1440×900, ×1                   | 920×678        | 1840×1356          | 2           | 29.9 MB        | 48.3 (46.1)     |
| 1440×900, ×2                   | 920×678        | 1840×1356          | 2           | 29.9 MB        | 48.3 (46.1)     |
| 1920×1080, ×1 (computed)       | 1336×858       | 2301×1478          | 1.72        | 40.8 MB        | 59.1 (56.4)     |
| 2560×1440, ×2                  | 1976×1218      | 2348×1447          | 1.19        | 40.8 MB        | 59.1 (56.4)     |

**How the board got sharp inside 64 MB (round 2).** Round 1 drew the board at about one device
pixel per CSS pixel, under the stage-wide step list and panel, so a 1440×900 ×2 screen showed it
soft. Round 2 made four changes:

- **No multisampling.** The renderer is created with `antialias: false`. 4× multisampled colour
  and depth cost 36 bytes a pixel; without it a pixel costs 12. The edges are antialiased instead
  by drawing at ratio 2 at least, so a ratio-1 screen gets each pixel as the average of four
  (ADR-0009).
- **Mipmaps and anisotropy.** Every card texture is mipmapped (already counted in the uploads)
  and sampled with anisotropy min(8, the GPU's limit), so cards seen at a slant stay crisp
  without more pixels.
- **A smaller shadow map.** 768² rather than 1024²: 1.8 MB less at 4 bytes a texel, for a
  shadow that is soft and a few pixels wide on screen.
- **A cap for large stages only.** `MAX_DRAWING_PIXELS` is 3.4 million: 40.8 MB of buffer and
  59.1 MB in all. The 1440×900 stage at ratio 2 is 2.5 million, so it draws at the screen's own
  sharpness. A stage over 850,000 CSS px draws at less than ratio 2: 1920×1080's at 1.72
  (computed from its measured stage, not measured on the GPU), 2560×1440's at 1.19. Drawing
  1920×1080's stage at ratio 2 would take 55.0 MB of buffer and 73.4 MB in all, over the
  budget, so the cap cannot start only above 2560 wide.

`tests/path-scene-contract.spec.ts` checks this arithmetic in MB for these stages, and that the
1440×900 ×2 stage draws at ratio 2.

Frame time, from `requestAnimationFrame` gaps over a 2.5 s Replay of Lille's build on the GPU:
a median of 8.3 ms (the display's 120 Hz) and a 95th percentile of 8.9–9.1 ms at 1440×900 ×2,
2560×1440 ×2 and 375×812 ×3, so drawing four times the pixels did not cost frames on this
machine. A slower GPU, as ratio-1 screens tend to have, is not measured; the frame-rate fallback
is what guards it.

Stills: one per step and mode, all 14 rendered by `generate:path-stills` from the board settled on
the step at 1440×900 ×1.5, with the board's tabs hidden while the canvas is captured: 1380×1017,
60.5–65.1 KB each, 880 KB in all.

The frame-rate fallback is unchanged. In SwiftShader with five test workers sharing the CPU, the
board draws at 50–75 ms a frame, and the 33 ms sample rightly shows the stills; on the GPU the same
five draw at the display's 8.3 ms. The WebGL specs run on the GPU for that reason, and the
fallback's own test fakes the frame clock.

## The prototype (#152)

The rest of this report is #152's, for the prototype's two scenes, kept for the record. Its
models, its home stills and its token names are gone.

## Summary

| Budget                                   | Budget | Measured                                  | Within |
| ---------------------------------------- | ------ | ----------------------------------------- | ------ |
| Transfer per scene: home, arriving cold  | 1.5 MB | 592 KB                                    | Yes    |
| Transfer per scene: Lille, arriving cold | 1.5 MB | 766 KB (183 KB on top of home)            | Yes    |
| GPU memory, estimated                    | 64 MB  | 13.6–56.7 MB (56.7 MB on a 2560×2 screen) | Yes    |
| Each still                               | 150 KB | Largest 29.7 KB (`lille-light.webp`)      | Yes    |
| Everything opened                        | 8 MB   | About 1.01 MB, runtime and decoders in    | Yes    |
| Each voice clip (#150's target)          | ~60 KB | `lille` 63.0 KB and `now` 97.2 KB: over   | **No** |

GPU memory was over budget on a 2560-wide screen at pixel ratio 2 (74.3 MB) until the runtime capped
the drawing buffer's pixel count; see [GPU memory](#gpu-memory). Two voice clips are over #150's ~60 KB target for a clip, which is
not one of #141's budgets. They still count in the 8 MB total.

## How it was measured

A Playwright script outside the repository drove Chromium (muted, SwiftShader WebGL) at a
1440×900 viewport and device pixel ratio 2, with the cache disabled. It read every response's
`encodedDataLength` from the DevTools protocol, which is the compressed bytes on the wire,
headers included.

1. Open `/path#home` cold and wait for `data-build-state="built"`. Everything fetched is home's
   transfer.
2. Click Lille and wait for the build again. Everything fetched is what Lille adds.
3. Lille cold is step 1 minus home's still plus step 2: the route, the runtime and the fonts are
   the same whichever scene a visitor lands on.

The scene rendered in WebGL (`data-scene-mode="webgl"`), not the stills, in both steps.

GPU memory is an estimate, not a reading: a browser does not report it. The same script wrapped
`bufferData`, `texImage2D`, `texStorage2D` and `renderbufferStorage*` to add up what the page
uploaded, and the drawing buffer is computed from the canvas size and the renderer's settings.

## Transfer per scene

Home, arriving cold at `/path#home` (592.1 KB):

| What                                                            | KB    |
| --------------------------------------------------------------- | ----- |
| The `/path` HTML                                                | 16.3  |
| Five WOFF2 fonts                                                | 255.7 |
| CSS                                                             | 10.9  |
| Next's runtime and the route's chunks                           | 88.8  |
| Shared chunk, also loaded by `/` (`55c0553d1592e6ab.js`)        | 68.9  |
| The three.js runtime chunk, loaded only for a scene (`f0f289…`) | 142.4 |
| `home-1-light.webp`, the still behind the canvas                | 9.1   |

Lille, on top of home (183.4 KB):

| What               | KB   |
| ------------------ | ---- |
| `lille-belfry.bin` | 71.0 |
| `lille-bourse.bin` | 82.4 |
| `lille-light.webp` | 30.0 |

Decoders: the models were the repository's own quantised format (`model-format.ts`, deleted with them in v2), decoded by code
inside the runtime chunk, so there is no separate decoder download (no Draco or meshopt WASM). The
stills are WebP, decoded by the browser. The fonts are the site's own and are counted because a
cold visitor pays for them.

## GPU memory

The drawing buffer dominates, and it follows the stage's size in device pixels. The runtime caps
the pixel ratio at 1.5, and lowers it further on a stage that would otherwise hold more than 1.6
million device pixels (`drawing-buffer.ts`), so the scene is drawn a little softer there instead. With `antialias: true` it holds 4× multisampled colour and depth plus the
resolved colour: about 36 bytes a pixel. Uploaded buffers and textures for home and Lille together
add about 1.8 MB (0.6 MB of vertex and index buffers, 1.2 MB of textures counted as RGBA with a
third more for mipmaps). Those are cumulative uploads, so an upper bound on what is resident.

| Viewport (CSS px, pixel ratio)                                             | Canvas (device px) | Drawing buffer | Total, about | Within 64 MB |
| -------------------------------------------------------------------------- | ------------------ | -------------- | ------------ | ------------ |
| 390, ×3 (phone)                                                            | 513×672            | 11.8 MB        | 13.6 MB      | Yes          |
| 1440, ×2 (the measured run; the other rows are computed from their canvas) | 1464×567           | 28.5 MB        | 30.3 MB      | Yes          |
| 3840, ×1                                                                   | 3376×448           | 51.9 MB        | 53.7 MB      | Yes          |
| 2560, ×2 (pixel ratio capped at 1.3054 by the pixel count)                 | 2736×584           | 54.9 MB        | 56.7 MB      | Yes          |

MB here is 1,024² bytes. Before the pixel cap, the 2560×2 stage was drawn at the full 1.5 ratio:
3144×672 device pixels, 72.5 MB of drawing buffer and 74.3 MB in all, over budget. The cap's
figures are computed, not re-measured: the stage is 2096×448 CSS px at that size, the ratio is
√(1,600,000 ÷ (2096 × 448)) ≈ 1.3054, three.js floors each side to 2736×584 device pixels, and
2736 × 584 × 36 bytes is 54.9 MB, plus the 1.8 MB of uploads. `tests/path-scene.spec.ts` checks
the canvas at a 2560×1440 viewport with a device pixel ratio of 2, and
`tests/path-scene-contract.spec.ts` checks the arithmetic. The other three rows are under the cap,
so they are unchanged. This is measured in SwiftShader, not on a real GPU, and the browser's own
compositing buffers are not counted.

## Stills

| Still               | KB   | Budget |
| ------------------- | ---- | ------ |
| `home-1-light.webp` | 8.9  | 150 KB |
| `home-1-dark.webp`  | 4.2  | 150 KB |
| `home-2-light.webp` | 10.1 | 150 KB |
| `home-2-dark.webp`  | 5.1  | 150 KB |
| `home-3-light.webp` | 10.6 | 150 KB |
| `home-3-dark.webp`  | 5.6  | 150 KB |
| `lille-light.webp`  | 29.7 | 150 KB |
| `lille-dark.webp`   | 21.8 | 150 KB |
| **All stills**      | 96.0 |        |

`home-2` and `home-3` were rendered again for the MVP window's label (see the asset log); their
sizes here are the new files.

File sizes on disk. Each is also checked against the budget by `generate:path-stills` and
`tests/path-lille.spec.ts`.

## Everything opened

Home cold (592.1 KB), then Lille (183.4 KB), then every other still in both modes (57.4 KB, file sizes), then
every voice clip played (`home` 9.4, `cuneo-2022` 33.7, `lille` 63.0, `now` 97.2: 203.3 KB, file
sizes) comes to about **1,036 KB, 1.01 MB**, against 8 MB. The three.js runtime and the decoders
are in it, as above. The voice manifest (1.8 KB) is in the route's data.

## Voice clips

The clips were re-encoded from 24 kbps AAC to mono HE-AAC at 16 kbps (`afconvert -d aach -b 16000
-c 1`, in `generate:path-voice`). Plain AAC at 16 kbps or less resamples the voice to 12 kHz or
less; HE-AAC codes the lower band at 11.025 kHz and rebuilds the top from it, so the decoded voice
stays at 22.05 kHz. Safari, Chromium and Firefox decode HE-AAC in MP4.

| Clip         | Speech | Before (24 kbps AAC) | After (16 kbps HE-AAC) | Target | Within      |
| ------------ | ------ | -------------------- | ---------------------- | ------ | ----------- |
| `home`       | 1.9 s  | 10.0 KB              | 9.4 KB                 | ~60 KB | Yes         |
| `cuneo-2022` | 13.8 s | 45.8 KB              | 33.7 KB                | ~60 KB | Yes         |
| `lille`      | 26.3 s | 82.1 KB              | 63.0 KB                | ~60 KB | **No**, 5%  |
| `now`        | 41.0 s | 130.2 KB             | 97.2 KB                | ~60 KB | **No**, 62% |

How they were checked, without playing them aloud: each clip's duration (`afinfo`) is the same as
before to the millisecond, a decode to 16-bit WAV (`afconvert -f WAVE -d LEI16`) gives 22,050 Hz
mono of the same length with a speech-level signal throughout (RMS 5,068–5,479 of 32,767), and
`tests/path-voice.spec.ts` loads and plays each in a muted Chromium.

Over the target: `now` reads five sentences, 41 s of speech, and even HE-AAC's 12 kbps setting
makes 74 KB of it, still over. Nobody has listened to the clips at 12 kbps, so the clip is left
over the target at 16 kbps rather than squeezed further unheard. `lille`, at 26 s, is 3 KB
over at the same rate. The target is #150's, not one of #141's budgets, and both count in the
8 MB total above.

## Production and revision time per asset

From #149's asset log (`docs/path-assets.md`), which has the full record:

| Asset                                   | Production              | Revisions                                                       |
| --------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| Belfry reference image (GPT Image)      | 40 s                    | None                                                            |
| Vieille Bourse reference image          | 75 s                    | None                                                            |
| Belfry mesh (Hunyuan3D-2)               | 11 s (6.6 s on the GPU) | 1: the client script misread the first result (13 s call)       |
| Vieille Bourse mesh                     | 12 s (6.9 s on the GPU) | None                                                            |
| `lille-belfry.bin`                      | About 1 s               | 1: the script stopped on the GLB's packed stride; fixed         |
| `lille-bourse.bin`                      | About 1 s               | None                                                            |
| Lille scene, coded (`lille.ts`)         | About five minutes      | 3: roofs, the clock's position, dark-mode contrast              |
| Lille grey-box renders                  | 3 s (every still)       | None                                                            |
| `lille-light.webp` (GPT Image painting) | 59 s                    | 1: a call that never ran (`-i` misread); one re-encode, 78 → 86 |
| `lille-dark.webp`                       | 42 s                    | As above                                                        |
| Home stills (grey-box renders)          | 3 s (every still)       | 2 regenerations after outline changes                           |
| Voice clips (#150, macOS `say`)         | Not logged              | Not logged                                                      |

#150 did not log production time for the clips.

## Open items

- **Real-phone frame rate is not measured.** It is not one of #141's acceptance figures. The
  runtime falls back to the stills when the first 60 frames' median is over 33 ms, but no real
  phone has been timed. Left for the owner. The scene draws only while something moves (a build,
  a turn, a theme change), and only those frames are timed. A 2–3 s build gives more than 60
  frames at any rate near 33 ms, so a slow device is judged during its first build. Under
  reduced motion nothing animates and the sample never fills, so there is no frame-rate fallback
  there, and none is needed.
- **The generated landmarks are over two budgets** (measured in [The camera (v3)](#the-camera-v3)).
  Cold transfer is 3.1 MB against 1.5 MB, of which 2.2 MB is the full-detail models. Live GPU
  memory at 2560×1440 ×2 is 380.4 MB against 360 MB, since the models' textures add 49 MB.
  The `.lod.glb` files (0.8 MB together) are not what the board loads.
- GPU memory is an estimate from uploads and canvas size, not a reading of what the GPU holds.
- **The board is drawn below ratio 2 on very large stages.** The cap that keeps GPU memory under
  64 MB draws a 2560×1440 ×2 stage at ratio 1.19. Screens up to about 1440×900 ×2 draw at their
  own ratio.
- The `now` voice clip is over #150's ~60 KB target, and `lille` is just over it. See
  [Voice clips](#voice-clips).
