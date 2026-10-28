import { Color } from "three";

/* The scene's colours are the path tokens in `globals.css` (ADR-0008), read
   from the page so the CSS stays their one source. */

export const PALETTE_ROLES = [
  "ground",
  "tile",
  "prop",
  "accent",
  "outline",
  "fog",
] as const;

export type PaletteRole = (typeof PALETTE_ROLES)[number];
export type Palette = Record<PaletteRole, Color>;

/** The tokens as they resolve on the root now, in whichever mode the site is
 *  in. Only the active mode's values are readable — a `.dark` value is not
 *  visible from a light root — so the runtime reads each mode as it meets it. */
export function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    PALETTE_ROLES.map((role) => [
      role,
      new Color(style.getPropertyValue(`--path-${role}`).trim()),
    ]),
  ) as Palette;
}

export function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}
