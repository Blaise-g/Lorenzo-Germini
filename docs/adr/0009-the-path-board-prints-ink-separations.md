# The path board's cards are ink separations, coloured by a shader from the path tokens

Decided in v2's board ticket (comp B, "Risograph Pop-up"). Extends ADR-0008, and replaces the
path token list it names.

**Superseded by ADR-0010** (v3-world, 2026-10-29) for the board's art and material. The board is
now solid geometry modelled in code, and the cards, the ink shader and the scene's printed text
are retired. Still standing from this ADR: the board's own column and the pawn's spot. ADR-0011
(v3-light) replaced supersampling with SMAA and raised the path tokens from four to six.

The `/path` board is printed card: seven tiles whose die-cut cards fold up, in two risograph inks
on cream stock. It has to read the same in light, dark and print, as every scene does under
ADR-0008, and its art is generated rather than drawn by hand, so it will be regenerated.

What ships:

- **A card's texture is an ink separation, not a picture.** R is the terracotta ink's coverage,
  G the slate blue's, A the die-cut mask with its white margin, and B is unused: the shader
  never samples it, so the lossy encoding six of the cards use may leave it off zero. The same shape covers the cards
  (`public/path/cards/`, whose manifest is `card-art.ts`) and the board's own prints: tile tops,
  plaques, the MVP tag and the pawn, all drawn in code on three canvases and merged
  (`drawnInk` in `ink.ts`).
- **One shader colours every card** (`inkMaterial` in `ink.ts`, a patched Lambert material).
  Each ink is multiplied into the stock as a riso drum lays it, so overlaps mix. On dark stock no
  overprint is brighter than its brightest ink. The shader also adds what a print has: the
  stock's grain from `grain.webp`, tiled at one size in scene units; a round-dot screen at each
  ink's own angle, in the mid-tones only; and each ink a hair off register. A card fading in is
  dithered rather than blended, so the board needs no sorting and its shadows stay crisp.
- **A card's white cut edge is its art's margin; its thickness is stock a shade darker.** The
  die-cut mask carries the white margin round every shape, and the card's back layer, a hair
  behind it, prints bare stock at 86% so the cut reads as a thickness against the face. Pure
  white there would glow on dark stock.
- **The path tokens are the stock, the two inks and the table:** `--path-paper`,
  `--path-ink-warm`, `--path-ink-cool` and `--path-fog`, in all three `globals.css` blocks. They
  replace ADR-0008's six (`--path-ground`, `--path-tile`, `--path-prop`, `--path-accent`,
  `--path-outline`, `--path-fog`). The names hold letters only, because the token test counts
  `--path-[a-z-]+`. `palette.ts` spells each name out whole, because Tailwind emits an `@theme`
  variable only when its scanner finds the name in a source file.

- **A card standing on a tile folds up from a glued tab** (added in v2 polish, 2026-10-29). The
  tab is one more separation drawn in code (`tabTexture` in `runtime.ts`): stock with chamfered
  ends, its cut edge ruled and its crease scored in the cool ink as a dashed line. It lies flat in
  front of the card's foot, fades and grows with the card, and never turns. It stops short of the
  tile's printed name; a card mounted on another card has none.
- **The board is supersampled, not multisampled** (v2 polish, round 2). The renderer runs with
  `antialias: false` and draws at a pixel ratio of 2 at least, up to the screen's own, capped by
  `MAX_DRAWING_PIXELS` (`drawing-buffer.ts`). Printed card is mostly fine line and halftone
  dots, which multisampling does not smooth, as it smooths only polygon edges; drawing at twice
  the CSS size smooths both, and at 12 bytes a pixel rather than 36 lets a 1440×900 ×2 stage
  draw at its own sharpness inside the 64 MB budget (`docs/path-measurements.md`).
- **The board has its own column, under one printed step strip** (v2 polish, round 2). Comp B
  lays the step list and the text panel over a full-screen board; round 1 built that, and the board, framed round both, came out small, with tiles that could sit under the panel. On a wide screen the steps
  are now one card strip across the top, the same component as the phone's strip at a wider
  size, with the board below it on the left and the transport and a full-height text panel on
  the right. The board's own tabs, Replay and the turns, are printed on its frame at the
  bottom-left. The reason is the board's size; the comment over the world in `page.tsx` keeps it.
- **The selected tile lifts, and the pawn stands beside its name** (v2 polish, round 2). The
  selected tile rises a little off the table, eased, and drops when another is selected. The
  pawn stands on a spot found for each tile (`pawnSpotOnTile` in `board.ts`): behind the name
  band, clear of every card standing on the tile and its tab. Home's school card moved left of
  centre to leave that spot room.
- **Every piece stays paper.** Lille's pipe loop is a printed card, not a modelled terracotta
  tube as comp B draws it: one shaded mesh would be the only thing on the board not printed by
  the ink shader, and would read as from another set.

## Considered options

**Full-colour card art, one set per mode.** Rejected: twice the transfer, against a 1.5 MB
budget the cards already use half of, and a dark set that drifts from the light one with every
regeneration.

**A greyscale card, tinted by one colour.** Rejected: comp B is two inks that overprint, and one
tint loses the overprint and the misregistration that make it read as riso.

**Procedural grain only, no `grain.webp`.** Tried first. It cost eight `sin` calls a pixel,
which is slow on software GL, and gave no tooth beyond value noise. The texture is 11 KB and one
lookup.

## Consequences

- Card art is regenerated freely, as long as it stays a separation: `generate:path-cards` cuts
  it to this format, and `tests/path-cards.spec.ts` pins the channels.
- A palette change is a token change, in CSS only. No art is redrawn, and the stills are rendered
  again from the board (`generate:path-stills`).
- ADR-0008's guard exemption covers the shader. Its colour arithmetic lives in
  `src/components/path/scene/`.
