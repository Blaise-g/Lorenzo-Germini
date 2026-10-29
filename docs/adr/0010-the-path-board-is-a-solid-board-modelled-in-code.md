# The path board is a solid board modelled in code, with no text in the scene

Decided in v3's world ticket (v3-world, 2026-10-29), from the v3 benchmark
(`docs/research/path-v3-benchmark/`). It supersedes ADR-0009 for the board's art and material.
ADR-0009's own column and pawn spot stand. Extends ADR-0008. ADR-0011 (v3-light) replaces its
baseline light, adds two path tokens, and raises the GPU budget the consequences below name.

**Superseded in part by ADR-0012** (v3-toys) for the landmarks, props and marker: they are
generated toys now, and the code-modelled ones stay only as stand-ins and moving parts. Its
"generate every prop as a model: rejected for now" is reversed there. The board, the tiles, the
path, the water, the trees and the grass are still modelled in code, and the scene still carries
no text.

The benchmark set v2's paper board against igloo, Bruno Simon and jesse-zhou. Beside them it read
as flat cards on a flat board. The owner's call for v3 was a solid tabletop board game with its
own identity, and nothing written in the scene. The page's text, the overlay and the voice say
what the board shows.

What ships:

- **Everything on the board is solid geometry, modelled in code** (`world.ts`, `props.ts`).
  - The board is a thick bevelled slab with a raised frame.
  - Each tile is a chamfered octagon extruded with a bevel. A colour band, a thin strip of its
    own in the tile's colour, runs along its front edge, and the card grain is a bump map on its
    top.
  - Stepping stones follow the path between the tiles.
  - The pawn is lathe-turned.
  - The trees and grass are instanced, and the grass sways in the vertex shader.
  - The water's normals scroll and it foams at its banks.
  - The board renders on demand, so the grass and the water move only while something else
    does. Motion that never stops is a later package's.
  - Every prop the steps name is a solid.
- **No text in the scene.** The tile names, plaques, the MVP tag, and the canvas label machinery
  that drew them are gone. A step's figure is in its line, which the overlay shows and the voice
  reads. `tests/path-scene-contract.spec.ts` fails if a scene module draws glyphs.
- **One material treatment.** Every surface is a `MeshStandardMaterial`, rough by default
  (0.82). Only what would shine is smoother: the water, the pawn, glass and screens, the
  Jet d'Eau, and the copper and pipe. Its colour is a tone (`paint.ts`): a path token mixed
  toward another and shaded. A theme change repaints every material from one palette, and
  the colours stay in `globals.css` under ADR-0008. The tokens are ADR-0009's four, unchanged.
- **One baseline light.** A hemisphere light, a sun with PCF soft shadows (1024²), a small PMREM
  room for fill, and AgX tone mapping. A later package grades the light; this is the baseline the
  models are judged by.
- **Landmarks are models when they ship, stand-ins until then.**
  - `scene-assets.ts` names the seven landmarks a generated model may replace. Each entry gives
    the tile, the prop, the piece whose box it fills, its file, a scale, the anchor and the turn.
  - The board asks for a file only when `public/path/models/landmarks.json` lists its id.
    Otherwise the code-modelled stand-in stands, and nothing is requested.
  - A listed file that 404s also stands in.
  - One that fails to arrive is its tile's `assets-failed`, and one that does not parse is its
    `scene-failed`. Both are tried again on the tile's next selection.
- **One layout, read by everything.** `board.ts` places every piece as a box on its tile. The
  camera frames those boxes, the pawn keeps clear of them, and the spec checks that each built
  piece stays inside its own box. `path-spline.ts` gives the closed CatmullRom spline through the
  tile centres and each tile's anchors. Today only the stepping stones follow it; the pawn
  hops straight between its spots, and the camera reads `board.ts`. It is the seam the camera
  rig takes up.
- **Nothing from any commercial board game's trade dress.** There is no corner-square layout,
  colour-group bar or deed card, and no named game's fonts or logo. The colour band is the path's
  two inks, and the tiles are octagons on a loop.

## Considered options

**Keep the cards and stand them on thicker tiles.** Rejected: a card is still a flat picture,
and printed text in the scene is what the owner asked to remove.

**Generate every prop as a model.** Rejected for now. A landmark is worth a model, and the
landmark package makes them. A tree, a dial or a desk reads well enough as a few primitives, and
costs no transfer.

**Probe for each model with a request and let a 404 stand in.** Built first and rejected. While
no model has shipped, every visit fired seven requests that 404. In `next dev`, each 404 renders
the not-found page, which made the tour's settle wait race the fake clock in the suite. The index
costs one small static request.

## Consequences

- A palette change is still a token change, in CSS only. The stills are rendered again from the
  board (`generate:path-stills`).
- `generate:path-cards`, `vendor/path-cards/`, the card manifest and the ink shader are gone
  (`docs/path-assets.md`, "Retired in v3").
- A new landmark model lands as a file under `public/path/models/` plus an entry in
  `landmarks.json`, fitted into its piece's box. It must keep the budgets in
  `docs/path-measurements.md`: about 10 MB of GPU headroom at the largest stages, and the
  transfer under 1.5 MB.
