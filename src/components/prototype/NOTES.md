# Homepage direction prototypes — issue #7

**Question:** which homepage direction should the redesign take?
**How to view:** `bun run dev`, open `/` — flip variants with the floating bar or `?variant=a|b|c` (also ← / → keys). Dev-only; production always renders the current site. Screenshots: `docs/prototypes/issue-7/`.
**Writing data is placeholder** (`writing-data.ts`) — real essays come from Substack RSS later (issue #5 research).

## Variant A — "Refined dossier" (conservative evolution)

- **Section order:** Hero → Writing → About → Work (3 full + condensed earlier) → Projects + stack footer.
- **Hero:** current visual language, but identity flips to "AI Product Engineer"; one-liner has the brief's "builds X and writes about Y" shape; primary CTA = *Read the writing*.
- **Writing:** 3 compact cards with tag/language chips, right after the hero.
- **Balance:** technical credibility fully preserved (same work cards, all bullets); earlier roles collapse to one-liners; skills demoted to a mono footer strip.
- **Navigation:** unchanged (command menu, anchors).
- **Reusable components:** essay card, condensed-role list, section heading.
- **Mobile:** identical to today; essay cards stack.
- **Complexity/risk:** lowest — a day of work, keeps print CSS path viable. Risk: still reads as a CV; weakest move away from "static document".

## Variant B — "Editorial" (magazine redesign)

- **Section order:** Masthead nav → statement hero → Writing (numbered index, lead feature) → Work (prose timeline, top 4 + "Earlier:" line) → Projects.
- **Hero:** full positioning statement in Fraunces serif — outcome-led building half + honest writing range; CTA "Start with the essays".
- **Writing:** the centerpiece — numbered editorial index with excerpts, EN/IT labels, archive/subscribe link.
- **Balance:** most opinionated; work compressed to one bullet per role (relies on essays + projects for technical proof). Sticky rail keeps bio/contact always visible.
- **Navigation:** new masthead anchor nav. ~~command menu kept~~ — **incorrect**: `variant-b.tsx` renders no `CommandMenu`, and also no `<footer>`, `ThemeToggle`, skip link, `BackToTop` or `StructuredData` (verified during #9's critique). All must be restored in the real build; the dark mode #8 calls a first-class requirement is currently unreachable by any user.
- **Reusable components:** essay index row, prose timeline row, sticky rail, masthead.
- **Mobile:** rail stacks above content; large serif needs size tuning; longest scroll.
- **Complexity/risk:** highest — new font (Fraunces), warm palette diverges from the slate-indigo theme tokens, dark mode needs its own pass, print CV would need a separate route. Risk: could read *less* technical (violates brief constraint) unless projects/stack stay prominent.

## Variant C — "Agent-native index" (brutalist manifest)

- **Section order:** frontmatter block (identity as key/value manifest) → agents-welcome bar → /writing → /work (table) → /projects → /stack footer.
- **Hero:** the manifest *is* the hero — `role:`, `writes_about:`, `now:`, `contact:` — literally the shape LLMs parse; llms.txt/llms-full.txt surfaced as a visible feature.
- **Writing:** dated list under `/writing — essays, the primary path`; `$ subscribe --via substack` prompt.
- **Balance:** maximally technical-looking; work as dense table (all 6 roles, one line of proof each); product story carried by copy inside the manifest.
- **Navigation:** none needed — one dense screenful per section; command menu fits the aesthetic perfectly.
- **Reusable components:** manifest block, keyed section label, work table, terminal link style.
- **Mobile:** table drops its third column (already handled); dense mono text is the main risk at small sizes.
- **Complexity/risk:** medium — no new fonts (JetBrains Mono already loaded) but full palette departure (dark-only zinc/emerald vs. themed light/dark). Risk: founders/product leaders (the brief's primary reader) may find it developer-insider; the "agent-native" statement is aesthetic — actual agent-readability comes from llms.txt/JSON-LD regardless of variant.

## Recommendation

**B as the base direction, stealing C's agent-native affordances** (a small "agents welcome → /llms.txt" line in the footer/rail, and the manifest idea as the *structure* of llms.txt, not the visual). A is the fallback if effort must stay minimal. B is the only one that makes writing feel like first-class identity rather than an added section, matches "founders & product leaders" as readers, and is unmistakably not AI slop — its risks (dark mode, print, "less technical") are all addressable in the real implementation.

## Verdict (fill in after choosing)

- **Chosen direction (2026-07-23): B — Editorial, plus C's agent-native affordances.** Fraunces serif editorial layout with essays as the lead feature, augmented with a visible agents-welcome / llms.txt affordance and C's manifest shape informing the structure of `llms.txt` (not the visuals).
- Rationale: only B makes writing first-class identity and speaks to founders/product leaders; C's agent-readability survives as affordances + llms.txt structure without the developer-insider aesthetic.
- **Visual direction (issue #8, 2026-07-25): B1 "Warm Print."** Variant B is now parameterized into three treatments — `?variant=b1|b2|b3` (`TREATMENTS` in `variant-b.tsx`). See `docs/prototypes/issue-8/NOTES.md`.
- **Composition (issue #12, 2026-07-25): the rail, amended — and desktop-only.** #8's three treatments held composition constant and varied only hue, so the rail, the responsive break and the heading hierarchy were never tested. `variant-d.tsx` re-tests them with the palette fixed (`?variant=b1a` chosen / `?variant=d`). The rail is now `hidden lg:block`, so below 1024px the layout *is* the single measure. `variant-b.tsx` is superseded as the reference implementation — read `variant-d.tsx` and `docs/prototypes/issue-12/NOTES.md` instead.
- Phase 2 §2.6 follow-up: rebuild B properly (dark mode pass, mobile serif sizing, print-CV decision, keep technical proof prominent); only when that homepage swap merges, delete `src/components/prototype/` + the prototype block in `src/app/page.tsx`. Variant B/C code stays as reference until then.
