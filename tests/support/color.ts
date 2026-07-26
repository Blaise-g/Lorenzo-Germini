/* WCAG 2.1 relative luminance and contrast, computed outside the page so the
   arithmetic lives in exactly one place. Inputs must be browser-computed
   `rgb()`/`rgba()` strings — resolve authored values (tokens, `color-mix`,
   named colours) through `normalizeColor` in the page first, otherwise the
   channel parse is silently wrong. */

function channels(color: string): [number, number, number] {
  const parsed = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  if (parsed.length < 3 || parsed.some(Number.isNaN)) {
    throw new Error(`Unable to parse color: ${color}`);
  }
  return parsed as [number, number, number];
}

export function luminance(color: string): number {
  const [red, green, blue] = channels(color).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrast(first: string, second: string): number {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}
