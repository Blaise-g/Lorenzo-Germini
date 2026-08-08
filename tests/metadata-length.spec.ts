import { expect, test } from "@playwright/test";

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

async function metaContent(
  page: import("@playwright/test").Page,
  selector: string,
) {
  return page.locator(`head ${selector}`).getAttribute("content");
}

for (const path of ["/", "/cv", "/writing"] as const) {
  test(`${path} serves a snippet-sized title and description`, async ({
    page,
  }) => {
    await page.goto(path);

    const title = await page.title();
    expect(title.length, `<title> on ${path}: ${title}`).toBeLessThanOrEqual(
      maxTitle,
    );

    const description = await metaContent(page, 'meta[name="description"]');
    expect(description, `${path} should serve a meta description`).toBeTruthy();
    expect(
      description!.length,
      `meta description on ${path}: ${description}`,
    ).toBeLessThanOrEqual(maxDescription);
    /* A newline is what made the shipped tag three paragraphs. */
    expect(
      description,
      `meta description on ${path} should be one paragraph`,
    ).not.toContain("\n");
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
    const content = await metaContent(page, selector);
    expect(content, `/ should serve ${selector}`).toBeTruthy();
    expect(content!.length, `${selector}: ${content}`).toBeLessThanOrEqual(
      maxDescription,
    );
    expect(content, `${selector} should be one paragraph`).not.toContain("\n");
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
