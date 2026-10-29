# Voice and "build" moments for the life steps: a research report

No repo files were changed. Tags: **R** means reported, with the source linked. **I** means my inference. Where a source is secondary, it says so.

## 1. Voice

### When a click unlocks audio

- **R** Under the HTML spec, only these events grant user activation: `keydown` (not Esc), `mousedown`, `pointerdown` for a mouse, `pointerup` for touch or pen, and `touchend`. The activation lasts "at most a few seconds" ([HTML §6.4](https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event)). So a click on a step counts, and so does Enter or Space on a focused step button **I**.
- **R** Chrome allows sound once "the user has interacted with the domain." An `AudioContext` created before that starts "suspended" and needs `resume()` after a gesture ([Chrome](https://developer.chrome.com/blog/autoplay)).
- **R** Safari: assume every `<audio>` needs a user gesture. Permission is granted per element, so for a sequence, swap `src` on one element instead of creating new ones ([WebKit](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)).
- **R** Firefox blocks Web Audio until sticky activation. `navigator.getAutoplayPolicy()` and the rejected `play()` promise let you detect a block ([MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)).

### (a) His own recorded voice

- **R** Opus bitrate "sweet spots" for speech: 16–20 kbit/s wideband, 28–40 kbit/s fullband ([RFC 6716 §2.1.1](https://www.rfc-editor.org/rfc/rfc6716#section-2.1.1)).
- **I** One 20 s clip comes to about 40–50 KB at 16–20 kbit/s, or 70–100 KB at 28–40. Six steps in two languages total about 0.5–1.2 MB. AAC-LC mono at 48–64 kbit/s is 120–160 KB per clip.
- **R** Safari's Opus support is uneven:
  - MDN says Safari plays Opus "only when packaged in a CAF file."
  - caniuse lists desktop Safari as "partial" through version 27 and iOS Safari as full from 18.4 ([MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs), [caniuse](https://caniuse.com/opus)).
  - MDN also says AAC in MP4 "is supported by all major browsers."
- **I** Ship Opus (WebM) plus an AAC `.m4a` fallback through `<source>`. Use `preload="none"` and fetch a clip only after opt-in.

### (b) Synthesized speech

- **Browser `speechSynthesis`:**
  - **R** `getVoices()` returns the voices available "on the current device" ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices)).
  - **R** Chrome's Google-supplied network voices cut off at about 15 s, which an open Chromium bug covers ([Caktus](https://www.caktusgroup.com/blog/2025/11/03/the-halting-problem/), secondary). They also fire no `boundary` events ([W3C list](https://lists.w3.org/Archives/Public/public-speech-api/2015Oct/0002.html)).
  - **I** Which Italian voices exist depends on the OS and installed language packs. No primary source lists them. You can't control the voice's quality or identity, and the same page will sound different per device. Not suitable for a signature moment.
- **ElevenLabs (pre-generated files):**
  - **R** Current models are Eleven v4, v4 Turbo, v3, Multilingual v2 and Flash v2.5, and all list Italian ([models](https://elevenlabs.io/docs/models)). API prices are $0.08 per 1K characters for v4, v3 and Multilingual v2, and $0.04 for Flash or Turbo ([API pricing](https://elevenlabs.io/pricing/api)).
  - **R** Plans ([pricing](https://elevenlabs.io/pricing)):

    | Plan    | Monthly | Credits | Instant clone | Professional clone |
    | ------- | ------- | ------- | ------------- | ------------------ |
    | Free    | $0      | 10k     | No            | No                 |
    | Starter | $6      | 30k     | Yes           | No                 |
    | Creator | $22     | 121k    | Yes           | Yes                |

  - **R** The free plan allows no commercial use and requires "elevenlabs.io" attribution ([help](https://help.elevenlabs.io/hc/en-us/articles/13313564601361)).
  - **I** Volume is about 450 characters per 30 s clip. Twelve clips (6 steps × EN and IT) come to about 5.4k characters, or about $0.45 through the API. One month of Starter covers it with a commercial licence. A personal portfolio arguably promotes his work, so treat it as commercial.
  - **R** Instant Voice Cloning needs at least 10 s of audio (1–2 minutes recommended). You tick a box confirming "you have the right and consent," and there is no other check ([IVC docs](https://elevenlabs.io/docs/product-guides/voices/voice-cloning/instant-voice-cloning)).
  - **R** Professional Voice Cloning needs the Creator plan or above, uses "voice-captcha," and is limited to "your own voice" ([voices](https://elevenlabs.io/docs/capabilities/voices), [help](https://elevenlabs.io/docs/help-center/product/voices/voice-cloning/can-i-create-a-professional-voice-clone-of-someone-elses-voice.md)). Cloning his own voice is allowed under either.
  - **R** `convert-with-timestamps` returns per-character start and end times. It outputs Opus at 48 kHz (32–192 kbit/s) or MP3 (32–192), not AAC ([API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)). The docs don't say which models support timestamps, so check that for v3 and v4.

- **Alternatives:**
  - **R** OpenAI's `gpt-4o-mini-tts`, `tts-1` and `tts-1-hd` are all deprecated, with shutdown on 2027-01-06. Its policy requires "a clear disclosure to end users that the TTS voice they are hearing is AI-generated" ([OpenAI](https://developers.openai.com/api/docs/guides/text-to-speech)). Its deprecation rules it out **I**.
  - **R** Azure personal voice needs a 5–90 s sample plus a recorded consent statement, and API access goes through an intake form ([Microsoft](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/personal-voice-overview)). The gate makes it impractical here **I**.
- **Disclosure:**
  - **R** EU AI Act Article 50: deployers must disclose that deep-fake audio was AI-generated. "Deep fake" is defined in Article 3(60) as content that resembles existing persons. For evidently artistic or creative works the disclosure can be light ([Reg. 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)). Secondary sources say this applied from 2 August 2026, and the Digital Omnibus did not delay the deployer duty ([McCann FitzGerald](https://www.mccannfitzgerald.com/knowledge/technology-and-innovation/one-month-to-go-eu-ai-act-transparency-compliance)).
  - **I** A clone of his own voice resembles an existing person. Label it next to the control, for example "Voice: my voice, synthesized with ElevenLabs."

### (c) Typed captions, and WCAG

- **R** WCAG 1.2.1 requires a transcript for prerecorded audio. Audio that is "a media alternative for text," presenting no more than the text and labelled as such, is exempt ([Understanding 1.2.1](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html)). A text-first design where the voice reads the visible caption fits that exemption **I**.
- **I** Voice that plays in step with the build animation could be judged synchronized media, which would bring in 1.2.2 captions. Keeping the full caption on screen satisfies 1.2.2 either way.
- **R** WCAG 1.4.2 covers audio that "plays automatically for more than 3 seconds." Audio started by a button whose label makes clear it plays sound is outside it ([Understanding 1.4.2](https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html)).
- **R** WCAG 2.2.2 covers motion that starts automatically, lasts more than 5 s and runs alongside other content. Direct activation by a button doesn't count as automatic, but hover, focus and scroll triggers do ([Understanding 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). 2.3.3 (AAA) asks that motion triggered by interaction can be turned off.
- **I** So a click-started build or voice is compliant. Still add Stop/Skip controls, never trigger on hover or scroll-into-view, and make a typewriter caption show its full text instantly under reduced motion.

### Syncing captions to audio

- **R** `<track>` is allowed inside `<audio>`. `cuechange` fires on the `TextTrack`, and its `activeCues` gives the current cue ([MDN track](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/track)).
- **R** WebVTT inline timestamps (`<00:17.500>`) mark word-by-word "karaoke" timing ([MDN WebVTT](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API/Web_Video_Text_Tracks_Format)).
- **I** `<audio>` has no surface to draw captions on. Set the track to `mode="hidden"` and draw the caption in HTML. ElevenLabs character times can be grouped into word cues at build time. For his own recordings, a forced aligner or hand-placed timing does the same job.

## 2. The "build" animation

- **Patterns:**
  - **R** One `InstancedMesh` reduces draw calls, with `setMatrixAt` and `setColorAt` per instance ([three.js](https://threejs.org/docs/pages/InstancedMesh.html)). R3F advises "a few hundred" draw calls at most ([R3F](https://r3f.docs.pmnd.rs/advanced/scaling-performance)).
  - **R** Clipping-plane reveals use `Material.clippingPlanes` with `renderer.localClippingEnabled` turned on ([three.js](https://threejs.org/docs/pages/Material.html)).
  - **I** A per-instance `aDelay` attribute plus one `uProgress` uniform in a vertex shader drives a staggered drop or scale in a single draw call with no per-frame JavaScript. Steps in LEGO-instruction order are just a sorted delay array.
  - **R** `frameloop="demand"` with `invalidate()` renders only while something changes ([R3F](https://r3f.docs.pmnd.rs/advanced/scaling-performance)). The canvas then costs nothing between builds.
- **Libraries** (npm registry checked today; sizes are full-package gzip from Bundlephobia, so tree-shaken builds will be smaller):

  | Library               | Latest            | Gzip  | Status                                                                                                                       |
  | --------------------- | ----------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
  | `@react-spring/three` | 10.1.2, Jun 2026  | 18 KB | Active                                                                                                                       |
  | `gsap`                | 3.15.0, Apr 2026  | 27 KB | Active; "100% free" ([GSAP](https://gsap.com/pricing/))                                                                      |
  | `@theatre/core`       | 0.7.2, May 2024   | 31 KB | Stale **I**; README says "temporarily moved development to a private repo" ([GitHub](https://github.com/theatre-js/theatre)) |
  | `framer-motion-3d`    | 12.4.13, Mar 2025 | —     | Removed in Motion 12.5.0; npm "Package no longer supported" ([npm](https://npmjs.com/package/framer-motion-3d))              |

- **Skip, resume and reduced motion:**
  - **R** react-spring's `Globals.assign({ skipAnimation: true })` makes animations "jump" to their end ([docs](https://www.react-spring.dev/docs/utilities/use-reduced-motion)).
  - **R** `gsap.matchMedia()` runs separate code for `prefers-reduced-motion: reduce` and reverts automatically ([GSAP](<https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/>)).
  - **I** With a shader-driven build, skip, pause and resume reduce to setting or freezing one `uProgress` uniform. The reduced-motion version shows the end state, crossfaded from the ≤150 KB still.
- **Camera rail vs cuts:**
  - **I** A continuous `CatmullRomCurve3` rail keeps neighbouring worlds loaded. Five worlds × 64 MB would exceed what a phone holds, and reduced motion then needs a second path.
  - **I** Cutting with a short crossfade lets you dispose of each world on leaving, which keeps the 64 MB-per-world budget and matches the "box you turn" direction in §6.2.

## 3. Pre-rendered video vs real-time

- **R** Apple's HLS starting targets: 720p is 3000 kbit/s in H.264 or 2400 in HEVC; 1080p is 6000 or 4500 ([Apple HLS spec](https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices)).
- **I** Per clip at those targets:

  | Clip length | 720p H.264 | 720p HEVC | 1080p H.264 |
  | ----------- | ---------- | --------- | ----------- |
  | 6 s         | 2.25 MB    | 1.8 MB    | 4.5 MB      |
  | 10 s        | 3.75 MB    | 3.0 MB    | 7.5 MB      |

  Flat-shaded CG may compress 2–4× better. Even so, one clip uses most or all of the 1.5 MB world budget, and light/dark versions double it.

- **R** Transparency needs two encodes:
  - Chrome and Firefox use VP9 with alpha. Safari "does not support alpha transparency" in VP8 or VP9 ([MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs)).
  - Safari uses HEVC with alpha, which has to be encoded on a Mac.
  - One measured clip came to 1.1 MB as VP9 alpha, 3.4 MB as HEVC alpha, and 460 KB as stacked-alpha AV1 drawn through WebGL ([Archibald](https://jakearchibald.com/2024/video-with-transparency/)).
  - **R** Safari decodes AV1 only with hardware support: M3 Macs, iPhone 15 Pro and later.
- **I** Video can't be clicked into or orbited, needs a re-render for each theme and language, and can't follow live colour tokens. Real-time loads its runtime once and then costs only geometry built in code plus one ≤1024² bake per world.

## Recommendations

1. **Voice.** Default to typed captions, always on screen and shown in full instantly under reduced motion. That meets WCAG 1.2.1 through the media-alternative-for-text exemption and puts 1.4.2 out of scope. Offer one persistent, labelled "Play voice" control, started by a click on that control and remembered.
   - Use his own recordings: Opus at about 24 kbit/s plus an AAC fallback is about 60 KB per 20 s, about 0.7 MB for all twelve.
   - If he wants a voice without recording, an ElevenLabs Instant clone of his own voice costs about $6 for one Starter month (about $0.45 of characters). Label it on the page under AI Act Article 50.
   - Not `speechSynthesis`: voices differ per device and Chrome's Google voices cut off at about 15 s.
2. **Build.** Assemble the pieces with a shader driven by a per-instance delay, in one draw call. Use react-spring/three (18 KB gz, active) or GSAP (27 KB gz, free) for the handful of authored springs. Rendering on demand keeps the canvas idle between builds. Skip means setting the end state; reduced motion means a crossfade from the still. Cut between worlds rather than ride a camera rail, to stay at 64 MB of GPU memory per world. Avoid theatre.js (no release since May 2024) and framer-motion-3d (removed).
3. **Real-time, not video.** A single 6–10 s clip at 720p is 1.8–3.75 MB at Apple's targets, ×2 for themes and ×2 encodes for alpha, against a 1.5 MB world budget. Keep pre-rendered material to the ≤150 KB stills.
