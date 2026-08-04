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

**Essay index**:
`/writing` — the count-aware list built from the Substack feed. Count-aware means the
surface changes shape with how many essays exist (0 → no list, 1 → lead plus launch line,
2–3 → lead plus rows, 4+ → the archive link joins them) and never implies more writing
exists than does. Nothing on it is numbered.
_Avoid_: blog, posts page, archive — the archive is Substack's, off-site

**Essay** / **field note**:
Two names for one thing, and the split is deliberate (#71, #74). **Field note** is the
reader-facing term — what the copy, the links and the publication say. **Essay** is the
internal term for a feed item, and stays in the code (`getEssays`, `formatEssayDate`,
`WritingIndex`, the fixture state names) and in this glossary. Reader-facing copy that says
"essay" is a defect; an identifier that says "field note" is churn.
_Avoid_: article, post, blog post — and "essay" anywhere a reader can see it

**Feed miss**:
A feed read that produced no essays: unreachable, empty, or malformed. All three are the
same event to every caller, and all three render as an absent essay surface rather than an
error. A miss gets its own short cache lifetime, so an absence cached before the first post
exists cannot outlive it.
_Avoid_: feed error, fetch failure — the distinction is not one this site can act on

**Fixture state**:
A canned feed at `/writing/fixture/<state>`, dev-only. Named by essay count (`0`–`6`) or by
failure: `malformed`, `unreachable`, and `recovering-<miss>` for a miss that is replaced by
a real feed on the next read. A trailing token — `recovering-malformed-k3f9` — starts an
independent sequence under its own cache key, so a test can run the recovery from the top
against a dev server that has already run it. A fixture replaces the network call and
nothing else, so it exercises the shipped parser, cache and components.

**Identity surface**:
Any place the site states Lorenzo's role, title, or bio. There are six and nothing
generates them from each other: `RESUME_DATA.about` and `RESUME_DATA.roleLabel` — two
independent fields in `src/data/resume-data.tsx`, the second the masthead's short label and
the JSON-LD's `jobTitle`/`hasOccupation` — `public/llms.txt`, `public/llms-full.txt`, the
JSON-LD built in `src/lib/person-structured-data.ts`, and route metadata. They drift;
changing one means changing all. The hand-written manifests drift the worst, because only
they hold a second copy of the prose rather than reading a field.

**Chrome control**:
A control that belongs to the site rather than to the page's content: the theme toggle and
`BackToTop`. Since #89 (ADR-0003) neither is _floating_ chrome by default — the toggle is
**in flow**, placed by whichever surface owns that route's controls (the masthead row on `/`
and `/writing`, the top-right of the document masthead on `/cv`), and `BackToTop` is fixed only from `xl`,
where the margin beside the measure is empty. A chrome control that is fixed has to sit in
margin that already exists; it may not reserve a gutter to sit in, because that gutter is
charged to every paragraph on every route at every height.
_Avoid_: floating chrome as a synonym for chrome control — the whole point is that most of it
no longer floats
