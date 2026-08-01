/**
 * The codepoints a TrueType file can actually draw.
 *
 * The OG card faces are subsets (`bun run generate:og-fonts`), so "the file is a
 * valid font" no longer implies "the card renders". A character the copy needs and
 * the subset dropped renders as `.notdef` — a visible box in a baked PNG that no
 * size or pixel-probe assertion notices. Reading the `cmap` back off the shipped
 * bytes is the check that does.
 *
 * Hand-rolled rather than run through harfbuzz, which `subset-font` already carries
 * transitively: an oracle that shares an engine with the thing it checks cannot
 * catch that engine dropping a glyph. Every subset these faces produce maps its
 * characters through `cmap` format 4, so that is all this reads — an unrecognised
 * format throws rather than reporting thinner coverage than the font has.
 */
export function mappedCodepoints(font: Buffer): Set<number> {
  const cmap = tableOffset(font, "cmap");
  const subtableCount = font.readUInt16BE(cmap + 2);
  const covered = new Set<number>();

  for (let record = 0; record < subtableCount; record += 1) {
    const subtable = cmap + font.readUInt32BE(cmap + 4 + record * 8 + 4);
    readSubtable(font, subtable, covered);
  }

  return covered;
}

function tableOffset(font: Buffer, tag: string) {
  const tableCount = font.readUInt16BE(4);

  for (let record = 0; record < tableCount; record += 1) {
    const entry = 12 + record * 16;
    if (font.toString("ascii", entry, entry + 4) === tag) {
      return font.readUInt32BE(entry + 8);
    }
  }

  throw new Error(`Font has no \`${tag}\` table`);
}

function readSubtable(font: Buffer, subtable: number, covered: Set<number>) {
  const format = font.readUInt16BE(subtable);

  if (format === 4) return readFormat4(font, subtable, covered);

  /* Formats 0, 2, 6, 12, 13 and 14 exist. None appears in these subsets today,
     and a silent skip would report thinner coverage than the font has — which
     reads as a missing glyph the cards do in fact draw. */
  throw new Error(`Unhandled \`cmap\` subtable format ${format}`);
}

/** Segment mapping to delta values — the BMP workhorse. */
function readFormat4(font: Buffer, subtable: number, covered: Set<number>) {
  const segmentCount = font.readUInt16BE(subtable + 6) / 2;
  const endCodes = subtable + 14;
  const startCodes = endCodes + segmentCount * 2 + 2;
  const deltas = startCodes + segmentCount * 2;
  const rangeOffsets = deltas + segmentCount * 2;

  for (let segment = 0; segment < segmentCount; segment += 1) {
    const end = font.readUInt16BE(endCodes + segment * 2);
    const start = font.readUInt16BE(startCodes + segment * 2);
    const delta = font.readInt16BE(deltas + segment * 2);
    const rangeOffsetPosition = rangeOffsets + segment * 2;
    const rangeOffset = font.readUInt16BE(rangeOffsetPosition);

    for (let code = start; code <= end && code !== 0xffff; code += 1) {
      const glyph =
        rangeOffset === 0
          ? (code + delta) & 0xffff
          : glyphThroughIndexArray(
              font,
              rangeOffsetPosition + rangeOffset + (code - start) * 2,
              delta,
            );

      if (glyph !== 0) covered.add(code);
    }
  }
}

function glyphThroughIndexArray(font: Buffer, position: number, delta: number) {
  const glyph = font.readUInt16BE(position);
  return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
}
