import { expect, test } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { WARM_PRINT } from "@/lib/warm-print";

import { contrast } from "./support/color";
import { colorSyntax, describeViolation } from "./support/design-system-guard";
import { setTheme, themes } from "./support/theme";

const colorRoles = [
  "accent",
  "accent-foreground",
  "body",
  "border",
  "faint",
  "ground",
  "ink",
] as const;

const expectedTokens = colorRoles.map((role) => `--color-${role}`);

function extractBlock(source: string, marker: string, fromIndex = 0) {
  const markerIndex = source.indexOf(marker, fromIndex);
  if (markerIndex === -1) throw new Error(`Missing CSS block: ${marker}`);

  const openingBrace = source.indexOf("{", markerIndex + marker.length);
  if (openingBrace === -1) throw new Error(`Unclosed CSS block: ${marker}`);

  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      return {
        body: source.slice(openingBrace + 1, index),
        end: index + 1,
        start: markerIndex,
      };
    }
  }

  throw new Error(`Unclosed CSS block: ${marker}`);
}

function colorTokenNames(source: string) {
  return [...source.matchAll(/(--color-[a-z-]+)\s*:/g)]
    .map((match) => match[1])
    .sort();
}

function colorTokenValues(source: string) {
  return Object.fromEntries(
    [...source.matchAll(/(--color-[a-z-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)]
      .map((match) => [match[1], match[2].toLowerCase()])
      .sort(([first], [second]) => first.localeCompare(second)),
  );
}

function paletteTokens(palette: (typeof WARM_PRINT)[keyof typeof WARM_PRINT]) {
  return Object.fromEntries(
    Object.entries(palette)
      .map(([role, value]) => [
        `--color-${role === "accentForeground" ? "accent-foreground" : role}`,
        value,
      ])
      .sort(([first], [second]) => first.localeCompare(second)),
  );
}

function browserPalette(palette: (typeof WARM_PRINT)[keyof typeof WARM_PRINT]) {
  return Object.fromEntries(
    Object.entries(palette).map(([role, value]) => {
      const channels = value
        .slice(1)
        .match(/.{2}/g)!
        .map((channel) => Number.parseInt(channel, 16));
      return [
        role === "accentForeground" ? "accent-foreground" : role,
        `rgb(${channels.join(", ")})`,
      ];
    }),
  );
}

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(entryPath);
      return /\.(?:css|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
    }),
  );
  return files.flat();
}

test("the three color token sets declare exactly the seven Warm Print roles", async () => {
  const css = await readFile(
    path.join(process.cwd(), "src/app/globals.css"),
    "utf8",
  );
  const theme = extractBlock(css, "@theme");
  const dark = extractBlock(css, ".dark", theme.end);
  const letterPrint = extractBlock(css, "@media print and");
  const print = extractBlock(css, "@media print", letterPrint.end);
  const printTokens = extractBlock(print.body, ":root,");

  expect(colorTokenNames(theme.body)).toEqual(expectedTokens);
  expect(colorTokenNames(dark.body)).toEqual(expectedTokens);
  expect(colorTokenNames(printTokens.body)).toEqual(expectedTokens);
  expect(colorTokenValues(theme.body)).toEqual(paletteTokens(WARM_PRINT.light));
  expect(colorTokenValues(dark.body)).toEqual(paletteTokens(WARM_PRINT.dark));
  expect(colorTokenValues(printTokens.body)).toEqual(
    paletteTokens(WARM_PRINT.print),
  );
});

test("palette values, retired aliases, grain, and the border shim stay out of source", async () => {
  const srcRoot = path.join(process.cwd(), "src");
  const files = await sourceFiles(srcRoot);
  const violations: string[] = [];
  const retiredUtility =
    /(?:--color-|(?:bg|text|border|ring|outline|decoration)-)(?:background|foreground|card(?:-foreground)?|popover(?:-foreground)?|primary(?:-foreground)?|secondary(?:-foreground)?|muted(?:-foreground)?|destructive(?:-foreground)?|input|ring)\b/g;
  const builtInPalette =
    /(?:bg|text|border|ring|outline|decoration)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-[0-9]+)?(?:\/[0-9]+)?\b/g;
  const retiredEffects =
    /\b(?:BORDER_SHIM|GRAIN_URL)\b|feTurbulence|mix-blend-/g;

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    const source = await readFile(file, "utf8");
    let searchable = source;

    if (relativePath === "src/app/globals.css") {
      const theme = extractBlock(searchable, "@theme");
      const dark = extractBlock(searchable, ".dark", theme.end);
      const letterPrint = extractBlock(searchable, "@media print and");
      const print = extractBlock(searchable, "@media print", letterPrint.end);
      const ranges = [theme, dark, print].sort((a, b) => b.start - a.start);
      for (const range of ranges) {
        searchable =
          searchable.slice(0, range.start) + searchable.slice(range.end);
      }

      const primaryHoverMix =
        /color-mix\(\s*in srgb,\s*var\(--color-accent\)\s*92%,\s*var\(--color-ink\)\s*\)/g;
      const hoverMixes = searchable.match(primaryHoverMix) ?? [];
      if (hoverMixes.length !== 1) {
        violations.push(
          `${relativePath}: expected one role-derived primary hover mix`,
        );
      }
      searchable = searchable.replace(primaryHoverMix, "");
    }

    const patterns =
      relativePath === "src/lib/warm-print.ts"
        ? [retiredUtility, builtInPalette, retiredEffects]
        : [colorSyntax, retiredUtility, builtInPalette, retiredEffects];

    for (const pattern of patterns) {
      for (const match of searchable.matchAll(pattern)) {
        violations.push(describeViolation(relativePath, match[0]));
      }
    }
  }

  expect(violations).toEqual([]);
});

/* The guard above can only ever prove that today's source is clean. These prove
   it would still bite — the trade-off ADR-0004 turned down was one that quietly
   stopped catching four shipped palette values. */
test("the colour pattern still catches every shape of palette literal", () => {
  const mustCatch = [
    ...Object.values(WARM_PRINT).flatMap((palette) => Object.values(palette)),
    "bg-[#100]",
    "#333",
    "color: rgb(28, 25, 23)",
    "oklch(0.98 0.01 80)",
    "color-mix(in srgb, red, blue)",
  ];

  for (const source of mustCatch) {
    expect(source.match(colorSyntax), `should flag: ${source}`).not.toBeNull();
  }
});

test("the colour pattern is blind to GH- issue citations", () => {
  const citations = [
    "/* Symmetric since GH-89 put the theme toggle in flow. */",
    "// owner-approved copy (GH-100), and a SERP",
    "/* The essay index (spec §2.5, GH-24). */",
    "* the regression GH-1006 fixed by",
  ];

  for (const source of citations) {
    expect(source.match(colorSyntax), `should ignore: ${source}`).toBeNull();
  }
});

test("a bare #NNN violation says how to cite an issue instead", () => {
  expect(describeViolation("src/foo.ts", "#110")).toBe(
    "src/foo.ts: #110 — if this is an issue reference, cite it as GH-110 " +
      "(ADR-0004); the guard reads #110 as a colour",
  );

  /* Six digits cannot be an issue number, so the hint would be misdirection. */
  expect(describeViolation("src/foo.ts", "#171412")).toBe(
    "src/foo.ts: #171412",
  );
  expect(describeViolation("src/foo.ts", "#9c3c1c")).toBe(
    "src/foo.ts: #9c3c1c",
  );
});

test.describe("Warm Print runtime contract", () => {
  for (const theme of themes) {
    test(`${theme} mode exposes the signed palette and readable metadata`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await setTheme(page, theme);
      await page.goto("/");
      /* Scrolled to the foot, where the smallest faint type on the page is: the
         colophon's 12px sentence. It used to scroll to the command-menu hint,
         which sat just above it and left with the palette (#89). */
      await page
        .getByRole("contentinfo")
        .getByText("agents welcome", { exact: false })
        .scrollIntoViewIfNeeded();

      const values = await page.evaluate((roles) => {
        const root = getComputedStyle(document.documentElement);
        const normalizeColor = (value: string) => {
          const probe = document.createElement("span");
          probe.style.color = value;
          document.body.append(probe);
          const normalized = getComputedStyle(probe).color;
          probe.remove();
          return normalized;
        };
        const token = (role: string) =>
          normalizeColor(root.getPropertyValue(`--color-${role}`));
        const faint = token("faint");

        const faintText = Array.from(
          document.querySelectorAll<HTMLElement>("*"),
        ).flatMap((element) => {
          const style = getComputedStyle(element);
          if (
            !element.textContent?.trim() ||
            element.getClientRects().length === 0 ||
            style.color !== faint
          ) {
            return [];
          }
          return [
            {
              color: style.color,
              size: Number.parseFloat(style.fontSize),
              text: element.textContent.trim().slice(0, 80),
            },
          ];
        });

        return {
          faintText,
          tokens: Object.fromEntries(roles.map((role) => [role, token(role)])),
        };
      }, colorRoles);

      const expected = browserPalette(WARM_PRINT[theme]);

      expect(values.tokens).toEqual(expected);
      expect(values.faintText.length).toBeGreaterThan(0);
      for (const item of values.faintText) {
        expect(
          item.size,
          `${item.text} should meet the faint size floor`,
        ).toBeGreaterThanOrEqual(12);
        expect(
          contrast(item.color, expected.ground),
          `${item.text} should meet AA against the page ground`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      expect(
        contrast(expected.accent, expected["accent-foreground"]),
      ).toBeGreaterThanOrEqual(4.5);
    });

    test(`${theme} mode primitives keep readable text and functional hairlines`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await setTheme(page, theme);
      await page.goto("/");

      const primitives = await page.evaluate(() => {
        const effectiveBackground = (element: HTMLElement) => {
          let current: HTMLElement | null = element;
          while (current) {
            const background = getComputedStyle(current).backgroundColor;
            const alpha = Number((background.match(/[\d.]+/g) ?? [])[3] ?? "1");
            if (alpha > 0) return background;
            current = current.parentElement;
          }
          return getComputedStyle(document.body).backgroundColor;
        };

        const metrics = (selector: string, borderSide = "borderColor") => {
          const element = document.querySelector<HTMLElement>(selector);
          if (!element) throw new Error(`Missing primitive: ${selector}`);
          const style = getComputedStyle(element);
          return {
            background: effectiveBackground(element),
            border:
              borderSide === "borderLeftColor"
                ? style.borderLeftColor
                : style.borderColor,
            color: style.color,
          };
        };

        /* The palette's own primitives — a selected `cmdk` item, the dialog
           surface, and the shortcut hint's `kbd` — left this set with #89. The
           theme toggle joins it: it is the `secondary` button variant's only
           instance on the page, and since #89 it renders against the masthead
           rather than over the page as fixed chrome. */
        return {
          badge: metrics('[data-slot="badge"]'),
          contactButton: metrics('a[aria-label="Email"]'),
          themeToggle: metrics('[data-testid="theme-toggle"]'),
        };
      });

      for (const [name, primitive] of Object.entries(primitives)) {
        expect(
          contrast(primitive.color, primitive.background),
          `${name} text should meet AA`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrast(primitive.border, primitive.background),
          `${name} hairline should remain visible`,
        ).toBeGreaterThanOrEqual(3);
      }
    });

    test(`${theme} mode primary hover changes only the accent ground`, async ({
      page,
    }) => {
      await setTheme(page, theme);
      await page.goto("/missing");
      const primaryControl = page.getByRole("link", {
        name: "Back to resume",
      });
      const initial = await primaryControl.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          color: style.color,
        };
      });

      await primaryControl.hover();

      const hovered = await primaryControl.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          color: style.color,
        };
      });

      expect(hovered.background).not.toBe(initial.background);
      expect(hovered.color).toBe(initial.color);
    });
  }

  test("display and metadata roles use their locked font families", async ({
    page,
  }) => {
    await page.goto("/");

    const families = await page.evaluate(() => {
      const sectionNamed = (name: string) =>
        Array.from(document.querySelectorAll("section")).find(
          (section) =>
            section.querySelector(":scope > h2")?.textContent?.trim() === name,
        );

      return {
        body: getComputedStyle(document.body).fontFamily,
        /* The proof line, not the row's date column beside it — that one is
           metadata and is asserted as mono below. */
        bodyCopy: getComputedStyle(
          sectionNamed("Work")!.querySelector(
            ".print-keep-together p.text-body",
          )!,
        ).fontFamily,
        hero: getComputedStyle(document.querySelector("h1")!).fontFamily,
        metadata: getComputedStyle(
          sectionNamed("Work")!.querySelector(".text-faint") as HTMLElement,
        ).fontFamily,
        project: getComputedStyle(
          sectionNamed("Projects")!.querySelector("h3")!,
        ).fontFamily,
        projectDescription: getComputedStyle(
          sectionNamed("Projects")!.querySelector("p")!,
        ).fontFamily,
        role: getComputedStyle(sectionNamed("Work")!.querySelector("h3")!)
          .fontFamily,
      };
    });

    expect(families.body).toContain("Inter");
    expect(families.bodyCopy).toContain("Inter");
    expect(families.metadata).toContain("JetBrains Mono");
    expect(families.hero).toContain("Fraunces");
    expect(families.project).toContain("Fraunces");
    expect(families.projectDescription).toContain("Inter");
    expect(families.role).toContain("Fraunces");
  });
});
