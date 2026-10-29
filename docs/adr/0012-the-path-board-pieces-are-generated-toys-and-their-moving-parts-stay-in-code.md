# The path board's landmarks, props and marker are generated toys, and their moving parts stay in code

Decided in v3's toys ticket (v3-toys, 2026-10-29) and written down in v3-emil-polish, which
the toys ticket left it to. It reverses ADR-0010's "Generate every prop as a model: rejected
for now", and amends its "Everything on the board is solid geometry, modelled in code". The
rest of ADR-0010 stands: no text in the scene, one material treatment, one layout. ADR-0011's
light and grade apply to the toys as they do to the landmarks.

Beside the generated landmarks, the code-modelled props and marker read as a different kit: the
landmarks were painted, rounded toys, and the props around them were bare primitives. The owner
asked for one toy set across the board.

What ships:

- **The board's props and marker are generated toy models.** The thirteen side props and the duo (the
  figure and the robot) are GLBs under `public/path/models/`, listed in `props.json`, and load
  through the landmarks' lazy loader, LOD-aware as it is: a phone, and the governor's rungs from
  ×0.75 down, fetch the `.lod.glb`. Each is fitted into its box in `board.ts`, as a
  landmark is.
- **The code-modelled props and marker are retired as the board's art.** They stay only as the stand-in
  a toy replaces: they stand while it loads, and for good if its file is unlisted or fails. A
  toy that does not arrive is never a failure of its tile.
- **The parts that move stay in code.** A beat, a click or a moment moves a named part
  (`BEAT_NODE` in `piece-beats.ts`): the coils' windings, the dial's needle, the MVP window's
  shutters and glass, the clock's hand, the pipe. A generated mesh is one welded shell, so
  these are built in code, in the toy's paint, and set into the toy where the part goes. A spec
  (`tests/path-toys.spec.ts`) checks each toy carries every part its beat moves.
- **The GPU budget is 440 MB.** The toys' textures add 36.7 MB at full size. The worst case,
  2560×1440 ×2 with every landmark, prop and marker loaded at full size, measured 417.0 MB; 440
  MB is that with some headroom (`docs/path-measurements.md`).

## Considered options

**Keep the code-modelled props.** Rejected: beside the generated landmarks they read as a
different, plainer set, and the board stopped looking like one toy.

**Generate the moving parts as part of each model.** Rejected: a generated mesh has no named,
separable parts to rotate or light, so the beats would have nothing to move but the whole prop.

**Drop the stand-ins once the toys ship.** Rejected: a slow or failed file would leave an empty
spot on a tile, and the stand-in costs no transfer.

## Consequences

- A new prop lands as a GLB and its LOD plus an entry in `props.json`, and keeps the budgets in
  `docs/path-measurements.md`. If its beat moves a part, that part is built in code and named
  for `BEAT_NODE`.
- The stills are rendered again from the board once every toy has arrived
  (`generate:path-stills` waits on `data-path-landmarks="settled"`), so they show the toys and
  the duo, not the stand-ins.
