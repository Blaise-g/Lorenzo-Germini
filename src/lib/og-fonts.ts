import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Satori matches fonts by name against what it was handed and falls back to its
 * bundled Noto Sans on a miss — a typo produces a valid PNG in the wrong face
 * with no warning. Card styles name families through this object, never as bare
 * strings.
 */
export const OG_FONT = {
  display: "Fraunces",
  mono: "JetBrains Mono",
  text: "Inter",
} as const;

/**
 * One card face, and the key its character set is listed under in
 * `og-card-text`. A family plus a style, because the subsets are cut per file:
 * the upright and italic Fraunces draw different strings.
 */
export type OgFace = "display" | "displayItalic" | "text" | "mono";

type OgFontFile = {
  face: OgFace;
  name: (typeof OG_FONT)[keyof typeof OG_FONT];
  style: "normal" | "italic";
  /** Upstream build under `vendor/og-fonts`, the subsetter's input. */
  source: string;
  weight: 400 | 600;
};

type OgFontSet = "all" | "upright";

/**
 * Satori resolves no CSS variables and no system font stacks, so the static
 * instances in `src/assets/fonts` are the only way the cards get the on-site
 * faces. File tracing globs the whole directory off the `path.join` below, so
 * no `outputFileTracingIncludes` entry is needed to keep them in the bundle —
 * which is also why the full upstream builds live outside it, in
 * `vendor/og-fonts`: tracing would pull them in alongside the subsets.
 */
export const FONT_FILES: OgFontFile[] = [
  {
    face: "display",
    name: OG_FONT.display,
    source: "Fraunces-SemiBold.ttf",
    style: "normal",
    weight: 600,
  },
  {
    face: "displayItalic",
    name: OG_FONT.display,
    source: "Fraunces-SemiBoldItalic.ttf",
    style: "italic",
    weight: 600,
  },
  {
    face: "text",
    name: OG_FONT.text,
    source: "Inter-Regular.ttf",
    style: "normal",
    weight: 400,
  },
  {
    face: "mono",
    name: OG_FONT.mono,
    source: "JetBrainsMono-Regular.ttf",
    style: "normal",
    weight: 400,
  },
];

/**
 * Where `generate:og-fonts` writes and `ogFonts()` reads.
 *
 * The upstream builds' directory is deliberately *not* named here. Tracing globs
 * a directory off any `path.join(process.cwd(), …)` it can see, and every page
 * imports this module — a constant for `vendor/og-fonts` in this file puts all
 * 481KB of full build back into six page bundles, which is the cost #43 removed.
 * The subsetter holds that path instead.
 */
const subsetDir = path.join(process.cwd(), "src", "assets", "fonts");

export function ogSubsetPath(file: OgFontFile) {
  return path.join(
    subsetDir,
    `${path.basename(file.source, ".ttf")}.subset.ttf`,
  );
}

const cachedFontData = new Map<OgFace, Buffer>();

function fontData(file: OgFontFile) {
  const cached = cachedFontData.get(file.face);
  if (cached) return cached;

  const data = readFileSync(ogSubsetPath(file));
  cachedFontData.set(file.face, data);
  return data;
}

/**
 * Read lazily, and synchronously on purpose.
 *
 * Lazily because Next imports each image route for its `alt` / `size` exports
 * into every page that inherits the card — a module-scope read would hold the
 * whole set in four page functions that render no card.
 *
 * Synchronously because awaiting here would make the image component async, and
 * under Cache Components an async component doing uncached I/O drops the route
 * from prerendered to server-rendered on demand.
 */
export function ogFonts(set: OgFontSet = "all") {
  const files =
    set === "upright"
      ? FONT_FILES.filter(({ style }) => style === "normal")
      : FONT_FILES;

  return files.map((file) => ({
    data: fontData(file),
    name: file.name,
    style: file.style,
    weight: file.weight,
  }));
}
