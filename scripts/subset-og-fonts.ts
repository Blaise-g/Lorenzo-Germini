/**
 * Cut the OpenGraph card faces down to the characters the cards actually draw.
 *
 * The upstream builds in `vendor/og-fonts` carry ~481KB of Latin + Greek +
 * Cyrillic + Vietnamese to render ~120 characters of build-time-known copy. This
 * writes the subsets `ogFonts()` reads into `src/assets/fonts`, which is the only
 * font directory Next's file tracing pulls into the bundle.
 *
 * Run through Bun, not Node: it resolves the `@/` aliases and the `.tsx` in
 * `RESUME_DATA`'s import graph, so the character set can be derived from the
 * shipped copy rather than a hand-maintained list.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import subsetFont from "subset-font";

import { ogFaceText } from "@/lib/og-card-text";
import { FONT_FILES, ogSubsetPath } from "@/lib/og-fonts";

/* Held here rather than in `og-fonts`: naming this directory in a module the
   pages import traces the full builds back into every page bundle. */
const sourceDir = path.join(process.cwd(), "vendor", "og-fonts");

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)}KB`;

let total = 0;

for (const file of FONT_FILES) {
  const source = await readFile(path.join(sourceDir, file.source));
  /* `sfnt` keeps the TrueType flavour rather than wrapping in WOFF: Satori
     reads raw sfnt, and the suite asserts the `0x00010000` version tag. */
  const subset = await subsetFont(source, ogFaceText(file.face), {
    targetFormat: "sfnt",
  });

  const destination = ogSubsetPath(file);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, subset);
  total += subset.byteLength;

  console.log(
    `${file.source} ${kb(source.byteLength)} → ` +
      `${path.basename(destination)} ${kb(subset.byteLength)}`,
  );
}

console.log(`OG font payload: ${kb(total)}`);
