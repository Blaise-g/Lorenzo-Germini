import type { APIRequestContext, Page } from "@playwright/test";

import { MARKDOWN_NEGOTIABLE } from "@/lib/markdown-negotiation";

/**
 * The places this site states who it is and where it lives.
 *
 * The hand-written ones drift, and the drift is the defect (#44 shipped a new
 * role label in the masthead alone and left five surfaces claiming the retired
 * one). The markdown siblings are the exception #117 added: they render the
 * fields, so they are audited here to prove the generator reads the field each
 * test names rather than to catch a stale hand edit. A guard is only as good as
 * its surface list, so the list lives here once rather than once per spec.
 */
export type IdentitySurface = { name: string; text: string };

/**
 * The markdown siblings (#117): `.md` URLs rendered from `RESUME_DATA`, one per
 * content surface `llms.txt` declares. `/index.md` joined in #119 — it is the
 * root's negotiation target, and the scan's failed check probes `/`, which is
 * the verified client ADR-0005 said the homepage sibling lacked.
 *
 * Derived rather than listed, because ADR-0005 holds the addressable set and the
 * negotiable set identical: a sibling reachable by header but absent from this
 * list would skip the identity audits every other surface answers to.
 */
export const MARKDOWN_SIBLINGS = Object.values(MARKDOWN_NEGOTIABLE);

/**
 * Every path that restates identity, hand-written or generated. `robots.txt`
 * and `sitemap.xml` carry absolute URLs, so they belong to any host audit even
 * though they say nothing about the role.
 */
export const IDENTITY_MANIFESTS = [
  "/llms.txt",
  "/llms-full.txt",
  ...MARKDOWN_SIBLINGS,
] as const;
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
