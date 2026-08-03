/* WCAG 2.1 relative luminance and contrast, computed outside the page so the
   arithmetic lives in exactly one place. Inputs must be browser-computed
   `rgb()`/`rgba()` strings — resolve authored values (tokens, `color-mix`,
   named colours) through `normalizeColor` in the page first, otherwise the
   channel parse is silently wrong. */

/** `#rrggbb` to channels, for authored token values that never reach a page. */
export function hexChannels(hex: string): [number, number, number] {
  const parsed = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16));
  if (parsed?.length !== 3 || parsed.some(Number.isNaN)) {
    throw new Error(`Unable to parse hex color: ${hex}`);
  }
  return parsed as [number, number, number];
}

export async function paletteClasses(
  input: string | Buffer,
  size = 512,
): Promise<number[]> {
  const palette = [
    hexChannels(WARM_PRINT.light.ground),
    hexChannels(WARM_PRINT.light.ink),
    hexChannels(WARM_PRINT.light.accent),
  ];
  const { data, info } = await sharp(input)
    .resize(size, size)
    .flatten({ background: WARM_PRINT.light.ground })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return Array.from({ length: info.width * info.height }, (_, pixel) => {
    const offset = pixel * info.channels;
    return palette.reduce(
      (nearest, color, index) => {
        const distance = color.reduce(
          (total, channel, channelIndex) =>
            total + (data[offset + channelIndex] - channel) ** 2,
          0,
        );
        return distance < nearest.distance ? { distance, index } : nearest;
      },
      { distance: Number.POSITIVE_INFINITY, index: -1 },
    ).index;
  });
}

export async function imageColors(
  input: string | Buffer,
): Promise<Set<string>> {
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const colors = new Set<string>();
  for (let offset = 0; offset < data.length; offset += info.channels) {
    colors.add(
      `#${[data[offset], data[offset + 1], data[offset + 2]]
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`,
    );
  }
  return colors;
}

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
import sharp from "sharp";

import { WARM_PRINT } from "@/lib/warm-print";
