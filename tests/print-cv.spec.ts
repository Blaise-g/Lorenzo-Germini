import { expect, test, type Page } from "@playwright/test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import { RESUME_DATA } from "@/data/resume-data";

import { removeDevOverlay } from "./support/dev-overlay";
import { setTheme, themes, type Theme } from "./support/theme";

const minimumPrintFontSizePx = 12; // 9pt at the CSS reference pixel ratio.
const millimetersToPoints = 72 / 25.4;
const printMarginPoints = 14 * millimetersToPoints;

const paperSizes = {
  A4: {
    height: 297 * millimetersToPoints,
    width: 210 * millimetersToPoints,
  },
  Letter: {
    height: 792,
    width: 612,
  },
} as const;

const printRoutes = [
  { label: "homepage", path: "/" },
  { label: "CV", path: "/cv" },
] as const;

function normalizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function readPdfGeometry(pdf: Buffer) {
  const loadingTask = getDocument({
    data: new Uint8Array(pdf),
  });
  const document = await loadingTask.promise;

  try {
    return await Promise.all(
      Array.from({ length: document.numPages }, async (_, index) => {
        const page = await document.getPage(index + 1);
        const textContent = await page.getTextContent();
        const items = textContent.items.flatMap((item) => {
          if (!("str" in item) || !item.str.trim()) return [];

          return [
            {
              height: item.height,
              str: item.str,
              width: item.width,
              x: item.transform[4],
              y: item.transform[5],
            },
          ];
        });
        const [left, bottom, right, top] = page.view;

        return {
          height: top - bottom,
          items,
          normalizedText: normalizePdfText(
            items.map((item) => item.str).join(" "),
          ),
          width: right - left,
        };
      }),
    );
  } finally {
    await loadingTask.destroy();
  }
}

function expectFragmentsOnOnePage(
  pages: Awaited<ReturnType<typeof readPdfGeometry>>,
  label: string,
  fragments: readonly string[],
) {
  const normalizedFragments = fragments.map(normalizePdfText);
  const matchingPages = pages
    .map((page, index) => ({
      index,
      matches: normalizedFragments.every((fragment) =>
        page.normalizedText.includes(fragment),
      ),
    }))
    .filter(({ matches }) => matches)
    .map(({ index }) => index + 1);

  expect(
    matchingPages,
    `${label} should render completely on one PDF page`,
  ).toHaveLength(1);
}

function measureTextBlockFill(
  page: Awaited<ReturnType<typeof readPdfGeometry>>[number],
  excludedText: readonly string[] = [],
) {
  const excluded = new Set(excludedText);
  const content = page.items.filter((item) => !excluded.has(item.str.trim()));
  if (content.length === 0) return 0;

  const contentTop = Math.max(...content.map((item) => item.y + item.height));
  const contentBottom = Math.min(...content.map((item) => item.y));
  const printableHeight = page.height - 2 * printMarginPoints;

  return (contentTop - contentBottom) / printableHeight;
}

async function openPrintCv(page: Page, theme: Theme, route = "/") {
  await page.emulateMedia({ media: "print", colorScheme: theme });
  await setTheme(page, theme);
  await page.goto(route);
  await removeDevOverlay(page);
  await page.evaluate(() => document.fonts.ready);
}

test.describe("print CV baseline", () => {
  test("the fill oracle rejects content confined to the top quarter", () => {
    const sparsePage = {
      height: paperSizes.Letter.height,
      items: [
        { height: 12, str: "Projects", width: 48, x: 40, y: 700 },
        { height: 12, str: "One card", width: 48, x: 40, y: 550 },
      ],
      normalizedText: "projectsonecard",
      width: paperSizes.Letter.width,
    };

    expect(measureTextBlockFill(sparsePage)).toBeLessThan(1 / 3);
  });

  test("defines A4 and Letter page boxes with 14mm margins", async ({
    page,
  }) => {
    await openPrintCv(page, "light");

    const printRules = await page.evaluate(() =>
      Array.from(document.styleSheets).flatMap((styleSheet) => {
        try {
          return Array.from(styleSheet.cssRules)
            .map((rule) => rule.cssText)
            .filter(
              (rule) =>
                rule.startsWith("@page") || rule.startsWith("@media print"),
            );
        } catch {
          return [];
        }
      }),
    );

    expect(printRules.join(" ")).toMatch(
      /@page\s*\{[^}]*size:\s*a4;[^}]*margin:\s*14mm;/i,
    );
    expect(printRules.join(" ")).toMatch(
      /@media print and \(width:\s*8\.5in\) and \(height:\s*11in\)\s*\{\s*@page\s*\{[^}]*size:\s*letter;[^}]*margin:\s*14mm;/i,
    );
    expect(printRules.join(" ")).toMatch(
      /@media print\s*\{[\s\S]*\.fixed\s*\{[^}]*position:\s*static\s*!important;/i,
    );
  });

  for (const route of printRoutes) {
    for (const theme of themes) {
      test(`${route.label} in ${theme} mode keeps printable content readable and unsplit`, async ({
        page,
      }) => {
        await openPrintCv(page, theme, route.path);

        const printState = await page.evaluate((fontFloor) => {
          const sectionNamed = (name: string) =>
            Array.from(document.querySelectorAll("section")).find(
              (section) =>
                section.querySelector(":scope h2")?.textContent?.trim() ===
                name,
            );
          const projects =
            sectionNamed("Projects") ?? sectionNamed("Selected systems");
          const visibleTextElements = Array.from(
            document.querySelectorAll<HTMLElement>("#main-content *"),
          ).filter((element) => {
            const style = getComputedStyle(element);
            return (
              element.childNodes.length > 0 &&
              element.textContent?.trim() &&
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              element.getClientRects().length > 0
            );
          });

          return {
            blocksThatCanSplit: Array.from(
              document.querySelectorAll<HTMLElement>(".print-keep-together"),
            )
              .filter(
                (element) => getComputedStyle(element).breakInside !== "avoid",
              )
              .map((element) =>
                element.querySelector("h3")?.textContent?.trim(),
              ),
            bulletsThatCanSplit: Array.from(
              document.querySelectorAll<HTMLElement>(
                ".print-keep-together p, .print-keep-together li",
              ),
            )
              .filter(
                (element) => getComputedStyle(element).breakInside !== "avoid",
              )
              .map((element) => element.textContent?.trim()),
            headingsThatCanOrphan: Array.from(
              document.querySelectorAll<HTMLElement>(".print-keep-together h3"),
            )
              .filter(
                (element) => getComputedStyle(element).breakAfter !== "avoid",
              )
              .map((element) => element.textContent?.trim()),
            fixedVisible: Array.from(
              document.querySelectorAll<HTMLElement>("body *"),
            )
              .filter((element) => {
                const style = getComputedStyle(element);
                return (
                  style.position === "fixed" &&
                  style.display !== "none" &&
                  style.visibility !== "hidden" &&
                  element.getClientRects().length > 0
                );
              })
              .map((element) => element.getAttribute("aria-label")),
            undersizedText: visibleTextElements
              .map((element) => ({
                size: Number.parseFloat(getComputedStyle(element).fontSize),
                text: element.textContent?.trim().slice(0, 80),
              }))
              .filter(({ size }) => size < fontFloor),
            projectsBreakBefore:
              projects === undefined
                ? null
                : getComputedStyle(projects).breakBefore,
          };
        }, minimumPrintFontSizePx);

        expect(printState.blocksThatCanSplit).toEqual([]);
        expect(printState.bulletsThatCanSplit).toEqual([]);
        expect(printState.headingsThatCanOrphan).toEqual([]);
        expect(printState.fixedVisible).toEqual([]);
        expect(printState.undersizedText).toEqual([]);
        expect(printState.projectsBreakBefore).toBe("auto");
      });

      for (const format of ["A4", "Letter"] as const) {
        test(`${route.label} in ${theme} mode fits ${format} output on at most two pages`, async ({
          page,
        }) => {
          await openPrintCv(page, theme, route.path);

          const pdf = await page.pdf({
            format,
            preferCSSPageSize: false,
            printBackground: true,
          });
          const pages = await readPdfGeometry(pdf);
          const expectedPaper = paperSizes[format];

          expect(pages.length).toBeGreaterThan(0);

          const finalPage = pages.at(-1)!;
          const finalPageFill = measureTextBlockFill(finalPage, [
            RESUME_DATA.name,
          ]);

          expect(
            finalPageFill,
            `${format} final page should fill at least one-third of the text block`,
          ).toBeGreaterThanOrEqual(1 / 3);

          for (const [index, pdfPage] of pages.entries()) {
            expect(
              pdfPage.width,
              `${format} page ${index + 1} should keep its physical width`,
            ).toBeGreaterThanOrEqual(expectedPaper.width - 1);
            expect(
              pdfPage.width,
              `${format} page ${index + 1} should keep its physical width`,
            ).toBeLessThanOrEqual(expectedPaper.width + 1);
            expect(
              pdfPage.height,
              `${format} page ${index + 1} should keep its physical height`,
            ).toBeGreaterThanOrEqual(expectedPaper.height - 1);
            expect(
              pdfPage.height,
              `${format} page ${index + 1} should keep its physical height`,
            ).toBeLessThanOrEqual(expectedPaper.height + 1);

            for (const item of pdfPage.items) {
              expect(
                item.x,
                `${format} page ${index + 1} text should clear the left margin`,
              ).toBeGreaterThanOrEqual(printMarginPoints - 3);
              expect(
                item.x + item.width,
                `${format} page ${index + 1} text should clear the right margin`,
              ).toBeLessThanOrEqual(pdfPage.width - printMarginPoints + 3);
              expect(
                item.y,
                `${format} page ${index + 1} text should clear the bottom margin`,
              ).toBeGreaterThanOrEqual(printMarginPoints - 3);
              expect(
                item.y + item.height,
                `${format} page ${index + 1} text should clear the top margin`,
              ).toBeLessThanOrEqual(pdfPage.height - printMarginPoints + 3);
            }
          }

          for (const work of RESUME_DATA.work) {
            const descriptions =
              typeof work.description === "string"
                ? [work.description]
                : (work.description ?? []);
            expectFragmentsOnOnePage(pages, `${work.company} role block`, [
              work.company,
              ...descriptions,
            ]);
          }

          for (const project of RESUME_DATA.projects) {
            expectFragmentsOnOnePage(pages, `${project.title} project card`, [
              project.title,
              project.description,
              ...project.techStack,
            ]);
          }

          expect(pages.length).toBeLessThanOrEqual(2);
        });
      }
    }
  }
});
