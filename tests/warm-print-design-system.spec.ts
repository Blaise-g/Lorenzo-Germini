import { expect, test } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { WARM_PRINT } from "@/lib/warm-print";

import { contrast } from "./support/color";
import { extractBlock, scanSource } from "./support/design-system-guard";
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
  const files = await sourceFiles(path.join(process.cwd(), "src"));
  const violations: string[] = [];

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    violations.push(...scanSource(relativePath, await readFile(file, "utf8")));
  }

  expect(violations).toEqual([]);
});

/* The walk above can only prove that today's source is clean. These drive the
   same scanner with source of their own, so the exemptions it carries stay
   pinned — the trade-off ADR-0004 turned down was one that quietly stopped
   catching four shipped palette values. */
const ordinary = "src/components/hub-shell.tsx";

test("the guard still catches every shape of palette literal", () => {
  const mustCatch = [
    ...Object.values(WARM_PRINT).flatMap((palette) => Object.values(palette)),
    "bg-[#100]",
    "#333",
    "color: rgb(28, 25, 23)",
    "oklch(0.98 0.01 80)",
    "text-slate-500",
    "GRAIN_URL",
  ];

  for (const source of mustCatch) {
    expect(scanSource(ordinary, source), `should flag: ${source}`).not.toEqual(
      [],
    );
  }
});

test("the guard is blind to GH- issue citations", () => {
  const citations = [
    "/* Symmetric since GH-89 put the theme toggle in flow. */",
    "// owner-approved copy (GH-100), and a SERP",
    "/* The essay index (spec §2.5, GH-24). */",
    "* the regression GH-1006 fixed by",
  ];

  for (const source of citations) {
    expect(scanSource(ordinary, source), `should ignore: ${source}`).toEqual(
      [],
    );
  }
});

test("an ambiguous #NNN violation offers both readings", () => {
  expect(scanSource("src/foo.ts", "(#110)")).toEqual([
    "src/foo.ts: #110 — a colour here belongs in the token layer; " +
      "if it is an issue reference, cite it as GH-110 (ADR-0004)",
  ]);

  /* Six digits cannot be an issue number, so the hint would be misdirection. */
  expect(scanSource("src/foo.ts", 'color: "#171412"')).toEqual([
    "src/foo.ts: #171412",
  ]);
});

test("the palette source is exempt from colour syntax, and nothing else", () => {
  const palette = "src/lib/warm-print.ts";

  expect(scanSource(palette, 'ground: "#faf6ef"')).toEqual([]);
  expect(scanSource(ordinary, 'ground: "#faf6ef"')).toEqual([
    `${ordinary}: #faf6ef`,
  ]);
  expect(scanSource(palette, "GRAIN_URL")).toEqual([`${palette}: GRAIN_URL`]);
});

test("globals.css is exempt inside its token blocks, and nothing else", () => {
  const hoverMix =
    "color-mix(in srgb, var(--color-accent) 92%, var(--color-ink))";
  const globals = (stray: string) => `@theme { --color-ink: #1c1917; }
.dark { --color-ink: #ece7de; }
@media print and (min-width: 1px) { .x { margin: 0; } }
@media print { :root, .dark { --color-ink: #0d0d0d; } }
.primary-control:hover { background: ${hoverMix}; }
${stray}`;

  expect(scanSource("src/app/globals.css", globals(""))).toEqual([]);
  expect(
    scanSource("src/app/globals.css", globals(".x { color: #7a2f16; }")),
  ).toEqual(["src/app/globals.css: #7a2f16"]);

  /* The hover mix is role-derived and allowed exactly once; a second one is a
     second hand-mixed colour. */
  expect(
    scanSource("src/app/globals.css", globals(`.y { color: ${hoverMix}; }`)),
  ).toEqual([
    "src/app/globals.css: expected one role-derived primary hover mix",
  ]);
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
