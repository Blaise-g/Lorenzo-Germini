import { expect, test, type Page } from "@playwright/test";

import { RESUME_DATA } from "@/data/resume-data";

import { personStructuredData } from "./support/structured-data";

/* #101. The defect this guards is invisible at the source level:
   `description: RESUME_DATA.summary` reads perfectly reasonably in
   `layout.tsx`, and only the rendered `<head>` shows it arriving as 901
   characters across four newlines. So every assertion here reads the served
   markup rather than the metadata object. */

/** Google truncates a SERP snippet at ~155–160 characters. */
const maxDescription = 160;
/** And a SERP title at ~60. */
const maxTitle = 60;

/** Asserts the tag exists before narrowing, so callers read `.length` without
    a non-null assertion and a missing tag fails as itself rather than as a
    length error. */
async function metaContent(page: Page, selector: string) {
  const content = await page
    .locator(`head ${selector}`)
    .getAttribute("content");

  expect(content, `should serve ${selector}`).toBeTruthy();

  return content!;
}

/** `source` names the field the copy comes from: every route's description is
    a different `RESUME_DATA` field, so a failure here is only actionable if it
    says which one to shorten. */
function expectSnippetDescription(
  content: string,
  { label, source }: { label: string; source: string },
) {
  expect(
    content.length,
    `${label} is ${content.length} characters; shorten ${source}`,
  ).toBeLessThanOrEqual(maxDescription);
  /* A newline is what made the shipped tag three paragraphs. */
  expect(content, `${label} should be one paragraph`).not.toContain("\n");
}

/* Every route, not just the one #101 changed: the ceiling is a property of the
   surface rather than of this fix, and `/writing` currently sits at 159 of the
   160 — one word added to its standfirst would ship a truncated snippet. */
const routes = [
  { path: "/", source: "RESUME_DATA.metaDescription" },
  { path: "/cv", source: "`cvDescription` in src/app/cv/page.tsx" },
  { path: "/writing", source: "RESUME_DATA.writingPage.standfirst" },
] as const;

for (const { path, source } of routes) {
  test(`${path} serves a snippet-sized title and description`, async ({
    page,
  }) => {
    await page.goto(path);

    const title = await page.title();
    expect(title.length, `<title> on ${path}: ${title}`).toBeLessThanOrEqual(
      maxTitle,
    );

    const description = await metaContent(page, 'meta[name="description"]');
    expectSnippetDescription(description, {
      label: `meta description on ${path}`,
      source,
    });
  });
}

/* The social surfaces fall back to the layout's when a route omits them, so
   they can regress independently of `meta description`. Only `/` is asserted
   here: `/writing` ships an incomplete card set, which is #102's ticket. */
test("the homepage social descriptions are snippet-sized too", async ({
  page,
}) => {
  await page.goto("/");

  for (const selector of [
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
  ]) {
    expectSnippetDescription(await metaContent(page, selector), {
      label: selector,
      source: "RESUME_DATA.metaDescription",
    });
  }
});

/* Shortening the `meta` surfaces deliberately left `summary` alone: schema.org
   imposes no length limit and the long form is what AI crawlers get. Losing it
   here would be a silent regression in the opposite direction. */
test("the long summary keeps its JSON-LD role", async ({ page }) => {
  await page.goto("/");

  const person = await personStructuredData(page);

  expect(person, "the homepage should emit Person JSON-LD").toBeTruthy();
  expect(person.description).toBe(RESUME_DATA.summary);
});

/* `metaTitle` is stored whole rather than assembled from `name` and
   `roleLabel`, because it is owner-approved copy (#100) and a SERP title
   should not silently rewrite itself when the masthead label is reworded. That
   choice is only safe if the drift it permits is visible, which is this. */
test("the meta title still agrees with the fields it restates", async () => {
  expect(
    RESUME_DATA.metaTitle,
    "the <title> should still name the person the masthead names",
  ).toContain(RESUME_DATA.name);
  expect(
    RESUME_DATA.metaTitle,
    "the <title> should still carry the masthead's role label",
  ).toContain(RESUME_DATA.roleLabel);
});
