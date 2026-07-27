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

type OgFontFile = {
  file: string;
  name: (typeof OG_FONT)[keyof typeof OG_FONT];
  style: "normal" | "italic";
  weight: 400 | 600;
};

/**
 * Satori resolves no CSS variables and no system font stacks, so the static
 * instances in `src/assets/fonts` are the only way the cards get the on-site
 * faces. File tracing globs the whole directory off the `path.join` below, so
 * no `outputFileTracingIncludes` entry is needed to keep them in the bundle.
 */
const FONT_FILES: OgFontFile[] = [
  {
    file: "Fraunces-SemiBold.ttf",
    name: OG_FONT.display,
    style: "normal",
    weight: 600,
  },
  {
    file: "Fraunces-SemiBoldItalic.ttf",
    name: OG_FONT.display,
    style: "italic",
    weight: 600,
  },
  {
    file: "Inter-Regular.ttf",
    name: OG_FONT.text,
    style: "normal",
    weight: 400,
  },
  {
    file: "JetBrainsMono-Regular.ttf",
    name: OG_FONT.mono,
    style: "normal",
    weight: 400,
  },
];

let cached: (Omit<OgFontFile, "file"> & { data: Buffer })[];

/**
 * Read lazily, and synchronously on purpose.
 *
 * Lazily because Next imports each image route for its `alt` / `size` exports
 * into every page that inherits the card — a module-scope read would hold
 * ~600KB of typeface in four page functions that render no card.
 *
 * Synchronously because awaiting here would make the image component async, and
 * under Cache Components an async component doing uncached I/O drops the route
 * from prerendered to server-rendered on demand.
 */
export function ogFonts() {
  cached ??= FONT_FILES.map(({ file, ...descriptor }) => ({
    ...descriptor,
    data: readFileSync(
      path.join(process.cwd(), "src", "assets", "fonts", file),
    ),
  }));
  return cached;
}
