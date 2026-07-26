# Warm Print has seven colour roles, and no error role

The inherited shadcn/ui palette carried 19 colour tokens per set. Warm Print is warm paper,
warm near-black ink, and one terracotta accent, so most of those tokens named distinctions
the language does not have: `card` and `popover` differed from `background` by 1% lightness,
`input` was identical to `border`, `secondary` was a second fill Warm Print never uses, and
`muted-foreground` was doing the work of two different roles at once. We collapsed the set to
seven roles — ground, ink, body, faint, accent, accent-foreground, border — declared
identically across all three token sets.

## Considered options

Re-valuing the 19 tokens in place was the cheaper migration and would have left every
shadcn/ui primitive untouched. We rejected it because it preserves the conflation that caused
the original defect: one `muted-foreground` token carrying both readable prose and metadata
labels means the two can never be tuned independently, and the metadata tier is the one
carrying the accessibility risk.

## Consequences

**There is deliberately no `destructive` role.** The site has no error surface — no forms that
fail, no destructive actions — so a red token in a warm-paper palette had no caller. The
`destructive` variants were removed from `badge.tsx` and `button.tsx` along with the tokens.
This also resolved a latent bug: `destructive` was declared in `@theme` and `.dark` but never
in the print override, so it would have printed whatever mode was on screen. Do not add an
error colour back without deciding what Warm Print's error surface looks like; reintroducing
`hsl(0 84% 60%)` would put pure red on warm paper.

**`faint` has a 12px floor.** The role is defined by contrast *and* size. Contrast alone was
never the binding constraint — the tokens measure comfortably above AA — but the metadata it
carries was rendering at 10–11px, which passes a ratio check and still reads as the weakest
text on the page. Metadata below 12px is a defect even when the contrast maths is green.
