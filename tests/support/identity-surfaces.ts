import type { APIRequestContext, Page } from "@playwright/test";

/**
 * The places this site states who it is and where it lives.
 *
 * Nothing generates them from `RESUME_DATA` — every one is a hand edit — so
 * they drift, and the drift is the defect (#44 shipped a new role label in the
 * masthead alone and left five surfaces claiming the retired one). A guard is
 * only as good as its surface list, so the list lives here once rather than
 * once per spec.
 */
export type IdentitySurface = { name: string; text: string };

/**
 * Every static file that restates identity or routing in hand-written form.
 * `robots.txt` and `sitemap.xml` carry absolute URLs, so they belong to any
 * host audit even though they say nothing about the role.
 */
export const IDENTITY_MANIFESTS = ["/llms.txt", "/llms-full.txt"] as const;
export const ROUTING_MANIFESTS = ["/robots.txt", "/sitemap.xml"] as const;

/**
 * Collects the homepage's rendered surfaces plus each given static path.
 *
 * The whole `<head>` is one surface rather than a handful of named `<meta>`
 * reads: a claim that migrates to a tag nobody thought to list should still be
 * caught. Callers get the surfaces named, so a failure says which one drifted.
 */
export async function collectIdentitySurfaces(
  page: Page,
  request: APIRequestContext,
  paths: readonly string[],
): Promise<IdentitySurface[]> {
  const surfaces: IdentitySurface[] = [
    { name: "document title", text: await page.title() },
    { name: "head metadata", text: await page.locator("head").innerHTML() },
    {
      name: "JSON-LD",
      text: (
        await page
          .locator('script[type="application/ld+json"]')
          .allTextContents()
      ).join("\n"),
    },
    { name: "rendered page", text: await page.locator("body").innerText() },
  ];

  for (const path of paths) {
    const response = await request.get(path);
    if (response.status() !== 200) {
      throw new Error(`${path} should be served, got ${response.status()}`);
    }
    surfaces.push({ name: path, text: await response.text() });
  }

  return surfaces;
}
