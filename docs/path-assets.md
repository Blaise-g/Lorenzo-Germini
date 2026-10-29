# The 3D path's asset log

Every generated asset `/path` ships: the tool that made it, what it was made from, and how long it
took to make and revise. #152's measurement report reads production and revision time from here.
The pipeline is #141's decision 11 and research §9 (`docs/research/experience-rethink.md`). Code owns
the style. v1 used Hunyuan3D for Lille's silhouettes, and v2's paper board retired those meshes
(see Lille below). v2's board stood die-cut cards that GPT Image made through Codex; v3's solid
board retired them in turn (see "The solid board" below). Since v3 the board is modelled in code,
and generated landmark models land through `public/path/models/landmarks.json`.

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

**Retired in v2.** The board of printed cards replaced the coded Lille scene, so nothing reads the
two Hunyuan3D meshes any more. They, `prepare:path-model` (`scripts/prepare-path-model.ts`) and its
quantised format (`model-format.ts`) were deleted on 2026-10-29 (ticket v2-polish); the rows above
stay as the record of how v1 was made. The reference images remain the source the belfry and Bourse
cards were checked against.

Notes (v1):

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

## Turin, Switzerland and ? (v2)

The other places "How this was made" lists, from `src/data/making-of.ts`. Each URL answered 200 to
a plain `curl -I`, no redirect, on 2026-10-29:

- **The Mole Antonelliana**, Turin's landmark, for the Polytechnic of Turin's step.
  Source: [it.wikipedia.org, Mole Antonelliana](https://it.wikipedia.org/wiki/Mole_Antonelliana).
- **Galileo Ferraris' rotating magnetic field**, the two coils round the Mole.
  Source: [it.wikipedia.org, Campo magnetico rotante](https://it.wikipedia.org/wiki/Campo_magnetico_rotante).
- **Lake Geneva** and **the Jet d'Eau**, for the Switzerland step.
  Sources: [fr.wikipedia.org, Léman](https://fr.wikipedia.org/wiki/L%C3%A9man),
  [fr.wikipedia.org, Jet d'eau de Genève](https://fr.wikipedia.org/wiki/Jet_d%27eau_de_Gen%C3%A8ve).
- **La Ghigliottina**, the quiz round of five clues and one word that the blank card's five empty
  slots draw from. Source: [it.wikipedia.org, L'eredità](<https://it.wikipedia.org/wiki/L%27eredit%C3%A0_(programma_televisivo)>).

## Drawn in code, not generated (v2 polish)

No generated asset. Recorded so the log is complete:

- **Hinge tabs.** Every card that folds up from a tile stands on a die-cut paper tab with chamfered
  ends, its cut edge ruled and its crease scored as a slate dashed line. One 256×40 separation,
  drawn by the runtime (`tabTexture` in `runtime.ts`); no time to make beyond the code.
- **The ? tile** prints its name once, on the tile's front strip like every tile; the blank card
  carries only its five empty slots.
- **The stills, rendered again (round 2).** All 14 by `generate:path-stills` from the board
  settled on each step, at 1440×900 ×1.5, after the stage became the board's own column (no cards
  laid over it but its tabs) and home's school card moved left to give the pawn room: 1380×1017,
  60.5–65.1 KB each (budget 150 KB), not timed, no revisions.

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

**Retired in v3.** The solid board (ticket v3-world, 2026-10-29) replaced every card with
geometry modelled in code, so nothing reads them any more. Deleted: the 21 shipped cards in
`public/path/cards/`, their originals in `vendor/path-cards/` (25 MB),
`scripts/prepare-path-cards.ts` and its `generate:path-cards` script, the card manifest
(`card-art.ts`), the ink-separation shader (`ink.ts`) and `tests/path-cards.spec.ts`. The rows
above stay as the record of how v2 was made. `grain.webp` is kept, moved to
`public/path/world/grain.webp`, and is now a bump map; nothing regenerates it, since its generator
went with `prepare-path-cards.ts`. It is 11.4 KB as made.

## The solid board (v3, drawn in code)

No generated asset: the whole board is modelled in code from three.js primitives, so it has no
production or revision time beyond the code (ticket v3-world, 2026-10-29). Recorded so the log is
complete.

| Part                    | In code                                 | Made from                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The board and its frame | `world.ts`, `makeBoard`                 | A bevelled rounded slab (`ExtrudeGeometry`) and a raised frame ring, 25.8 × 20.2 units                                                                                                                                                                                                                                                                                                                           |
| The tiles               | `world.ts`, `makeTileBase`              | A chamfered octagon extruded with a bevel, the card grain as a bump map, and a colour band along the front edge in a second material                                                                                                                                                                                                                                                                             |
| The path                | `world.ts`, `makePath`                  | Instanced stepping stones, spaced along the CatmullRom spline through the tile centres (`path-spline.ts`), off the tiles, in two tones                                                                                                                                                                                                                                                                           |
| The pawn                | `world.ts`, `makePawn`                  | A lathe-turned profile with a bevelled rim and a head                                                                                                                                                                                                                                                                                                                                                            |
| Trees and grass         | `props.ts`, `treeCluster`, `grassField` | Instanced trunks and faceted crowns; instanced three-blade tufts that sway in the vertex shader                                                                                                                                                                                                                                                                                                                  |
| Water                   | `paint.ts`, `water`                     | A scrolling normal map made in code (64×64 value noise, no request) and a foam line along the banks in the fragment shader                                                                                                                                                                                                                                                                                       |
| Every prop              | `props.ts`                              | The benchmark table's list: the plateau wedge and its two rivers, the Bisalta's twin crest, Ferraris' coils round a turning rotor, the lake, the Chablais backdrop, Roche's dial, a sailboat, the MVP window (frame, shutters, glass, no label), Lille's pipe loop and clock face, the startup desk (desk, monitor, lamp), the `next` plinth with five empty slots, and Quadrell and the Oracolo as small solids |
| Landmark stand-ins      | `props.ts`                              | Low-poly solids with each landmark's silhouette: the school, the Mole, the Jet d'Eau and its jetty, the schoolroom, the belfry, the Bourse and the office. Each stands until its model ships                                                                                                                                                                                                                     |

Colour is the path tokens' riso palette, mixed per surface in `paint.ts`. Every material is a
`MeshStandardMaterial` at high roughness. Nothing in the scene is text: the tile names, plaques
and the MVP tag are gone, with the canvas label machinery that drew them.

**Landmark models.** `scene-assets.ts` names the seven landmarks a generated model may replace.
Each entry gives the tile, the prop, the piece whose box it fills, the file under
`/path/models/`, a scale, the anchor, the turn and the caption line. The board asks for a file
only when `public/path/models/landmarks.json` lists the id. An id the index does not list
stays its stand-in, with no request; the shipped models are under "Landmarks (v3)" below.

**The stills, rendered again (v3).** All 14, made by `generate:path-stills` from the solid board
settled on each step, at 1440×900 ×1.5: 2040×833, 33.2–36.5 KB each (budget 150 KB). Not timed.
Rendered three times: after the shadow map went from 2048² to 1024² for the GPU budget, and
again after the review moved the water's foam before lighting.

## Landmarks (v3)

Seven textured landmarks for the 3D path, one per board id, in `public/path/models/` with
their manifest `landmarks.json`. Each reference went to TRELLIS.2 and Pixal3D (the belfry also to Hunyuan3D-2.1), run in one private paid Space, `Blaise-g/bake-trellis2`, reused as a slot and switched between models and hardware, on the `Blaise-g` account (`sleep_time` 300; every attempt logged, 123
rows, in `/tmp/orch-path-v2/bakeoff/log.jsonl`). The picks were judged on renders (front,
three-quarter, clay and wire, at full detail and at the LOD); the side-by-sides and 6 s muted
turntables are in `/tmp/orch-path-v2/landmarks/`.

**References.** GPT Image via `codex exec ... < /dev/null`, 1024×1024, each checked full size
for text, signage, people and logos (none). Every prompt ends with the same requirements: a
single isolated object for image-to-3D, three-quarter view from about 20° above, plain white
background with no ground or shadow, soft even studio light, a crisp stylised architectural
model look, no text, letters, numbers or signage, no people, vehicles or other buildings.
Prompts and logs are in `/tmp/orch-path-v2/bakeoff/refs/`.

| Reference               | Subject (prompt, abridged)                                                                                                                        | Made                     | Bytes     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------- |
| `lille-belfry`          | The CCI belfry (Cordonnier, neo-Flemish, 1910–21): slender red-brick tower, pale stone bands, round clock with plain ticks, tiered lantern, spire | 10:44:57–10:46:12 (75 s) | 991,868   |
| `mole-antonelliana`     | The Mole Antonelliana: colonnaded square base, tall ribbed dome, lantern temple, very tall spire with a star; dome and spire dominate             | 10:44:57–10:45:58 (61 s) | 1,044,376 |
| `jet-deau-jetty`        | The Jet d'Eau's jetty without the jet: long narrow masonry pier, low parapet, small lighthouse at the far end, cut flat at the waterline          | 11:36:24–11:37:19 (55 s) | 971,009   |
| `liceo-facade`          | A generic Italian liceo, no identifiable building: three storeys, ochre render, stone surrounds, green shutters, portal, terracotta roof          | 11:36:24–11:37:44 (80 s) | 1,519,706 |
| `liceo-classroom-block` | The classroom wing of the same generic liceo: two storeys, tall shuttered windows, plain side door, terracotta roof                               | 11:36:24–11:37:24 (60 s) | 1,241,813 |
| `vieille-bourse-arcade` | One wing of the Vieille Bourse courtyard: arched gallery on columns, two storeys of red brick with carved stone, steep roof with dormers          | 11:36:24–11:37:27 (63 s) | 1,583,769 |
| `office-front`          | A small generic modern office: glass curtain wall in dark mullions, light concrete frame, recessed entrance, flat roof, no logos                  | 11:36:24–11:37:24 (60 s) | 1,088,736 |

All times are UTC on 2026-10-29.

**Models.** Generation used seed 1234, resolution 1024, and extraction to 10,000 faces with a
2048 texture. Our Space copies were patched to run; the patches and the per-run logs are in
`/tmp/orch-path-v2/bakeoff/` (`space.py`, `logs-*.txt`).

- **TRELLIS.2-4B** (MIT), from `microsoft/TRELLIS.2@ebf60b20`, on RTX PRO 6000 ($2.75/h).
  Patches: OpenEXR enabled for OpenCV, a libstdc++ preload, the minimum face slider at 1000,
  BiRefNet (MIT) in place of the gated RMBG background remover, and DINOv3 loaded from the
  `camenduru/dinov3-vitl16-pretrain-lvd1689m` mirror (see Open items).
- **Pixal3D** (MIT), from `TencentARC/Pixal3D@40a1519a`, on RTX PRO 6000. The TRELLIS.2
  patches, plus `trimesh>=4.10.1`, MoGe pinned at `07444410`, `skip_validation`, and a flat grey
  HDRI where upstream's `sunset.exr` is missing and OpenCV 5.0 reads no EXR. It builds in its
  estimated camera's frame, so a model comes out tilted by the reference's view pitch.
- **Hunyuan3D-2.1** (Tencent Hunyuan 3D 2.1 Community License), from
  `tencent/Hunyuan3D-2.1@61d23d8c`. Its licence territory excludes the EU, the UK and South
  Korea; the owner accepted that exclusion on 2026-10-29. The shipped belfry is the round-one
  output of the public `tencent/Hunyuan3D-2.1` Space on ZeroGPU (no cost to us). Our paid copy
  (Python 3.10, Gradio 5.33.0, `bpy` optional, pydantic 2.11.7, `zero.startup()` guarded) never
  generated: L40S twice failed to schedule (12:28 and 13:08), and on the A100 attempt (restarted once after a patch, for `spaces.zero` having no `startup`) all six landmarks failed with `tensor does not have a device` from a C++ extension. The
  rasteriser wheel does carry sm_80, so the architecture was not the cause. The cause is
  the torch version: upstream leaves torch unpinned (ZeroGPU supplies it), so our build took
  2.14.1, while the prebuilt `custom_rasterizer` wheel was compiled against torch 2.7. The
  error's source line, `TensorImpl.h:1265`, is the device check only in torch 2.6–2.8 (2.14.1
  has it at 1302), and all 17 header assertion lines compiled into the wheel match 2.7.0 and
  2.7.1 exactly. Against 2.14's `TensorImpl` layout, the wheel's inlined code finds no device.
  The fix pins `torch==2.7.1` and `torchvision==0.22.1` in our copy.
- **Hi3DGen** (`Stable-X/Hi3DGen`, A10G large) was dropped: two builds failed, and the third,
  patched, died at startup compiling nvdiffrast. Hi3D v1.0 was not tried (refinement only, a
  custom licence), nor UniForge3D (multi-view input, CC BY-NC).

**Spend.** 111.8 GPU-minutes, about $4.45 (totals taken before rounding), under the 140-minute cap the Coordinator set for the A100 attempt (the ticket's was 120). Build minutes on paid
hardware are counted.

| Model         | Hardware     | Minutes | Cost  |
| ------------- | ------------ | ------- | ----- |
| Hunyuan3D-2.1 | L40S         | 27.1    | $0.81 |
| Hunyuan3D-2.1 | A100 large   | 23.3    | $0.97 |
| Pixal3D       | RTX PRO 6000 | 35.0    | $1.60 |
| TRELLIS.2     | RTX PRO 6000 | 19.0    | $0.87 |
| Hi3DGen       | A10G large   | 7.3     | $0.18 |

Every bake-off Space was deleted by 13:46:28; the account's listing shows only its five
older CPU Spaces.

**Cleanup.** `bun run prepare:path-landmarks` (`scripts/prepare-path-landmarks.ts`) reads the masters in `vendor/path-models/<id>.glb` and writes `<id>.glb` and `<id>.lod.glb`.
Both are cut from the same master: normalised (pitch, then yaw, then Y up, base at y=0,
centred on x/z, height 1), welded, simplified to 10,000 and 2,500 triangles (seams kept where
the target allows, across them otherwise), with WebP textures at 1024 and 512 (other maps at
half that) under `EXT_texture_webp`, meshopt compression and a prune. Budgets: 450 KB full,
160 KB LOD. `--import <glb> <id>` makes a master from a raw output: lossless WebP textures, geometry meshopt-quantized to 16 bits (normals 12), no resize or simplify. No generator double-shaded visibly in the turntables, so no
landmark is de-lit (`flattenShading` 0).

KTX2 is deferred. WebP saves bytes on the wire but decodes to RGBA in GPU memory: a 1024²
texture with mips is about 5.6 MB there, against about 1.4 MB as BC7/ASTC (UASTC) or about
0.7 MB as ETC1S. At 2048² that is about 22 MB against 5.6 MB or 2.8 MB.

| Asset                   | Model, generated (UTC)                                            | Cost   | Turned                                                | Raw → master            | Shipped full                | Shipped LOD                |
| ----------------------- | ----------------------------------------------------------------- | ------ | ----------------------------------------------------- | ----------------------- | --------------------------- | -------------------------- |
| `home-school`           | TRELLIS.2, from `liceo-facade`, 13:13:54–13:15:40 (107 s)         | $0.081 | —                                                     | 1,937,852 → 1,559,108 B | 438,472 B, 9,586 triangles  | 134,800 B, 2,436 triangles |
| `turin-mole`            | Pixal3D, 12:48:13–12:49:27 (73 s)                                 | $0.056 | — (level to 1°)                                       | 1,408,112 → 1,052,360 B | 349,192 B, 9,951 triangles  | 110,304 B, 2,402 triangles |
| `switzerland-jet-d-eau` | TRELLIS.2, 13:13:17–13:13:54 (37 s)                               | $0.028 | yaw 44.1°, long side to +Z (footprint PCA)            | 1,381,696 → 1,072,508 B | 286,848 B, 9,659 triangles  | 107,368 B, 2,499 triangles |
| `cuneo-2022-schoolroom` | Pixal3D, from `liceo-classroom-block`, 12:57:39–12:58:25 (46 s)   | $0.035 | pitch 12°, yaw -39.3° (base plane fit; level to 0.2°) | 1,274,704 → 958,852 B   | 326,752 B, 9,733 triangles  | 111,036 B, 2,500 triangles |
| `lille-bourse`          | TRELLIS.2, from `vieille-bourse-arcade`, 13:11:45–13:13:17 (92 s) | $0.07  | —                                                     | 1,903,284 → 1,485,496 B | 407,596 B, 9,759 triangles  | 120,752 B, 2,454 triangles |
| `lille-belfry`          | Hunyuan3D-2.1, ZeroGPU, 10:46:39–10:48:48 (129 s)                 | Free   | —                                                     | 6,125,988 → 2,972,376 B | 252,544 B, 10,000 triangles | 91,752 B, 2,500 triangles  |
| `now-office`            | TRELLIS.2, from `office-front`, 13:16:34–13:18:54 (140 s)         | $0.107 | —                                                     | 1,701,128 → 1,367,616 B | 357,420 B, 8,932 triangles  | 129,444 B, 2,490 triangles |

The six paid picks were generated in the `Blaise-g/bake-trellis2` slot on RTX PRO 6000; the belfry in the public `tencent/Hunyuan3D-2.1` Space on ZeroGPU. Generation costs are the run's seconds at the hardware's rate; the build and idle minutes are
in the spend table. The belfry's raw base colour is a PNG, though round one saved its sidecar
as `tex0.jpeg`.

**Why each pick.**

- `lille-belfry`, Hunyuan3D-2.1: the best by a clear margin, with the brick colour, crisp clock
  faces and the proportions. TRELLIS.2's is yellowed, and Pixal3D's is thin, pale and tilted
  5.4°.
- `turin-mole`, Pixal3D: the spire stays joined and the model stands level. TRELLIS.2's spire
  floats in detached pieces, with a dark patch on the dome.
- `switzerland-jet-d-eau`, TRELLIS.2: upright and clean. Pixal3D adds a detached stray piece.
- `lille-bourse`, TRELLIS.2: it keeps the wing, the arcade and the dormers. Pixal3D collapses
  it into a tall gabled block.
- `home-school`, TRELLIS.2: upright, with the window grid and the entrance. Pixal3D's has
  holes through roof and walls, and leans.
- `cuneo-2022-schoolroom`, Pixal3D: clean walls and roof once levelled. TRELLIS.2's roof is
  shredded.
- `now-office`, TRELLIS.2: upright, with the entrance and the mullions. Pixal3D's leans 11.5°
  and is blurry.

The losing candidates are not committed: `/tmp/orch-path-v2/bakeoff/out/trellis2/` and
`out/pixal3d/` (`*.textured.glb`, the generators' `*.lod.glb`), and TRELLIS.2's 300k-face
extractions in `out/trellis2/raw300k/`.

## Voice (#150)

The clips are made by `bun run generate:path-voice` with macOS `say` (the stock "Samantha" voice),
encoded to mono HE-AAC at 16 kbps. The page labels them as a synthetic voice, never as Lorenzo's.

Since v3 the voice tells every step, from the cues in `src/data/path-narration.ts`. The generator
says each cue on its own, trims its silence, joins the cues with 350 ms between them, and records
each cue's start and end in `public/path/voice/manifest.json`. The captions and the tour run on
those timings. It then decodes the encoded clip back and refuses a clip whose length moved more
than 60 ms in encoding. Clips are staged and published together, so a failed run leaves the last
set in place. It flags a clip outside 15–30 s or over 60 KB.

| Step          | Clip                                | Cues | Length  | Size    |
| ------------- | ----------------------------------- | ---- | ------- | ------- |
| `home`        | `public/path/voice/home.m4a`        | 5    | 16.42 s | 40.0 KB |
| `turin`       | `public/path/voice/turin.m4a`       | 4    | 16.67 s | 40.8 KB |
| `switzerland` | `public/path/voice/switzerland.m4a` | 6    | 29.22 s | 65.8 KB |
| `cuneo-2022`  | `public/path/voice/cuneo-2022.m4a`  | 5    | 19.01 s | 45.2 KB |
| `lille`       | `public/path/voice/lille.m4a`       | 6    | 27.66 s | 63.3 KB |
| `now`         | `public/path/voice/now.m4a`         | 8    | 28.45 s | 64.3 KB |
| `next`        | `public/path/voice/next.m4a`        | 5    | 16.00 s | 39.0 KB |

Durations were checked with `afinfo` and a muted decode; nothing was played aloud, so how the
voice says "m³", "TL;DR" and "SMEs" is unheard.

## Sound (v3)

The board's sound, behind the Sound switch beside Voice (§4(e) of
`docs/research/path-v3-benchmark.md`), is all synthesized in code with plain Web Audio, in
`src/app/path/sound-engine.ts`. No recordings, so there is nothing to license or log, and
`public/path/sound/` was never created. **0 bytes download**, with the switch off or on. The
bed is rendered once on an `OfflineAudioContext` when the switch first goes on.

| Sound               | Made from                                                                                              | Length    |
| ------------------- | ------------------------------------------------------------------------------------------------------ | --------- |
| hop                 | band-passed noise knock over a triangle click at 880 Hz, pitch ±3%                                     | 0.08 s    |
| land                | sine falling 130 to 58 Hz, low-passed noise slap                                                       | 0.4 s     |
| rise                | noise swept up 380 to 1700 Hz through a band, small knock at the end                                   | 0.75 s    |
| beat-high, beat-low | soft mallet (a fundamental and a quieter partial at ×3.93) on G5 and C5                                | 0.7 s     |
| skip                | noise whoosh, band swept 320 to 2400 to 600 Hz                                                         | 0.8 s     |
| end                 | C major mallets, struck 45 ms apart                                                                    | 2.4 s     |
| bed                 | low-passed noise breathing twice a loop, nine seeded bird calls, last second crossfaded into the first | 20 s loop |

The bed sits at 0.32 against the effects and ducks 9 dB (×0.355) under the voice in 150 ms.
Every sound was checked by rendering offline and measuring peak, RMS and where it falls
silent (`tests/path-sound.spec.ts`), never by playing it aloud.

## Open items

- **The macOS voice is for personal, non-commercial use only.** Apple's licence for the macOS
  system voices allows their output for personal, non-commercial use only. That is acceptable for
  the unmerged prototype, but the stage-4 voice, or any voice that ships, needs another provider:
  the generator's `--provider elevenlabs`, or another whose licence allows it.
- **Three clips are over 60 KB** (switzerland, lille, now), from 63 to 66 KB, at the long end of
  the 15–30 s range.
- **The ElevenLabs path is untested since v3.** It now also decodes through macOS `afconvert`
  to measure the cues.
- **DINOv3 came from a mirror.** TRELLIS.2 and Pixal3D condition on DINOv3, and our Space
  copies loaded it from `camenduru/dinov3-vitl16-pretrain-lvd1689m`, which skips Meta's licence
  gate. Whether the DINOv3 licence's terms reach the generated landmarks was not checked.
- **Hunyuan3D-2.1 covers only the belfry so far.** Our paid copy never generated (A100: `tensor
does not have a device`, traced above to the unpinned torch), so it was not compared on the
  other six. The owner asked for a retry on the four buildings with the torch pin. It waits
  on Hugging Face's Space-creation limit (20 a day): a create at 14:40 on 2026-10-29 was
  refused with "retry in about 22 hours". Its licence excludes the EU,
  the UK and South Korea; the owner accepted that on 2026-10-29.
- **Known flaws in the picks.** `home-school` has see-through window holes. `lille-bourse` has
  pale brick and a crumpled roof. `cuneo-2022-schoolroom` grew an annex the reference does not
  have, and as Pixal3D output it does not quite match the TRELLIS.2 facade beside it.
- **The LOD can drift up to 1% of the height** from the full file's bounds, since both share one
  placement and simplifying pulls extremes in. It never sinks below the ground.
- **KTX2 textures are deferred.**
