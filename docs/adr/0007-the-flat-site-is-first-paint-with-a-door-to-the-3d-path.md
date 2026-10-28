# The flat site at `/` is the first paint, with a door to an opt-in 3D path at `/path`

Decided in #141 (Decisions 6, 12, 13 and 14; Implementation Decision 6), aligned with the owner on 2026-10-28. Vocabulary:
`GLOSSARY.md`, "The path".

The homepage becomes the path: Lorenzo's life as seven steps that a visitor can pick in any
order. The people who hire him still have to find what he does, his results and his email at
once, so the path ships twice:

- **The flat site at `/`** is the first paint for everyone. It shows the path in plain HTML,
  server-rendered with every step's text in the page, and loads no 3D code and plays no sound.
- **The 3D path at `/path`** is opt-in. Each step's scene builds on demand there. A large "Walk
  the path in 3D" link in the flat site's header — the door — leads to it, and reads "Continue
  the path" for a visitor who has entered before. Nothing opens `/path` on its own, and `/path`
  always offers a "Flat site" link back.
- **The door ships last.** The flat site ships first with no door, as the plain baseline. `/path`
  is built with Lille finished and home rough, compared with the flat site on about five people
  from the audience, and judged by the owner. Only then is the door switched on, by a code
  constant that is off by default.

## Considered options

**A choice dialog on load**, asking each visitor which version they want. Rejected: it is a gate
in front of the name and role, and it fails the first-screen check (`tests/homepage-fold.spec.ts`)
that keeps a technical claim in the first viewport.

**The 3D version on `germinai.xyz`.** Rejected: that is the newsletter's host, and it already
lands on `/writing`.

**Building all five scenes before anything is tested.** Rejected: the prototype answers whether
the 3D path earns its cost at all, so it is built with two scenes and tested before the rest.

**`searchParams` or a dynamic route per step** to carry the selected step. Rejected: both are
runtime reads under Cache Components; the fragment is read on the client only.

## Consequences

**`/` keeps every proof rule.** The first-screen check and retained proof
(`docs/spec/retained-proof.json`) still bind it; the bans the spec lifts are lifted for `/path`
only (see the spec's retired rules).

**`/path` is a new shell** with its own inset module (ADR-0002). It is linked but not in the
sitemap, has no markdown sibling, and stays out of `routesUsingTheSharedShell`.

**State crosses the door in the fragment.** Each step has a fragment on both routes (`/#lille`,
`/path#lille`), read on the client only, so neither route reads runtime data under Cache
Components.
