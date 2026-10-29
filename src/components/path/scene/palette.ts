import { Color } from "three";

/* The board's colours are the path tokens in `globals.css` (ADR-0008), read
   from the page so the CSS stays their one source. The board is printed in
   two risograph inks on card stock (comp B), so its palette is the stock, the
   two inks and the table it lies on; every card, tile and the pawn is coloured
   from these in the ink shader, so one texture serves light and dark. */

/** Each role's token, spelled out whole: Tailwind emits an `@theme`
 *  variable only when its scanner finds the name used in a source file, and
 *  a name built from a template is not found. */
const PALETTE_TOKENS = {
  paper: "--path-paper",
  "ink-warm": "--path-ink-warm",
  "ink-cool": "--path-ink-cool",
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
