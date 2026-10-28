# Small floating worlds on a tabletop: art-direction references

Labels: **OBSERVED** means I measured or saw it live in a muted Chrome session on 2026-10-28. **INFERRED** means I derived it from what I observed. **REPORTED** means it comes from the linked source. Payload figures are compressed transfer, measured by refetching every URL the page requested. Sketchfab and Spline community scenes were not inspected.

## Live web examples (inspected)

**My Room in 3D, Bruno Simon** (https://my-room-in-3d.vercel.app/). The baking reference.

- OBSERVED: 10.9 MB in total. 5.35 MB of it is MP4 video on the screens and 4.87 MB is four JPEGs: `bakedDay`, `bakedNight`, `bakedNeutral` and `lightMap`, at 0.85–1.5 MB each. I checked two of the four: both are 4096². The other two are in the same file-size range.
- OBSERVED: the geometry is a 244 KB Draco GLB with a 128 KB decoder.
- OBSERVED: the debug panel has `uNightMix` and `uNeutralMix`, so whole bakes are blended in the shader. `lightMap.jpg` has separate red, green and blue regions, and the panel has three colour pickers with strength sliders (TV, desk, PC).
- INFERRED: each light's contribution is packed into its own channel, so the lights can be recoloured live without re-baking.
- OBSERVED in the bundle: pixel ratio is clamped to [1,2], and there is no `prefers-reduced-motion` handling.
- INFERRED: by McCurdy's formula (below), four textures at 4096² come to about 360 MB of GPU memory for an 11 MB download. That will not fit on a phone.
- What it teaches: bake a light and a dark state and mix them with a uniform, which maps straight onto the site's light/dark mode. Pack light masks into channels. Size bakes to the world, not to a 4K default.

**DJDB, the closed-restaurant archive** (https://djdb.kr/#play). The closest analogue to Lorenzo's flow.

- OBSERVED: the Play page is plain HTML cards, each with a pre-rendered poster image. On desktop the card also loads a `shop-loop.mp4` (771 KB). The 3D shop loads only after "Press start".
- OBSERVED: the scene is three.js 0.170 with meshopt geometry compression, GTAO (ambient occlusion), UnrealBloom and a Reflector.
- OBSERVED: lightmaps are WebP, split by group (`lm_ext`, `lm_int`, `lm_props`, `lm_alt`), with `_lo`/`_hi` and night/wear variants.
- OBSERVED: the load was 9.4 MB on desktop and 13.3 MB on an emulated iPhone 14 with reduced motion. The difference is mostly one 6 MB `lm_ext_night_hi.webp`, which the desktop capture never fetched.
- INFERRED: the two captures stopped at different points of a lo→hi upgrade, or the choice depends on screen density. Don't read it as "mobile loads more".
- Not identified: a 2.3 MB `daejang-mo-0.wasm`.
- OBSERVED on mobile: three cards instead of four, and no loop video loaded.
- REPORTED by the author: phones stay in night mode to keep the load light ([forum post](https://discourse.threejs.org/t/djdb-a-closed-restaurant-in-three-js-a-night-diorama-and-a-sign-you-can-smash-and-rewind/94900)).
- Not checked: the source, because the site's bot guard blocked a direct fetch.
- What it teaches: HTML poster first, 3D only on opt-in. Split lightmaps by object group so a low tier ships first. A single night bake is a cheap phone tier.

**Townscaper web demo** (https://oskarstalberg.com/Townscaper/).

- OBSERVED: a Unity WebGL build of 53.9 MB, so it is no model for weight. The look is the lesson.
- OBSERVED: one small cluster sits on a fogged sea with no visible edge. Dark contour lines, a soft contact shadow and a reflection create the "floating world" without any plinth.
- REPORTED by Stålberg: players should be "in control of the large shapes" while the small shapes vary. Ornate styles "look cluttered when zoomed out and cause aliasing". Outlines stay crisp at any distance. ([Game Developer](https://www.gamedeveloper.com/blogs/how-townscaper-works-a-story-four-games-in-the-making))
- What it teaches: legibility comes from silhouette plus outline at moderate detail. Fog over a void reads as "small world" better than a pedestal does.

**Mr. Panda's papercraft portfolio, Andrew Woan** (https://www.mr-pandas-psychologically-safe-portfolio.com/).

- OBSERVED: 14.3 MB in total, of which 13.3 MB is compressed KTX2 texture sheets (1.4–2.4 MB per scene) behind a 239 KB Basis transcoder. The GLB is 30 KB.
- OBSERVED in the bundle: React Three Fiber caps pixel density, and there is no reduced-motion handling.
- What it teaches: when surfaces are painted, textures are the whole budget and geometry is negligible.
- It is hand-drawn, which is excluded for Lorenzo, so it is a pipeline reference only.

**Tiltshift-in-html, ybouane** (https://tiltshift-in-html.ybouane.com/).

- REPORTED: 18 dioramas whose controls are live, focusable HTML, drawn into WebGL through the experimental HTML-in-Canvas API, with depth-aware tilt-shift.
- OBSERVED: it still showed only a "One flag away" fallback after I relaunched with `--enable-blink-features=CanvasDrawElementCopy`. I did not confirm the Chrome version. It needs Chrome 148+ with a flag, so it can't ship.
- Consequence for keyboard support: controls and focus targets must live in an HTML overlay, and the canvas stays decorative.
- If the effect is ever wanted, R3F has [`TiltShift`/`TiltShift2`](https://react-postprocessing.docs.pmnd.rs/effects/tilt-shift). The [three.js forum](https://discourse.threejs.org/t/how-to-have-a-tilt-shift-effect-on-a-3d-scene/40606) recommends a near-orthographic camera (small FOV) for the miniature read.

## Games and talks (REPORTED)

- **Townscaper / Bad North:**
  - Built on an irregular quad grid, with corner-piece tiles placed by marching cubes. Pieces "skew quite a lot before it starts to become a problem" (same source as above).
  - Lesson: a kit of parts built in code can produce organic towns.
- **Tiny Glade (Pounce Light):**
  - Described as "a toy box for making dioramas", where "everything was hand-crafted by Tom and me". Geometry is generated on the GPU in real time by many purpose-built generators rather than one algorithm ([80.lv](https://80.lv/articles/exclusive-tiny-glade-developers-discuss-bevy-proceduralism-publishers-cozy-games)).
  - Its "advanced real-time global illumination" is a Hacker News claim, not a developer statement.
  - Lesson: procedural isn't generic when the generators are hand-authored.
- **Monument Valley:**
  - Structures only make sense from one fixed orthographic angle ([MCV](https://www.mcvuk.com/development/unity-focus-monument-valley)).
  - Faces are painted and baked to one texture in Blender ([Sketchfab spotlight](https://sketchfab.com/blogs/community/art-spotlight-monument-valley-2/)).
  - Colour is applied directly instead of through a lighting system, with a three-colour palette. That comes via secondary summaries; the primary is the [GDC 2015 talk](https://gdcvault.com/play/1022476/The-Art-of-Monument).
  - Lesson: fixed camera, palette discipline, and fake lighting that costs nothing.
- **Mini Metro / Mini Motorways:**
  - Each real city gets its own colour scheme, geographic obstacles and growth pace ([Next City](https://nextcity.org/urbanist-news/mini-metro-game-transportation-planning)).
  - A prototype built on real map data was dropped because it lacked "building your own city" ([Thumbsticks](https://www.thumbsticks.com/hustle-and-bustle-how-mini-motorways-built-its-wuselfaktor/)).
  - Lesson: abstract a city to one palette and one geographic signature (river, lake edge) rather than reproducing it.
- **Monopoly Plus (Asobo for Ubisoft, 2014):**
  - Its "living board" is a 3D city in the middle where properties are "redeveloped right before your eyes".
  - The review says it "slows play down" because "some animations are unskippable" ([Pure Xbox](https://www.purexbox.com/reviews/xbox-one/monopoly_plus), [Wikipedia](https://en.wikipedia.org/wiki/Monopoly_Plus)).
  - Lesson: board-to-world transitions must be short and interruptible.
- **Captain Toad:**
  - Levels are a "diorama" or "garden in a box". With Mario, stages became "impossibly large" because he can jump, so a character who can't jump keeps them small ([Polygon via Nintendo Everything](https://nintendoeverything.com/captain-toad-treasure-tracker-devs-on-the-games-creation/)).
  - Lesson: one bounded cube per world, read by turning the camera around it, never by travelling through it.
- **A Short Hike:**
  - Low-resolution render, "no anti-aliasing", a "soft outline effect" for readability, "flat cohesive shading", and a player-adjustable pixel size. Low resolution lets imagination "fill in the details" ([PlayStation Blog](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/)).
  - Lesson: reduced resolution is both a style and a mobile performance lever.
- **Islanders and Astro Bot** (sources thin):
  - Islanders: flat colours and simple shapes, partly forced by scope ([Game World Observer](https://gameworldobserver.com/2019/06/14/islanders)).
  - Astro Bot: "toy" materials, with sci-fi bots given fabrics and furry boots ([PlayStation Blog](https://blog.playstation.com/2024/09/09/astro-bot-how-team-asobi-created-a-unified-vision-for-fun/)).
  - No technique detail was found for either.

## Print (REPORTED)

- ENIT was founded in 1919 and printed its posters with the Ferrovie dello Stato ([Finestre sull'Arte](https://www.finestresullarte.info/en/works-and-artists/brief-history-of-italian-tourism-posters)).
- A verified example of a city blended with its work: Metlicovitz's poster for Turin's 1911 Esposizione Internazionale delle Industrie e del Lavoro. Nude workers raise the flag over an aerial view of Turin; it was printed by Ricordi ([Italy World's Fairs archive](https://italyworldsfairs.org/archival-materials/promotional-materials/posters/esposizione-internazionale-delle-industrie-e-del-lavoro-Torino-1911-uomini-nudi-issano-bandiera-del-regno-d-italia-sullo-sfondo-veduta-di-torino-dall-alto)).
- This example puts labour in the foreground and the city as a silhouette behind. That composition works for "landmark plus work" in one frame.

## Technique numbers

- **Texture memory:**
  - A decoded RGBA texture costs width × height × 4 × 1.333 bytes with mips, so about 90 MB at 4096² whatever the file size.
  - KTX2/Basis cuts GPU memory and upload time 4–8×. ETC1S files are about the size of JPEG; UASTC files are 1–2× JPEG.
  - Basis has no HDR, so keep lightmaps in low dynamic range ([McCurdy](https://www.donmccurdy.com/2024/02/11/web-texture-formats/)).
- **Geometry compression:**
  - Draco gives the smallest static geometry; meshopt decodes faster and handles animation ([Needle docs](https://engine.needle.tools/docs/how-to-guides/optimization/compress-meshes.md)).
  - In both sites where I separated the geometry it was under 250 KB, so textures dominate. OBSERVED.
- **Zero-texture lighting:** `MeshToonMaterial` or `MeshMatcapMaterial` plus AO baked into vertex colours.
- **Instancing:** repeated pieces (houses, trees, rail) can share one `InstancedMesh` draw.
- **Tilt-shift:** a fullscreen blur pass every frame. It is the only cost here that scales with screen pixels.
- **Tiny-planet curvature:** a few-line vertex shader that drops each vertex by curvature × distance² ([three.js forum](https://discourse.threejs.org/t/how-to-bend-the-world-in-a-poukour-game/18152)).

## Art direction options for Lorenzo's worlds

Each option is tested against four things:

1. **Legibility** as a phone still about one board-space wide (Townscaper's moderate detail, Mini Metro's one palette per city).
2. **Per-frame post-processing cost.**
3. **Bake budget across four worlds**, against My Room's ~360 MB.
4. **Generic/AI risk.** The first "floating island portfolio" in my search was built with the AI model generator Hunyuan3D-2 ([forum](https://discourse.threejs.org/t/fantasy-themed-floating-island-portfolio-built-with-r3f-and-hunyuan3d-2/87480)). Low-poly floating islands are the most saturated genre right now.

**A. Painted-wood board pieces.**

- Look: landmarks are game pieces made of turned and extruded forms (lathe, extrude and bevel, all in code), in matte enamel colours with a faint grain. The work done in each city is extra pieces on the same base.
- Lighting: one soft key light, plus AO baked into vertex colours or a ≤1024² KTX2 per world. A light and a dark bake are mixed as in My Room.
- References: Monopoly Plus, Townscaper, Monument Valley, Mini Metro, Captain Toad.
- Cost: low.
- Mobile: excellent, with no post-processing and trivial stills.
- Legibility: strongest, because pieces are silhouettes by construction.
- Risk: moderate drift toward stock low-poly. It is saved by literally being the board's own pieces, at board scale, in the HTML board's palette.

**B. Soft clay / matte miniature with tilt-shift.**

- Look: matte, slightly translucent materials, Cycles-baked global illumination, and a shallow-focus band.
- References: Tiny Glade, Messenger, Astro Bot, `TiltShift2`.
- Cost: high. It needs high-resolution bakes per world plus a blur pass every frame.
- Mobile: stills only.
- Legibility: weakest, because blur and soft edges erase silhouettes.
- Risk: high. "Cute isometric clay miniature, tilt-shift" is the default output of image generators and a Blender-tutorial cliché.

**C. Crisp low-poly with flat colour, baked AO and outlines.**

- Look: three-tone fake lighting by face direction (Monument Valley), optionally with a reduced-resolution render (A Short Hike).
- References: Monument Valley, A Short Hike, Islanders, Mini Motorways.
- Cost: lowest.
- Mobile: excellent.
- Legibility: good with outlines.
- Risk: highest. This is the AI-saturated floating-island look, and only a strict palette and a fixed orthographic camera rescue it.

**Recommendation: A, built with C's cheap techniques.** A is the only option that passes all four tests without exceptions, and the only one whose look comes from the Monopoly concept rather than from the diorama genre. In practice:

- Geometry in code.
- A fixed small-FOV or orthographic camera with a limited orbit, like Captain Toad's cube.
- One palette pair per city, drawn from the site tokens.
- Thin outlines for legibility in stills.
- AO baked into vertex colours or a ≤1024² KTX2 texture, with two bakes (light and dark) mixed by a uniform.
- Fog over a void instead of a plinth.
- Instanced repeats.
- Board-to-world transitions under a second and skippable, and a cut instead under reduced motion.
- An HTML overlay that owns all focus and keyboard input.
- Stills rendered from the same scenes for phones, behind an HTML-first poster as DJDB does.

Skip tilt-shift. Small FOV plus fog gives the miniature cue at no per-frame cost.

Every session was launched with `--mute-audio` and closed with `close --all`. `pgrep` confirmed no agent-browser or muted Chrome process left running. The repo was not modified; captures are in `/tmp/ab-dioramas/`.
