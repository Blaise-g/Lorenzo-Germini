/* The palette guard's colour pattern, and how it reports a match.

   The pattern is deliberately blunt: anything shaped like a colour under
   `src/` is a violation, because a guard with holes in it is worth less than
   the false positives it saves. Bluntness costs exactly one thing — `#100`
   through `#9999` read as `#rgb`/`#rgba` triples, and this repo cites issues
   in source comments. Narrowing the pattern to spare bare decimals is not
   available: `#171412`, `#333333`, `#595959` and `#808080` are shipped Warm
   Print values, all decimal. So the citation convention moved to `GH-100`
   (ADR-0004) and the guard explains itself rather than bending. */

export const colorSyntax =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|color-mix)\(/g;

/* The only lengths a colour and an issue number can both claim. A 6- or
   8-digit all-decimal match is a colour and nothing else, so it gets the plain
   report — pointing that author at GH- numbering would be misdirection. */
const issueShaped = /^#[0-9]{3,4}$/;

export function describeViolation(relativePath: string, match: string): string {
  if (!issueShaped.test(match)) return `${relativePath}: ${match}`;
  return (
    `${relativePath}: ${match} — if this is an issue reference, cite it as ` +
    `GH-${match.slice(1)} (ADR-0004); the guard reads ${match} as a colour`
  );
}
