import { readFileSync } from "node:fs";

import { type APIRequestContext, expect, test } from "@playwright/test";
import sharp from "sharp";

import {
  OG_DRAWN_COPY,
  OG_HOME_TEXT,
  isSubsettedCopy,
  ogFaceText,
} from "@/lib/og-card-text";
import { FONT_FILES, OG_FONT, ogFonts, ogSubsetPath } from "@/lib/og-fonts";
import { WARM_PRINT } from "@/lib/warm-print";

import { hexChannels } from "./support/color";
import { mappedCodepoints } from "./support/font-coverage";

/* Sampled from the frame's structural margins, outside the padding box, so the
   probes stay clear of glyphs: a probe grazing the accent italic would fail
   antialiasing with a message about the ground colour. */
const GROUND_PROBES = [
  [24, 24],
  [1176, 24],
  [24, 606],
  [1176, 606],
  [600, 24],
  [600, 606],
  [24, 315],
  [1176, 315],
  [1160, 200],
  [1160, 460],
] as const;

async function renderedCard(
  request: APIRequestContext,
  route = "/opengraph-image",
) {
  const response = await request.get(route);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  return sharp(await response.body())
    .raw()
    .toBuffer({ resolveWithObject: true });
}

test.describe("homepage OpenGraph card", () => {
  test("renders flat warm paper at the platforms' declared size", async ({
    request,
  }) => {
    const { size } = await import("@/app/opengraph-image");
    const { data, info } = await renderedCard(request);

    expect({ height: info.height, width: info.width }).toEqual(size);

    /* The incumbent card faked depth with a 135° gradient, which any single
       sample happily passes — so probe the whole frame, not one corner. */
    const ground = hexChannels(WARM_PRINT.light.ground);
    const drift = GROUND_PROBES.map(([x, y]) => {
      const offset = (y * info.width + x) * info.channels;
      return Math.max(
        Math.abs(data[offset] - ground[0]),
        Math.abs(data[offset + 1] - ground[1]),
        Math.abs(data[offset + 2] - ground[2]),
      );
    });

    expect(Math.max(...drift)).toBe(0);
  });

  test("keeps terracotta present but never a large fill", async ({
    request,
  }) => {
    const { data, info } = await renderedCard(request);
    const [red, green, blue] = hexChannels(WARM_PRINT.light.accent);

    let accentPixels = 0;
    for (let offset = 0; offset < data.length; offset += info.channels) {
      if (
        Math.abs(data[offset] - red) <= 24 &&
        Math.abs(data[offset + 1] - green) <= 24 &&
        Math.abs(data[offset + 2] - blue) <= 24
      ) {
        accentPixels += 1;
      }
    }

    /* As composed: ~1.0% of the frame, the opening mark (0.05%) plus the
       italic positioning line. The floor catches terracotta dropping out of
       the card entirely; the ceiling catches it becoming a fill, which
       CONTEXT.md forbids for this role. */
    const share = accentPixels / (info.width * info.height);
    expect(share).toBeGreaterThan(0.002);
    expect(share).toBeLessThan(0.04);
  });

  test("names the settled role label in its unfurl metadata", async ({
    page,
  }) => {
    const { alt } = await import("@/app/opengraph-image");

    expect(alt).toBe(`${OG_HOME_TEXT.name} — ${OG_HOME_TEXT.role}`);

    await page.goto("/");
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      alt,
    );
  });
});

/* The CV card's own margins. Its accent is a 12px rule down the left gutter at
   x≈80–92, so the left-hand probes sit outside it, not on it. */
const CV_GROUND_PROBES = [
  [24, 24],
  [1176, 24],
  [24, 606],
  [1176, 606],
  [600, 24],
  [600, 606],
  [40, 315],
  [1176, 315],
] as const;

test.describe("CV OpenGraph card", () => {
  test("renders the same warm paper at the declared size", async ({
    request,
  }) => {
    const { size } = await import("@/app/cv/opengraph-image");
    const { data, info } = await renderedCard(request, "/cv/opengraph-image");

    expect({ height: info.height, width: info.width }).toEqual(size);

    const ground = hexChannels(WARM_PRINT.light.ground);
    const drift = CV_GROUND_PROBES.map(([x, y]) => {
      const offset = (y * info.width + x) * info.channels;
      return Math.max(
        Math.abs(data[offset] - ground[0]),
        Math.abs(data[offset + 1] - ground[1]),
        Math.abs(data[offset + 2] - ground[2]),
      );
    });

    expect(Math.max(...drift)).toBe(0);
  });

  test("draws its copy, not a blank frame", async ({ request }) => {
    const { data, info } = await renderedCard(request, "/cv/opengraph-image");
    const ground = hexChannels(WARM_PRINT.light.ground);

    let inked = 0;
    for (let offset = 0; offset < data.length; offset += info.channels) {
      const off = Math.max(
        Math.abs(data[offset] - ground[0]),
        Math.abs(data[offset + 1] - ground[1]),
        Math.abs(data[offset + 2] - ground[2]),
      );
      if (off > 8) inked += 1;
    }

    /* A floor against an empty frame, not a glyph check — faces that failed to
       load render `.notdef` boxes, which is more ink, not less. The `cmap`
       coverage test is what catches a missing glyph. */
    const share = inked / (info.width * info.height);
    expect(share).toBeGreaterThan(0.015);
    expect(share).toBeLessThan(0.12);
  });
});

test.describe("OpenGraph card typefaces", () => {
  test("ships the display and metadata faces Satori cannot resolve by name", () => {
    const fonts = ogFonts();

    expect(
      fonts.map(({ name, style, weight }) => `${name} ${weight} ${style}`),
    ).toEqual([
      `${OG_FONT.display} 600 normal`,
      `${OG_FONT.display} 600 italic`,
      `${OG_FONT.text} 400 normal`,
      `${OG_FONT.mono} 400 normal`,
    ]);

    for (const font of fonts) {
      /* TrueType's `0x00010000` version tag — a truncated or LFS-pointer file
         would still be a Buffer, and Satori would silently fall back. The floor
         sits low because these are subsets — the smallest shipped face is ~4KB. */
      expect(font.data.readUInt32BE(0)).toBe(0x00010000);
      expect(font.data.byteLength).toBeGreaterThan(2_000);
    }

    expect(
      ogFonts("upright").map(
        ({ name, style, weight }) => `${name} ${weight} ${style}`,
      ),
    ).toEqual([
      `${OG_FONT.display} 600 normal`,
      `${OG_FONT.text} 400 normal`,
      `${OG_FONT.mono} 400 normal`,
    ]);
  });

  test("ships subsets, not the full builds", () => {
    const payload = ogFonts().reduce(
      (total, { data }) => total + data.byteLength,
      0,
    );

    /* The full builds were 481KB for ~120 characters of static copy; #43 set the
       budget at 150KB, and the cut lands near 22KB. The ceiling catches a face
       reverting to its upstream build — Inter alone is 317KB. */
    expect(payload).toBeLessThan(150_000);
  });

  test("covers every character the cards draw", () => {
    for (const file of FONT_FILES) {
      /* Read off disk rather than through `ogFonts()`: what ships is the file,
         and a stale checked-in subset is exactly the failure being hunted. */
      const covered = mappedCodepoints(readFileSync(ogSubsetPath(file)));
      const missing = [...new Set(ogFaceText(file.face))].filter(
        (character) => !covered.has(character.codePointAt(0)!),
      );

      /* Reported as characters, not codepoints: the failure a subset causes is a
         `.notdef` box in a baked PNG, and the fix is `bun run generate:og-fonts`
         — worth being able to read which glyph went missing. */
      expect(missing, `${file.source} is missing glyphs`).toEqual([]);
    }
  });

  test("hands every string the cards draw to the subsetter", () => {
    /* Copy a card draws but no face declares is copy the subsetter never saw —
       covered glyphs by luck, and `.notdef` the moment the luck runs out. */
    for (const copy of OG_DRAWN_COPY) {
      expect(isSubsettedCopy(copy), `unsubsetted card copy: ${copy}`).toBe(
        true,
      );
    }
  });

  test("leaves no literal text in the cards for the subsetter to miss", () => {
    /* The check above only sees copy that reached `og-card-text`. A string typed
       straight into the JSX — a new label, a bare `·` separator — would draw from
       a subset that never saw it, so require every text node to be an expression.
       The pattern matches a `>…<` child holding literal, non-whitespace content
       — across newlines, since prettier gives a text node its own line; style
       objects and template literals sit inside braces and carry no `>`. */
    for (const card of [
      "src/app/opengraph-image.tsx",
      "src/app/cv/opengraph-image.tsx",
    ]) {
      const literals = readFileSync(card, "utf8").match(
        />\s*[^<>{}\s][^<>{}]*</g,
      );

      expect(literals, `literal JSX text in ${card}`).toBeNull();
    }
  });
});
