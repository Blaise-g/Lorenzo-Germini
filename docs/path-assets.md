# The 3D path's asset log

Every generated asset `/path` ships: the tool that made it, what it was made from, and how long it
took to make and revise. #152's measurement report reads production and revision time from here.
The pipeline is #141's decision 11 and research §9 (`docs/research/experience-rethink.md`). Code owns
the style. Hunyuan3D makes the silhouettes that are hard to build in code. GPT Image, through
Codex, makes reference images and paints the stills over grey-box renders of the coded scene.

Times are UTC, from a log written as each step started and ended. "Production" is the wall-clock
time of the generation call itself. "Revision" counts the attempts after the first and the time
they took.

## Which image model Codex served

The first file generated in this pipeline was `belfry-reference.png` (2026-10-28, codex-cli
0.165.0, logged in with ChatGPT). It carries a C2PA manifest, read with `c2pa-python` from the
untouched PNG before any conversion:

- claim generator: `OpenAI Media Service API` (c2pa-rs 0.79.2, spec 2.2.0)
- action `c2pa.created`, 2026-10-28T23:41:31Z, with `softwareAgent`
  `{ "name": "ChatGPT", "version": "gpt-image" }` and digital source type
  `trainedAlgorithmicMedia`
- signed by `OpenAI Media Service` (issuer `OpenAI OpCo, LLC`)

So the manifest says only `gpt-image`, with no version number. It settles that an OpenAI GPT
Image model made the file. It does not settle whether that was GPT Image 2 or 2.5, which is the
question research §11 left open. Nothing else in the file names a version.

C2PA does not survive into what ships. `sharp`'s WebP conversion drops the manifest, and the
shipped `lille-light.webp` has none (checked with the same reader). As research §7.8 expects,
"How this was made" has to say so in words.

## Place facts, checked before modelling

Research §11 lists the Vieille Bourse's materials as unverified. I checked them, and the belfry,
against sources and against the reference images before modelling:

- **The Chamber of Commerce belfry** (Louis-Marie Cordonnier, built 1910–21, neo-Flemish). It is
  76 m tall, has a clock with four faces and a carillon, and stands on the Place du Théâtre beside
  the Vieille Bourse. It is not the town hall's Art Deco belfry, which decision 3 rejected.
  Source: [fr.wikipedia.org, Chambre de commerce de Lille](https://fr.wikipedia.org/wiki/Chambre_de_commerce_de_Lille).
  Its red brick with pale stone bands and its tiered lantern spire come from the reference image
  and match photographs of it. No text source states the materials.
- **The Vieille Bourse** (Julien Destrée, 1652–53, Flemish mannerist). It is 24 identical houses
  around an arcaded courtyard with four covered galleries, with a campanile topped by a gilded
  Mercury. Today the courtyard holds second-hand book sellers and chess players. Builders could
  use only brick and stone: warm red brick walls with carved pale stone surrounds and ornament.
  Sources: [fr.wikipedia.org, Vieille Bourse de Lille](https://fr.wikipedia.org/wiki/Vieille_Bourse_de_Lille),
  [cityzeum.com, La Vieille Bourse](https://www.cityzeum.com/vieille-bourse).

The scene keeps these as silhouettes in the palette. Brick and stone show only in the painted
stills.

## Lille (#149)

| Asset                                  | Made with                                                                                          | From                                                                                                 | Production                                                         | Revisions                                                                                                                                                                                                      | Shipped                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Belfry reference image                 | GPT Image via `codex exec` (C2PA above)                                                            | Prompt: the CCI belfry alone, three-quarter view, white ground                                       | 23:41:02–23:41:42 (40 s)                                           | None                                                                                                                                                                                                           | Not shipped; Hunyuan3D input             |
| Vieille Bourse reference image         | GPT Image via `codex exec`                                                                         | Prompt: one street front of the Bourse with its campanile, white ground                              | 23:42:07–23:43:22 (75 s)                                           | None                                                                                                                                                                                                           | Not shipped; Hunyuan3D input             |
| Belfry mesh                            | Hunyuan3D-2 (`hunyuan3d-dit-v2-0`), HF Space `tencent/Hunyuan3D-2`, `/shape_generation`, seed 1234 | The belfry reference                                                                                 | 23:43:34–23:43:45 (11 s; 6.6 s on the GPU), 134,398 faces          | 1. The first call (23:42:07–23:42:20, alongside the Bourse reference) generated, but my client script misread the result. Fixed and rerun.                                                                     | —                                        |
| Vieille Bourse mesh                    | Hunyuan3D-2, as above                                                                              | The Bourse reference                                                                                 | 23:43:45–23:43:57 (12 s; 6.9 s on the GPU), 473,574 faces          | None                                                                                                                                                                                                           | —                                        |
| `public/path/models/lille-belfry.bin`  | `bun run prepare:path-model <glb> lille-belfry --ratio 0.06`                                       | The belfry mesh: welded, simplified with glTF-Transform 4.5.1, quantised to 16 bits                  | About 1 s                                                          | 1. The script's first run stopped on the GLB's packed stride. Fixed in the script.                                                                                                                             | 70.8 KB, 8,062 triangles (budget 300 KB) |
| `public/path/models/lille-bourse.bin`  | `bun run prepare:path-model <glb> lille-bourse --ratio 0.02`                                       | The Bourse mesh, as above                                                                            | About 1 s                                                          | None                                                                                                                                                                                                           | 82.1 KB, 9,428 triangles (budget 300 KB) |
| Lille scene, coded (`lille.ts`)        | Code                                                                                               | The models, the step's props and line                                                                | About 23:45–23:50 (five minutes of layout against browser renders) | 3. The side ranges' roofs were turned across the courtyard. The clock hid the Bourse and was moved to the courtyard's right. The figure and dial ticks did not read in dark mode and were moved to the accent. | —                                        |
| Lille grey-box renders, light and dark | `bun run generate:path-stills` (painted scenes' grey boxes go to a scratch directory)              | The runtime's end state, at the fixed camera, 1464×567                                               | 23:50:53–23:50:56 (3 s, every still)                               | None                                                                                                                                                                                                           | Not shipped; painting input              |
| `public/path/stills/lille-light.webp`  | GPT Image via `codex exec -i`, then `sharp` (resize to 1464×567, WebP quality 86)                  | The light grey box; prompt: keep the composition, toy diorama, light path palette, plaque left blank | 23:51:21–23:52:20 (59 s)                                           | 1. The first call never ran: `-i` took the prompt as a second image. Re-encoded once at a higher quality (78 → 86).                                                                                            | 29.7 KB (budget 150 KB)                  |
| `public/path/stills/lille-dark.webp`   | As above                                                                                           | The dark grey box; prompt as above with the dark path palette                                        | 23:52:20–23:53:02 (42 s)                                           | As above                                                                                                                                                                                                       | 21.8 KB (budget 150 KB)                  |

Notes:

- **Recoloured to the palette.** The models carry no texture, normals or colour. The runtime
  shades them flat in a palette role (`prop`) and outlines them like any coded solid, so they
  follow the light/dark mix like the rest of the scene.
- **The stills' plaque is blank, and smaller.** The live scene sets the figure on the plaque from
  the step's line ("10,000 m³ a year — projected saving"). The paintings leave the plaque blank,
  so no generated text can drop "projected", and they stay blank: the figure is in the text panel
  either way. After the branch review the live plaque was enlarged so the figure reads at 1440×900
  (2.3 × 0.66 instead of 1.55 × 0.44, text lines 0.26 tall instead of 0.15, moved left of the
  post to clear the courtyard's right range). Its lines are about 11–12 CSS px there, checked in
  light and dark screenshots at pixel ratios 1 and 2; before, they were about 6. The paintings
  were not redone over the new grey box, so they show the old, smaller blank plaque.
- **The stills are not quantised to the tokens.** Research §9 asks that of generated textures.
  Quantising a painted still would posterise it. Both paintings were prompted with the path
  tokens' values for their mode.
- **Regenerating.** `generate:path-stills` never overwrites a painted scene's stills
  (`PAINTED_SCENES` in `build-plan.ts`). It writes their grey boxes to a scratch directory and
  only checks the painted stills against the 150 KB budget. A change to Lille's geometry therefore
  needs its stills painted again over the new grey boxes, with the prompts above.

## Home (#148)

Home's places, checked the same way, for the sources "How this was made" lists (each URL answered
200 to a plain `curl -I`, no redirect, on 2026-10-29):

- **The Bisalta**, the mountain behind Cuneo, in the Ligurian Alps between Boves and Peveragno.
  Source: [it.wikipedia.org, Bisalta](https://it.wikipedia.org/wiki/Bisalta).
- **Cuneo's plateau.** The city stands on a wedge-shaped plateau ("cùneo") at the confluence of
  the Stura di Demonte and the Gesso, which gave it its name. Source:
  [it.wikipedia.org, Cuneo](https://it.wikipedia.org/wiki/Cuneo).
- **His old high school** has no public source; it is the owner's own.

Home's stills are grey-box renders, regenerated by `generate:path-stills` with no generation step
(3 s for every still, no revisions). #149 regenerated them twice: at 23:53 after the first outline
change (the normal-extruded hull, and the Bisalta's lathe profile turned to face outward), and
again after review, when the hull's normals became angle-weighted. Lille's paintings were made over
the first grey boxes. The second change only evens out the outline's width, so the composition they
were painted over is unchanged. A third render, after the branch review, set the MVP window's label ("MVP — killed
after customer discovery", from step 4's own line) over the window in dimmed accent, so `home-2`
and `home-3` changed; `home-1` has no window and Lille's paintings are untouched.

## The board's cards (v2, comp B)

The comps the owner chose from, made before the cards. Not shipped.

| Asset                                         | Made with                     | From                                                                    | Production                | Revisions                                                                                                                       | Shipped                     |
| --------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `.impeccable/mocks/decision/path-board-a.png` | GPT Image via `codex exec -i` | current `/path#lille` screenshot + prompt: walnut and enamel board comp | 06:32:13–06:33:34 (81 s)  | None                                                                                                                            | Not shipped; comp, 1586×992 |
| `.impeccable/mocks/decision/path-board-b.png` | As above                      | As above, risograph pop-up comp (chosen by the owner)                   | 06:32:13–06:34:05 (112 s) | None                                                                                                                            | Not shipped; comp, 1586×992 |
| `.impeccable/mocks/decision/path-board-c.png` | As above                      | As above, glazed ceramic comp                                           | 06:34:26–06:35:37 (71 s)  | 1. First run (06:32:13–06:33:22, 69 s) dropped the Lille plaque and had the tiles out of order; reprompted on order and plaque. | Not shipped; comp, 1586×992 |

Each die-cut card the board stands up (`src/components/path/scene/card-art.ts`) was generated
on 2026-10-29 with GPT Image through `codex exec` (codex-cli 0.165.0, its built-in `image_gen`
tool), one call per card, five at a time, with comp B (`path-board-b.png`) attached by `-i` as
the style reference. The prompt was passed as the positional argument and `-i` after it, so the
pitfall above did not recur. Every prompt is the style block below followed by the card's
subject, which the table gives. Canvas: landscape 1536×1024, portrait 1024×1536 or square
1024×1024, by subject; the size column records what came back. Every result was looked at
full-size before processing, including the clock faces for numerals and the schoolroom's
windows for figures; none needed a retry.

> One single die-cut paper card illustration for a printed risograph pop-up board game, isolated on a plain pure white background. Match the attached reference image's risograph print style only (its two inks, its crisp flat shapes, its halftone tints); ignore its layout, board, text and overlay.
>
> Style rules, all mandatory:
>
> - Flat, straight-on front elevation, as if the card stands upright facing the viewer. No perspective, no three-quarter view, no ground plane, no cast shadow, no drop shadow.
> - Exactly two inks: terracotta (warm red-orange) and slate blue, printed on white paper. Use solid ink areas and coarse halftone tints of each ink; where the two inks overlap they darken. No black, no grey, no other colours, no gradients beyond halftone.
> - White paper shows through as the third colour (walls, highlights, water sparkle).
> - Crisp, bold, simple shapes with a clean continuous silhouette suited to die-cutting: no thin isolated wisps, no floating separate pieces.
> - No white cut border, no outline around the card, no card frame, no paper texture, no background scenery beyond what is described, nothing touching the image edges; leave generous plain white margin all round.
> - No text, letters, numbers, numerals, logos or signage of any kind. No people, no faces.
>
> Subject:

The two tree cards are shared: `tree-conifer` stands on home, Turin and now, `tree-round` on
Turin and cuneo-2022.

**Processing.** `bun run generate:path-cards` (`scripts/prepare-path-cards.ts`, about 40 s
for a full run with previews, on 2026-10-29) turns each original into the ink-separation texture the board reads:

- each pixel is unmixed into terracotta and slate-blue coverage by optical density (the inks as
  filters over the paper, so overprint reads as both inks and a halftone edge as a little of
  one), against the paper colour read from the image's border;
- the die cut is everything printed plus a 0.035-unit white margin, with enclosed paper kept
  (cut only in `turin-coils`, whose ring centres the Mole shows through) and specks dropped;
- the halftone screen is smoothed (a 1.5 px blur at source size) to continuous coverage, since
  it is finer than the board shows and cost most of each file: at 300 texels per unit the Bisalta
  was 180 KB lossless with the screen, 135 KB without it, and 67 KB lossy (q85) without it;
- each card is cropped to its cut and scaled to 256 texels per scene unit (at most 1024), then
  encoded lossless if that fits in 60 KB, else lossy at the highest quality that does. Lossy
  WebP subsamples colour, which bleeds one ink's channel into the other's. Once descreened, that
  bleed measured a mean error of about 3 levels in 255 on the Bisalta and the belfry, and was
  not visible in the previews.

The originals in `vendor/path-cards/` are lossless WebP re-encodes, at full resolution, of the
PNGs GPT Image returned; they are not the returned files byte for byte. Together they come to
25 MB. `--import <png> <name>` adds one. The C2PA manifest does not survive the re-encode.

Previews (each card recombined with an approximate light and dark palette, for judging the
separation by eye) are written by `--preview <dir>`; they are not shipped.

| Asset                                           | Made with                                                                                    | From                                                                                                                                                                                                                                                                                                                                                                                                                 | Production                           | Revisions | Shipped                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------- | ----------------------------------------------------------- |
| `public/path/cards/cuneo-2022-mvp-window.webp`  | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: A single tall window of an Italian building: a terracotta frame with shutters open to each side, the glass panes filled with slate-blue halftone so the window looks unlit and dim. Front elevation, flat bottom edge.                                                                                                                                                                | 06:51:40–06:52:42 (62 s), 1374×1145  | None      | 5.8 KB, 146×154 (budget 60 KB); original 1.44 MB            |
| `public/path/cards/cuneo-2022-schoolroom.webp`  | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: A schoolroom: an Italian school building's front wall cut away to show the classroom inside, a dark slate-blue blackboard with nothing written on it, a teacher's desk and rows of small student desks and chairs in terracotta, tall windows on each side. Front elevation, wide, flat bottom edge. No people, nothing written on the board.                                         | 06:51:40–06:52:29 (49 s), 1585×992   | None      | 46.5 KB, 768×475 (budget 60 KB); original 1.33 MB           |
| `public/path/cards/home-bisalta.webp`           | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: The Bisalta, the mountain behind Cuneo in the Ligurian Alps: one broad mountain with two distinct rocky summits of similar height side by side (a twin-peaked, bifid crest), rising straight off a flat plain with no foothills; snow streaks and rock bands in slate blue, sunlit faces in terracotta. A wide backdrop card, the mountain spanning the full width, flat bottom edge. | 06:51:40–06:52:39 (59 s), 1586×992   | None      | 50.4 KB, 973×405 (budget 60 KB); original 1.34 MB           |
| `public/path/cards/home-plateau.webp`           | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: A low, wide wedge-shaped plateau seen from the front, with two winding rivers in slate blue running along its left and right feet and meeting in front of it; the plateau's face is terraced terracotta earth with a few small rounded trees along the top. Very wide and low, flat bottom edge. No buildings.                                                                        | 06:51:40–06:52:59 (79 s), 1942×809   | None      | 43.0 KB, 922×255 (budget 60 KB); original 1.33 MB           |
| `public/path/cards/home-school.webp`            | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: A small Italian provincial high school building: a two-storey plastered block with a pitched terracotta-tile roof, a tall arched central doorway, regular rows of tall windows with shutters. Front elevation, flat bottom edge.                                                                                                                                                      | 06:51:40–06:53:08 (88 s), 1586×992   | None      | 36.1 KB, 461×214 (budget 60 KB); original 1.62 MB           |
| `public/path/cards/lille-belfry.webp`           | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: The belfry of the Chamber of Commerce in Lille, alone: a tall slender neo-Flemish brick tower, red brick in terracotta with pale stone bands left white, a large round clock face near the top with plain ticks and no numerals, then tiered open lantern stages and a pointed spire. Front elevation, tall and narrow, flat bottom edge.                                             | 06:52:29–06:53:28 (59 s), 993×1584   | None      | 54.4 KB, 223×870 (budget 60 KB); original 0.85 MB           |
| `public/path/cards/lille-bourse.webp`           | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: The Vieille Bourse in Lille seen from the street: a row of ornate Flemish mannerist house fronts in terracotta brick with richly carved pale stone window surrounds left white, steep slate-blue roofs with dormers, and in the middle a small square campanile tower with a little statue on top. Front elevation, wide, flat bottom edge.                                           | 06:52:39–06:54:02 (83 s), 1586×992   | None      | 52.5 KB, 768×451 (budget 60 KB); original 1.43 MB           |
| `public/path/cards/lille-clock-face.webp`       | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: A round clock face on a short post: a circular dial with a thick terracotta rim, plain white face with short tick marks only and no numerals, two slate-blue clock hands, mounted on a small slate-blue post with a flat foot. Flat bottom edge.                                                                                                                                      | 06:52:42–06:54:10 (88 s), 1585×992   | None      | 9.4 KB, 165×205 (budget 60 KB); original 0.78 MB            |
| `public/path/cards/lille-courtyard.webp`        | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: The arcaded courtyard of the Vieille Bourse in Lille: a low gallery of round stone arches on columns, terracotta brick above, slate-blue shaded vaults inside, a few bookstall tables and a chessboard table under the arches. Front elevation, wide and low, flat bottom edge. No people.                                                                                            | 06:52:59–06:54:10 (71 s), 1586×992   | None      | 45.1 KB, 614×310 (budget 60 KB); original 1.87 MB           |
| `public/path/cards/lille-pipe-loop.webp`        | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: A run of polished industrial process piping seen from the front: one long horizontal terracotta pipe with flanged joints, an elbow turning up at each end, and a slate-blue valve handwheel in the middle, on a few small slate-blue pipe supports. Very wide and low, flat bottom edge.                                                                                              | 06:53:08–06:54:00 (52 s), 1919×820   | None      | 37.2 KB, 922×248 (budget 60 KB); original 0.87 MB           |
| `public/path/cards/next-blank.webp`             | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: A plain blank card standing upright: a rectangular card left white paper with a thin terracotta border line, and across its middle a single horizontal row of exactly five equal empty circles drawn in a thin slate-blue line, evenly spaced. Five circles, not four, not six. Nothing else on the card.                                                                             | 06:53:28–06:54:38 (70 s), 1585×992   | None      | 17.3 KB, 666×371 (budget 60 KB); original 0.75 MB           |
| `public/path/cards/now-desk.webp`               | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: A startup work desk: a simple desk in terracotta with a drawer unit, a laptop and a large monitor (blank screens in slate blue), a desk lamp, a potted plant and an office swivel chair beside it. Front elevation, flat bottom edge. No people.                                                                                                                                      | 06:54:00–06:55:08 (68 s), 1586×992   | None      | 23.7 KB, 461×282 (budget 60 KB); original 1.12 MB           |
| `public/path/cards/now-office.webp`             | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: A modern small office front: a glass wall in a slate-blue frame, through which a meeting table and chairs and a shelf are visible, a terracotta wall section beside it with a potted plant. Front elevation, flat bottom edge. No people.                                                                                                                                             | 06:54:02–06:55:07 (65 s), 1585×992   | None      | 58.4 KB, 666×337 (budget 60 KB); original 1.32 MB           |
| `public/path/cards/switzerland-jet-d-eau.webp`  | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: The Jet d'Eau in Geneva: a single very tall, straight vertical plume of water rising from a small stone jetty, widening slightly and spraying at the top. The plume is mostly white paper with slate-blue halftone shading and edges; the jetty is terracotta. Tall and narrow, flat bottom edge. Clean continuous silhouette.                                                        | 06:54:10–06:55:07 (57 s), 1024×1536  | None      | 26.9 KB, 347×666 (budget 60 KB); original 0.78 MB           |
| `public/path/cards/switzerland-lake.webp`       | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: Lake Geneva seen from above Lausanne: a wide band of lake in slate blue with terracotta halftone ripples in front, and across it a jagged range of Alpine mountains (the Chablais Alps) in slate blue and terracotta. A wide, low backdrop card with a flat bottom edge. No boats, no fountain, no buildings.                                                                         | 06:54:10–06:54:56 (46 s), 1584×993   | None      | 59.7 KB, 973×366 (budget 60 KB); original 1.42 MB           |
| `public/path/cards/switzerland-roche-dial.webp` | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: A round analogue gauge dial on a short stand: a circular dial with a thick terracotta rim, a plain white face with only short tick marks (no numerals at all), a single slate-blue needle from the centre, mounted on a small slate-blue post with a flat foot. Flat bottom edge.                                                                                                     | 06:54:38–06:56:18 (100 s), 1312×1199 | None      | 10.8 KB, 179×205 (budget 60 KB); original 1.00 MB           |
| `public/path/cards/switzerland-sailboat.webp`   | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: A small sailboat on a short band of water: a white triangular mainsail and jib edged in slate blue, a terracotta hull, a slate-blue wave band at the bottom. Flat bottom edge.                                                                                                                                                                                                        | 06:54:56–06:55:56 (60 s), 1536×1024  | None      | 9.4 KB, 210×205 (budget 60 KB); original 0.94 MB            |
| `public/path/cards/tree-conifer.webp`           | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: A single stylised conifer tree: a stacked triangular crown in slate blue with terracotta halftone shading and a short terracotta trunk. Flat bottom edge.                                                                                                                                                                                                                             | 06:55:07–06:55:56 (49 s), 1312×1199  | None      | 12.6 KB, 185×230 (budget 60 KB); original 0.88 MB           |
| `public/path/cards/tree-round.webp`             | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: A single stylised deciduous tree: a round, lobed crown in slate blue with terracotta halftone highlights, and a short terracotta trunk. Flat bottom edge.                                                                                                                                                                                                                             | 06:55:07–06:56:49 (102 s), 1322×1190 | None      | 17.6 KB, 207×204 (budget 60 KB); original 1.42 MB           |
| `public/path/cards/turin-coils.webp`            | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: Two coils of copper wire, as used for a rotating magnetic field: two wide flat ellipse-shaped rings of wound copper wire, one tilted left and one tilted right so they cross in an X in the middle, drawn as thick terracotta bands with slate-blue winding lines. Each ring has a large empty open centre. Nothing else.                                                             | 06:55:08–06:56:23 (75 s), 1586×992   | None      | 42.2 KB, 358×270 (budget 60 KB); original 1.32 MB           |
| `public/path/cards/turin-mole.webp`             | GPT Image via `codex exec -i`, then `generate:path-cards`                                    | comp B + style block; subject: The Mole Antonelliana in Turin, alone: a square base building with a colonnaded front, then the tall four-sided ribbed dome, then the small temple-like colonnade (tempietto), then the lantern and the very tall slender spire with a small star at its tip. Front elevation, tall and narrow, flat bottom edge. No coils, no wires.                                                 | 06:55:56–06:57:01 (65 s), 1024×1536  | None      | 59.1 KB, 320×819 (budget 60 KB); original 1.02 MB           |
| `public/path/cards/grain.webp`                  | Code (`generate:path-cards`): tileable value noise in three octaves, plus fine tooth, seed 7 | —                                                                                                                                                                                                                                                                                                                                                                                                                    | Under 1 s                            | None      | 11.4 KB, 256×256, one channel stored as grey (budget 20 KB) |

## Voice (#150)

The clips are made by `bun run generate:path-voice` with macOS `say` (the stock "Samantha" voice),
encoded to mono HE-AAC at 16 kbps (`docs/path-measurements.md` has the sizes). The page labels
them as a synthetic voice, never as Lorenzo's.

## Open items

- **The macOS voice is for personal, non-commercial use only.** Apple's licence for the macOS
  system voices allows their output for personal, non-commercial use only. That is acceptable for
  the unmerged prototype, but the stage-4 voice, or any voice that ships, needs another provider:
  the generator's `--provider elevenlabs`, or another whose licence allows it.
