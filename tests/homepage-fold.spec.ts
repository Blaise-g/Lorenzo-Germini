/* The redesign's one binding constraint, at the top of the page: the site must
   never look less technical than the chronological CV it replaced.

   `docs/spec/retained-proof.json` is the floor for the whole page — it says
   nothing about where the proof sits. This spec is the other half, from
   retained-proof.md's Scope section and spec §2.6 constraint 7: the incumbent
   named three technical terms above the fold, both #12 prototype arms named
   zero, and the fix was always copy rather than composition. So the fold is
   measured directly, at the two widths the composition forks between. */

import { expect, test } from "@playwright/test";

import { PATH_DOOR_PREVIEW_STORAGE_KEY } from "@/components/flat-site/path-door";
import { RESUME_DATA } from "@/data/resume-data";

/* Technical nouns a reader would not find on a non-technical portfolio. Terms
   are matched case-insensitively and counted once each, so repeating one word
   cannot satisfy the count. */
const technicalTerms = [
  "agentic RAG",
  "multi-provider",
  "LLM",
  "OpenAI",
  "Claude",
  "Gemini",
  "ISO",
  "evals",
  "RAG",
];

/* Named concrete systems, as opposed to a category of work. The subhead names
   the product; the constraint is that at least one of these survives the fold. */
const namedSystems = [
  "Complaion",
  ...RESUME_DATA.projects.map((project) => project.title),
];

const foldWidths = [
  { height: 812, label: "phone", width: 375 },
  { height: 900, label: "desktop", width: 1440 },
] as const;

/* Text whose box starts inside the first viewport — what a visitor reads before
   scrolling. Elements straddling the fold count: their first line is visible. */
async function textAboveTheFold(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const fold = window.innerHeight;
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    const visible: string[] = [];

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const parent = node.parentElement;
      if (!parent || !node.textContent?.trim()) continue;
      if (parent.closest("nextjs-portal, script, style")) continue;
      const style = getComputedStyle(parent);
      if (style.visibility === "hidden" || style.display === "none") continue;

      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (rect.height === 0 || rect.top >= fold || rect.bottom <= 0) continue;

      visible.push(node.textContent);
    }

    return visible.join(" ");
  });
}

/* With the door to `/path` switched on (GH-151) the header grows a line, and
   the claim must still clear the fold. The dev-only preview key stands in for
   the switch. */
const doorStates = [
  { door: false, suffix: "" },
  { door: true, suffix: " with the door on" },
] as const;

for (const { height, label, width } of foldWidths) {
  for (const { door, suffix } of doorStates) {
    test(`the ${label} fold makes a technical claim${suffix}`, async ({
      page,
    }) => {
      await page.setViewportSize({ height, width });
      if (door) {
        await page.addInitScript((key) => {
          window.localStorage.setItem(key, "1");
        }, PATH_DOOR_PREVIEW_STORAGE_KEY);
      }
      await page.goto("/");
      if (door) await expect(page.getByTestId("path-door")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);

      const fold = (await textAboveTheFold(page)).toLowerCase();

      const found = technicalTerms.filter((term) =>
        fold.includes(term.toLowerCase()),
      );
      expect(
        found.length,
        `the ${label} fold should name at least three technical terms (parity with the incumbent); found ${found.join(", ") || "none"}`,
      ).toBeGreaterThanOrEqual(3);

      expect(
        namedSystems.filter((system) => fold.includes(system.toLowerCase())),
        `the ${label} fold should name at least one concrete system`,
      ).not.toHaveLength(0);
    });
  }
}
