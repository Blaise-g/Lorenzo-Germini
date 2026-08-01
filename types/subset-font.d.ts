/**
 * `subset-font` ships no types. Only the call `scripts/subset-og-fonts.ts` makes
 * is declared — the upstream options also cover WOFF flavours, variation axes and
 * name-id retention, none of which the cards use.
 */
declare module "subset-font" {
  export default function subsetFont(
    font: Buffer,
    text: string,
    options?: { targetFormat?: "sfnt" | "woff" | "woff2" },
  ): Promise<Buffer>;
}
