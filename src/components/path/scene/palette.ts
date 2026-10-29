import { Color } from "three";

/* The board's colours are the path tokens in `globals.css` (ADR-0008), read
   from the page so the CSS stays their one source. The board keeps v2's
   riso palette as material colour: the stock, three inks, the felt under
   the tiles and the page it lies on, from which `paint.ts` mixes every
   surface's tone. Light and dark share the board's colours and differ in
   `fog`: dark mode is night, lit by `lighting.ts`, not a second print. */

/** Each role's token, spelled out whole: Tailwind emits an `@theme`
 *  variable only when its scanner finds the name used in a source file, and
 *  a name built from a template is not found. */
const PALETTE_TOKENS = {
  paper: "--path-paper",
  "ink-warm": "--path-ink-warm",
  "ink-cool": "--path-ink-cool",
  "ink-sun": "--path-ink-sun",
  felt: "--path-felt",
  fog: "--path-fog",
} as const;

export type PaletteRole = keyof typeof PALETTE_TOKENS;
export const PALETTE_ROLES = Object.keys(PALETTE_TOKENS) as PaletteRole[];
export type Palette = Record<PaletteRole, Color>;

/** The tokens as they resolve on the root now, in whichever mode the site is
 *  in. Only the active mode's values are readable — a `.dark` value is not
 *  visible from a light root — so the runtime reads each mode as it meets it. */
export function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    PALETTE_ROLES.map((role) => [
      role,
      new Color(style.getPropertyValue(PALETTE_TOKENS[role]).trim()),
    ]),
  ) as Palette;
}

export function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}
