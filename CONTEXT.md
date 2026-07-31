# Lorenzo Germini — personal site

A personal site and portfolio. This glossary fixes the vocabulary for the visual
language and the content surfaces, so tickets, tests and commits name the same things.

## Language

### Warm Print palette

The signed visual language: warm paper ground, warm near-black ink, one terracotta accent.
It has seven colour roles and no others. Each role is declared in all three token sets.

**Ground**:
The paper surface everything sits on. Warm off-white in light mode, warm near-black in dark.
_Avoid_: background, card, popover, surface

**Ink**:
Primary text — headings, titles, the text a reader's eye lands on first.
_Avoid_: foreground, text, primary text

**Body**:
Prose meant to be read at length: the bio, the summary, a dialog's explanation.
_Avoid_: muted, secondary text

**Faint**:
Text that labels other content rather than being read — dates, tags, tech stacks, counts,
keyboard hints, card descriptions. Always an explicit colour token, never an opacity.
_Avoid_: muted-foreground, subtle, dimmed, opacity-55

**Accent**:
The single terracotta. Reserved for hero emphasis italic, section headings, links, and the
primary control. Never a large fill.
_Avoid_: primary, brand, indigo

**Accent foreground**:
The label colour on top of the accent when it is used as the primary control. Mode-specific.

**Border**:
Hairline rules and input outlines. One value; there is no separate input colour.
_Avoid_: input, divider, hairline

Warm Print has **no error role**. There is no destructive colour, and no component
carries a destructive variant. See ADR-0001.

### Token sets

**Token set**:
One of the three blocks in `src/app/globals.css` that declare the seven colour roles:
`@theme` (light), `.dark`, and the `@media print` override. They must declare identical
token _names_; their values differ by design.

**Generating set**:
`@theme` specifically. It is the only set Tailwind v4 generates utilities from — the other
two merely reassign values. A role declared only in a reassigning set produces no utility
at all.

**Token parity**:
The invariant that all three token sets declare the same role names. Enforced by a static
test over `globals.css`, because a role missing from the print set is invisible on screen
and surfaces only under print emulation.

### Content surfaces

**Identity surface**:
Any place the site states Lorenzo's role, title, or bio. There are six and nothing
generates them from each other: `RESUME_DATA.about` and `RESUME_DATA.roleLabel` — two
independent fields in `src/data/resume-data.tsx`, the second the masthead's short label and
the JSON-LD's `jobTitle`/`hasOccupation` — `public/llms.txt`, `public/llms-full.txt`, the
JSON-LD built in `src/lib/person-structured-data.ts`, and route metadata. They drift;
changing one means changing all. The hand-written manifests drift the worst, because only
they hold a second copy of the prose rather than reading a field.
