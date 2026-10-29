# The 3D path's measurements

#152 measures the prototype of `/path` (home and Lille, the scenes #148 and #149 built, with #150's
voice) against the budgets in #141's acceptance and research §9 and §11
(`docs/research/experience-rethink.md`). The figures stay here. "How this was made" at the foot of
`/` describes them in words, because decision 10 keeps numbers off the page.

Measured 2026-10-29 at `15e2380` plus #152's commit, on a production build (`bun run build`, then
`next start -p 3211`). KB here is 1,024 bytes.

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

Decoders: the models are the repository's own quantised format (`model-format.ts`), decoded by code
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
- GPU memory is an estimate from uploads and canvas size in SwiftShader, not a reading on a real
  GPU.
- The `now` voice clip is over #150's ~60 KB target, and `lille` is just over it. See
  [Voice clips](#voice-clips).
