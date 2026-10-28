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
| Belfry mesh                            | Hunyuan3D-2 (`hunyuan3d-dit-v2-0`), HF Space `tencent/Hunyuan3D-2`, `/shape_generation`, seed 1234 | The belfry reference                                                                                 | 23:43:34–23:43:45 (11 s; 6.6 s on the GPU), 134,398 faces          | 1. The first call (23:42:07–23:42:20) generated, but my client script misread the result. Fixed and rerun.                                                                                                     | —                                        |
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
- **The stills' plaque is blank.** The live scene sets the figure on the plaque from the step's
  line ("10,000 m³ a year — projected saving"). The paintings leave the plaque blank, so no
  generated text can drop "projected". The figure is in the text panel either way.
- **The stills are not quantised to the tokens.** Research §9 asks that of generated textures.
  Quantising a painted still would posterise it. Both paintings were prompted with the path
  tokens' values for their mode.
- **Regenerating.** `generate:path-stills` never overwrites a painted scene's stills
  (`PAINTED_SCENES` in `build-plan.ts`). It writes their grey boxes to a scratch directory and
  only checks the painted stills against the 150 KB budget. A change to Lille's geometry therefore
  needs its stills painted again over the new grey boxes, with the prompts above.

## Home (#148)

Home's stills are grey-box renders, regenerated by `generate:path-stills` with no generation
step. #149 regenerated them at 23:53 after the outline change (the normal-extruded hull, and the
Bisalta's lathe profile turned to face outward).
