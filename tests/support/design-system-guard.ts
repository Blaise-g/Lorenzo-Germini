/* The design-system guard: given one source file, what in it breaks the token
   layer ADR-0001 established.

   The colour pattern is deliberately blunt — anything shaped like a colour
   under `src/` is a violation, because a guard with holes in it is worth less
   than the false positives it saves. Bluntness costs exactly one thing: `#100`
   through `#9999` read as `#rgb`/`#rgba` triples, and this repo cites issues in
   source comments. Narrowing the pattern to spare bare decimals is not
   available — `#171412`, `#333333`, `#595959` and `#808080` are shipped Warm
   Print values, all decimal. So the citation convention moved to `GH-100`
   (ADR-0004) and the guard explains itself rather than bending.

   The two exemptions are the whole reason this is a function rather than four
   regexes: `globals.css` legitimately holds colour values inside its token
   blocks, and `warm-print.ts` is where the palette is declared. Both are
   scoped as narrowly as the file allows, and both are pinned by tests. */

const colorSyntax =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|color-mix)\(/g;
const retiredUtility =
  /(?:--color-|(?:bg|text|border|ring|outline|decoration)-)(?:background|foreground|card(?:-foreground)?|popover(?:-foreground)?|primary(?:-foreground)?|secondary(?:-foreground)?|muted(?:-foreground)?|destructive(?:-foreground)?|input|ring)\b/g;
const builtInPalette =
  /(?:bg|text|border|ring|outline|decoration)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-[0-9]+)?(?:\/[0-9]+)?\b/g;
const retiredEffects = /\b(?:BORDER_SHIM|GRAIN_URL)\b|feTurbulence|mix-blend-/g;
const primaryHoverMix =
  /color-mix\(\s*in srgb,\s*var\(--color-accent\)\s*92%,\s*var\(--color-ink\)\s*\)/g;

export function extractBlock(source: string, marker: string, fromIndex = 0) {
  const markerIndex = source.indexOf(marker, fromIndex);
  if (markerIndex === -1) throw new Error(`Missing CSS block: ${marker}`);

  const openingBrace = source.indexOf("{", markerIndex + marker.length);
  if (openingBrace === -1) throw new Error(`Unclosed CSS block: ${marker}`);

  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      return {
        body: source.slice(openingBrace + 1, index),
        end: index + 1,
        start: markerIndex,
      };
    }
  }

  throw new Error(`Unclosed CSS block: ${marker}`);
}

/* The lengths a colour and an issue number can both claim. Neither reading can
   be ruled out at 3-4 digits — `#333` is a real shorthand grey and `#110` is a
   real issue — so the message leads with the colour reading the guard exists
   for and offers the other second. A 6- or 8-digit match cannot be an issue
   number at all, and gets the plain report. */
const ambiguousWithIssueNumber = /^#[0-9]{3,4}$/;

function describeViolation(relativePath: string, match: string): string {
  if (!ambiguousWithIssueNumber.test(match)) return `${relativePath}: ${match}`;
  return (
    `${relativePath}: ${match} — a colour here belongs in the token layer; ` +
    `if it is an issue reference, cite it as GH-${match.slice(1)} (ADR-0004)`
  );
}

/** Every token-layer violation in one file, in the guard's report format. */
export function scanSource(relativePath: string, source: string): string[] {
  const violations: string[] = [];
  let searchable = source;

  if (relativePath === "src/app/globals.css") {
    const theme = extractBlock(searchable, "@theme");
    const dark = extractBlock(searchable, ".dark", theme.end);
    const letterPrint = extractBlock(searchable, "@media print and");
    const print = extractBlock(searchable, "@media print", letterPrint.end);
    const ranges = [theme, dark, print].sort((a, b) => b.start - a.start);
    for (const range of ranges) {
      searchable =
        searchable.slice(0, range.start) + searchable.slice(range.end);
    }

    const hoverMixes = searchable.match(primaryHoverMix) ?? [];
    if (hoverMixes.length !== 1) {
      violations.push(
        `${relativePath}: expected one role-derived primary hover mix`,
      );
    }
    searchable = searchable.replace(primaryHoverMix, "");
  }

  const patterns =
    relativePath === "src/lib/warm-print.ts"
      ? [retiredUtility, builtInPalette, retiredEffects]
      : [colorSyntax, retiredUtility, builtInPalette, retiredEffects];

  for (const pattern of patterns) {
    for (const match of searchable.matchAll(pattern)) {
      violations.push(describeViolation(relativePath, match[0]));
    }
  }

  return violations;
}
