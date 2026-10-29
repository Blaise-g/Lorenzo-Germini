# The path board's cards are ink separations, coloured by a shader from the path tokens

Decided in v2's board ticket (comp B, "Risograph Pop-up"). Extends ADR-0008, and replaces the
path token list it names.

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
