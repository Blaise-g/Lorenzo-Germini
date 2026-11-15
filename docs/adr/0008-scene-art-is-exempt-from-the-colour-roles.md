# Scene art is exempt from the seven colour roles and the design-system guard

Decided in #141 (Decision 12, Implementation Decision 7). Extends ADR-0001; does not replace it.

**Amended 2026-10-29 (v2 polish, then v3).** The six path tokens below are gone. ADR-0009
replaced them with four, `--path-paper`, `--path-ink-warm`, `--path-ink-cool` and `--path-fog`,
when the board became printed cards. ADR-0010 then retired the cards and the ink shader for a
solid board modelled in code, and ADR-0011 added `--path-ink-sun` and `--path-felt`, so
`tests/warm-print-design-system.spec.ts` now counts six. The exemption itself is unchanged: it
still covers `src/components/path/scene/`, which holds the board's code-modelled world, its
stand-ins, its light and its post chain.

**Superseded in part by ADR-0012** (v3-toys) for what the directory draws: the landmarks, props
and marker are generated toy models under `public/path/models/`, and only their stand-ins and
moving parts are scene code here.

ADR-0001 holds page colour to seven Warm Print roles, and the design-system guard
(`tests/support/design-system-guard.ts`) flags anything colour-shaped under `src/` outside the
token layer. The 3D path's scenes (ADR-0007) need colour that is not page interface: baked
lighting, shader colours, fog, outlines and generated textures quantised to a palette. None of it
is text, a control or a surface a visitor reads, and forcing it into seven roles would either
flatten the scenes or stretch the roles until they stop meaning anything.

What ships instead:

- **Scene art lives in one directory, `src/components/path/scene/`, and only there is it exempt
  from the guard.** The exemption is file-scoped, like `warm-print.ts`, and pinned by a test in `tests/warm-print-design-system.spec.ts`, so
  widening it is a deliberate act.
- **The path colour tokens** are `--path-ground`, `--path-tile`, `--path-prop`,
  `--path-accent`, `--path-outline` and `--path-fog`. They are declared in all three
  `globals.css` blocks — `@theme`, `.dark` and `@media print` — so light, dark and print each
  get a deliberate value. Scene code reads these tokens; generated textures are quantised to
  them.
- **Page interface colour keeps the seven roles.** The HTML overlay on `/path` — step list, text
  panel, "Flat site", Listen, Skip, Replay — is page interface and uses the roles, not the path
  tokens.

The tokens and the guard change are implemented with the scene work, not with this ADR.

## Considered options

**Retire the colour roles and the guard for `/path`.** Rejected: the overlay is ordinary page
interface, and the guard's value is that it has no holes beyond the ones a test pins.

**Fit scene colour into the seven roles.** Rejected: the roles name jobs on a page (ground, body,
faint, accent…), and a lit 3D prop has none of those jobs.

**An inline allowlist marker per file.** Rejected for the reason ADR-0004 gives: a per-site
marker gets forgotten, and the same marker can silence a genuine palette leak in page code.

## Consequences

**A colour literal anywhere else under `src/` still fails the guard.** Scene art that leaks into
a component outside the directory is a violation, as before.

**The path tokens are a separate set from the seven roles.** The parity check that all three
token sets declare the same seven role names has to count the path tokens separately, or it
reads them as an eighth role.
