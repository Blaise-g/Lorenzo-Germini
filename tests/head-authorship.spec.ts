import { expect, test } from "@playwright/test";

import { RESUME_DATA } from "@/data/resume-data";

import { routesUsingTheSharedShell } from "./support/routes";

/* #105(1). Two metadata fields declaring the same authorship read as the only
   one apiece at the source, thirty lines apart; counting tags in the rendered
   head is the only place the duplicate shows.

   Both halves of `authors` are asserted, because the cheap way to satisfy a
   duplicate count is to drop the wrong field: `other.author` emits only the
   meta, so keeping that one would silently lose `rel="author"`. */

for (const path of routesUsingTheSharedShell) {
  test(`${path} declares its author exactly once`, async ({ page }) => {
    await page.goto(path);

    const authorMeta = page.locator('head meta[name="author"]');
    await expect(
      authorMeta,
      `${path} should name its author once, not once per metadata field`,
    ).toHaveCount(1);
    await expect(authorMeta).toHaveAttribute("content", RESUME_DATA.name);

    const authorLink = page.locator('head link[rel="author"]');
    await expect(authorLink).toHaveCount(1);
    await expect(authorLink).toHaveAttribute(
      "href",
      RESUME_DATA.personalWebsiteUrl,
    );
  });
}
