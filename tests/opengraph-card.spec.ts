import { readFileSync } from "node:fs";

import {
  type APIRequestContext,
  type Page,
  expect,
  test,
} from "@playwright/test";
import sharp from "sharp";

import sitemap from "@/app/sitemap";
import { RESUME_DATA } from "@/data/resume-data";
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

/** A `meta` tag's content, or `null` when the tag is absent — the two failures
    #102 produced, kept distinguishable from an empty string. */
async function metaContent(page: Page, selector: string) {
  const tag = page.locator(selector).first();
  /* Counted first because `getAttribute` waits for the element: a missing tag
     is the defect under test, and it should read as `null` in the assertion
     rather than as a timeout. */
  return (await tag.count()) === 0 ? null : await tag.getAttribute("content");
}

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

/* The rule cards' own margins. Their accent is a 12px rule down the left gutter
   at x≈80–92, so the left-hand probes sit outside it, not on it. */
const RULE_CARD_GROUND_PROBES = [
  [24, 24],
  [1176, 24],
  [24, 606],
  [1176, 606],
  [600, 24],
  [600, 606],
  [40, 315],
  [1176, 315],
] as const;

/* Every segment card built from `OgRuleCard`. Listed rather than derived so a
   new card is a deliberate line here — the enumeration in the literal-JSX test
   below is what makes forgetting one fail. */
const RULE_CARDS = [
  { module: () => import("@/app/cv/opengraph-image"), route: "/cv" },
  { module: () => import("@/app/writing/opengraph-image"), route: "/writing" },
] as const;

for (const { module, route } of RULE_CARDS) {
  test.describe(`${route} OpenGraph card`, () => {
    const imageRoute = `${route}/opengraph-image`;

    test("renders the same warm paper at the declared size", async ({
      request,
    }) => {
      const { size } = await module();
      const { data, info } = await renderedCard(request, imageRoute);

      expect({ height: info.height, width: info.width }).toEqual(size);

      const ground = hexChannels(WARM_PRINT.light.ground);
      const drift = RULE_CARD_GROUND_PROBES.map(([x, y]) => {
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
      const { data, info } = await renderedCard(request, imageRoute);
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
}

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
      "src/app/writing/opengraph-image.tsx",
      /* Not a route, but where the segment cards' drawn text nodes now live —
         a label typed in here would miss the subsetter exactly as one typed
         into a card would. */
      "src/components/og-rule-card.tsx",
    ]) {
      const literals = readFileSync(card, "utf8").match(
        />\s*[^<>{}\s][^<>{}]*</g,
      );

      expect(literals, `literal JSX text in ${card}`).toBeNull();
    }
  });
});

/* The routes that ask to be indexed, read off the sitemap rather than listed:
   #102 shipped because `/writing` was added to the sitemap and to nothing that
   checks a card, so the next route added inherits these assertions instead of
   inheriting silence. */
const indexableRoutes = sitemap().map(({ url }) => new URL(url).pathname);

test.describe("per-route unfurl metadata", () => {
  test("the sitemap is the route set under test", () => {
    /* A guard on the derivation above: an empty or one-entry sitemap would make
       every assertion below vacuous. */
    expect(indexableRoutes).toEqual(["/", "/cv", "/writing"]);
  });

  for (const route of indexableRoutes) {
    test(`${route} serves its own card image`, async ({ page, request }) => {
      await page.goto(route);

      const image = await metaContent(page, 'meta[property="og:image"]');
      expect(image, `${route} has no og:image`).toBeTruthy();

      /* Fetched by pathname, not by the tag's own href: `metadataBase` makes
         that absolute against the production origin, which a local run must not
         reach out to. The status check is what proves the card actually
         renders — a route can name an image file that throws. */
      const rendered = await request.get(new URL(image!).pathname);
      expect(rendered.status(), `${route} card did not render`).toBe(200);
      expect(rendered.headers()["content-type"]).toContain("image/png");

      expect(await metaContent(page, 'meta[property="og:image:width"]')).toBe(
        "1200",
      );
      expect(await metaContent(page, 'meta[property="og:image:height"]')).toBe(
        "630",
      );
      expect(
        await metaContent(page, 'meta[property="og:image:alt"]'),
      ).toBeTruthy();
    });

    test(`${route} gives X an image and a description`, async ({ page }) => {
      await page.goto(route);

      expect(await metaContent(page, 'meta[name="twitter:card"]')).toBe(
        "summary_large_image",
      );
      /* `summary_large_image` with no image is the exact shape of #102: X
         renders the card as a bare link. */
      expect(
        await metaContent(page, 'meta[name="twitter:image"]'),
        `${route} declares a large image card with no image`,
      ).toBeTruthy();
      expect(
        await metaContent(page, 'meta[name="twitter:description"]'),
      ).toBeTruthy();
      expect(await metaContent(page, 'meta[name="twitter:creator"]')).toBe(
        RESUME_DATA.contact.xHandle,
      );
    });
  }

  test("/writing titles its unfurl as itself, not as the homepage", async ({
    page,
  }) => {
    await page.goto("/writing");

    const writingTitle = `Writing — ${RESUME_DATA.name}`;
    expect(await metaContent(page, 'meta[property="og:title"]')).toBe(
      writingTitle,
    );
    /* The regression #102 names: a page that sets `openGraph` but no `twitter`
       keeps the layout's `twitter:title`, so the essay index unfurled under the
       homepage headline. */
    expect(await metaContent(page, 'meta[name="twitter:title"]')).toBe(
      writingTitle,
    );
  });
});
