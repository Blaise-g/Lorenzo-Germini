# The 3D path's measurements

#152 measures the prototype of `/path` (home and Lille, the scenes #148 and #149 built, with #150's
voice) against the budgets in #141's acceptance and research §9 and §11
(`docs/research/experience-rethink.md`). The figures stay here. "How this was made" at the foot of
`/` describes them in words, because decision 10 keeps numbers off the page.

Measured 2026-10-29 at `15e2380` plus #152's commit, on a production build (`bun run build`, then
`next start -p 3211`). KB here is 1,024 bytes.

## Summary

| Budget                                   | Budget | Measured                                 | Within |
| ---------------------------------------- | ------ | ---------------------------------------- | ------ |
| Transfer per scene: home, arriving cold  | 1.5 MB | 592 KB                                   | Yes    |
| Transfer per scene: Lille, arriving cold | 1.5 MB | 766 KB (183 KB on top of home)           | Yes    |
| GPU memory, estimated                    | 64 MB  | 13.6–53.7 MB; 74.3 MB on a 2560×2 screen | **No** |
| Each still                               | 150 KB | Largest 29.7 KB (`lille-light.webp`)     | Yes    |
| Everything opened                        | 8 MB   | About 1.07 MB, runtime and decoders in   | Yes    |
| Each voice clip (#150's target)          | ~60 KB | `lille` 82.1 KB and `now` 130.2 KB: over | **No** |

GPU memory is over budget on a 2560-wide screen at pixel ratio 2, and only there of the four sizes estimated. Two voice clips are over #150's ~60 KB target for a clip, which is
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

Decoders: the models are the repository's own quantised format (`model-format.ts`), decoded by code
inside the runtime chunk, so there is no separate decoder download (no Draco or meshopt WASM). The
stills are WebP, decoded by the browser. The fonts are the site's own and are counted because a
cold visitor pays for them.

## GPU memory

The drawing buffer dominates, and it follows the stage's size in device pixels (the runtime caps
the pixel ratio at 1.5). With `antialias: true` it holds 4× multisampled colour and depth plus the
resolved colour: about 36 bytes a pixel. Uploaded buffers and textures for home and Lille together
add about 1.8 MB (0.6 MB of vertex and index buffers, 1.2 MB of textures counted as RGBA with a
third more for mipmaps). Those are cumulative uploads, so an upper bound on what is resident.

| Viewport (CSS px, pixel ratio)                                             | Canvas (device px) | Drawing buffer | Total, about | Within 64 MB        |
| -------------------------------------------------------------------------- | ------------------ | -------------- | ------------ | ------------------- |
| 390, ×3 (phone)                                                            | 513×672            | 11.8 MB        | 13.6 MB      | Yes                 |
| 1440, ×2 (the measured run; the other rows are computed from their canvas) | 1464×567           | 28.5 MB        | 30.3 MB      | Yes                 |
| 3840, ×1                                                                   | 3376×448           | 51.9 MB        | 53.7 MB      | Yes                 |
| 2560, ×2                                                                   | 3144×672           | 72.5 MB        | 74.3 MB      | **No, over budget** |

MB here is 1,024² bytes. On a wide high-density screen the stage grows past what the 1.5 cap
holds under 64 MB. Capping the stage's device-pixel width, or the pixel ratio by area rather than
by a fixed factor, would bring it under; that is a change to the runtime, outside #152. This is
measured in SwiftShader, not on a real GPU, and the browser's own compositing buffers are not
counted.

## Stills

| Still               | KB   | Budget |
| ------------------- | ---- | ------ |
| `home-1-light.webp` | 8.9  | 150 KB |
| `home-1-dark.webp`  | 4.2  | 150 KB |
| `home-2-light.webp` | 9.7  | 150 KB |
| `home-2-dark.webp`  | 4.7  | 150 KB |
| `home-3-light.webp` | 10.1 | 150 KB |
| `home-3-dark.webp`  | 5.2  | 150 KB |
| `lille-light.webp`  | 29.7 | 150 KB |
| `lille-dark.webp`   | 21.8 | 150 KB |
| **All stills**      | 94.2 |        |

File sizes on disk. Each is also checked against the budget by `generate:path-stills` and
`tests/path-lille.spec.ts`.

## Everything opened

Home cold (592.1 KB), then Lille (183.4 KB), then every other still in both modes (55.7 KB, file sizes), then
every voice clip played (`home` 10.0, `cuneo-2022` 45.8, `lille` 82.1, `now` 130.2: 268.1 KB, file
sizes) comes to about **1,099 KB, 1.07 MB**, against 8 MB. The three.js runtime and the decoders
are in it, as above. The voice manifest (1.8 KB) is in the route's data.

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
  phone has been timed. Left for the owner.
- GPU memory is over the 64 MB budget on a 2560-wide, ×2 screen (about 74 MB). Fixing it is a
  runtime change outside #152.
- GPU memory is an estimate from uploads and canvas size in SwiftShader, not a reading on a real
  GPU.
- The `lille` and `now` voice clips are over #150's ~60 KB target.
