/* One person, one identifier, stated in the markup (#103).
 *
 * The site used to emit four Person-shaped nodes across three routes with no
 * `@id` between them, so nothing said they were the same entity. These are the
 * assertions that keep the consolidation asserted rather than inferred: the
 * shared `@id`, the absence of a second definition anywhere in the graph, and
 * no reference pointing at a node the site never defines.
 */

import { expect, test } from "@playwright/test";

import { RESUME_DATA } from "@/data/resume-data";
import { PERSON_ID, WEBSITE_ID } from "@/lib/person-structured-data";
import { CANONICAL_ORIGIN } from "@/lib/site-hosts";

import {
  definedIds,
  definesEntity,
  flattenNodes,
  personStructuredData,
  referencedIds,
  structuredDataDocuments,
  structuredDataNode,
} from "./support/structured-data";

/**
 * Every route that emits JSON-LD, mapped to how many times it should *define*
 * the Person rather than reference it. Exact counts, not an upper bound: `0`
 * pins `/writing` against re-inlining an author, and `1` catches a route that
 * drops its Person node altogether.
 */
const personDefinitionsPerRoute = { "/": 1, "/cv": 1, "/writing": 0 } as const;
const graphRoutes = Object.keys(
  personDefinitionsPerRoute,
) as (keyof typeof personDefinitionsPerRoute)[];

test.describe("the structured-data graph", () => {
  test("the Person carries the same @id on / and /cv", async ({ page }) => {
    await page.goto("/");
    const homepagePerson = await personStructuredData(page);

    await page.goto("/cv");
    const cvPerson = await personStructuredData(page);

    expect(homepagePerson["@id"]).toBe(PERSON_ID);
    expect(cvPerson["@id"]).toBe(PERSON_ID);

    /* The `url` differing is the point: two pages, two locations, one entity.
       An assertion that they match would pass on a graph that had collapsed
       the two surfaces into one. */
    expect(homepagePerson.url).not.toBe(cvPerson.url);
  });

  /* Against `CANONICAL_ORIGIN` rather than the `personalWebsiteUrl` the
     identifiers are built from: re-deriving from the same field could only
     catch a hardcoded literal, while this also catches the field drifting off
     the canonical host — the defect class #44 and #76 record. */
  test("the identifiers sit on the canonical origin", async () => {
    expect(new URL(PERSON_ID).origin).toBe(CANONICAL_ORIGIN);
    expect(new URL(WEBSITE_ID).origin).toBe(CANONICAL_ORIGIN);
    expect(new URL(PERSON_ID).hash).toBe("#person");
    expect(new URL(WEBSITE_ID).hash).toBe("#website");
  });

  test("WebSite is identified, localised and published by the Person", async ({
    page,
  }) => {
    await page.goto("/");
    const website = await structuredDataNode(page, "WebSite");

    expect(website, "the homepage should emit WebSite JSON-LD").toBeTruthy();
    expect(website).toMatchObject({
      "@id": WEBSITE_ID,
      inLanguage: "en",
      author: { "@id": PERSON_ID },
      publisher: { "@id": PERSON_ID },
    });
  });

  test("Blog names its author by reference rather than restating it", async ({
    page,
  }) => {
    await page.goto("/writing");
    const blog = await structuredDataNode(page, "Blog");

    expect(blog, "/writing should emit Blog JSON-LD").toBeTruthy();
    expect(blog?.author).toEqual({ "@id": PERSON_ID });
  });

  for (const route of graphRoutes) {
    const expected = personDefinitionsPerRoute[route];

    test(`${route} defines the Person ${expected} time(s), under the shared @id`, async ({
      page,
    }) => {
      await page.goto(route);
      const documents = await structuredDataDocuments(page);

      /* A future node that reintroduces `{"@type": "Person", name: ...}` lands
         here as an extra definition, whatever depth it hides at. */
      const definitions = flattenNodes(documents).filter(
        (node) => node["@type"] === "Person" && definesEntity(node),
      );

      expect(
        definitions.map((node) => node["@id"]),
        `${route} should define the Person exactly ${expected} time(s), each under the shared @id`,
      ).toEqual(Array.from({ length: expected }, () => PERSON_ID));
    });
  }

  /* The employer node an agent follows instead of searching for a company by
     name (#120). Exact equality rather than a partial match: the refusal is as
     much the point as the `url` is — #115 rules out a `contactPoint` or a
     `PostalAddress` here, because that is publishing an employer's contact
     details on a personal site, and only an exact shape fails when a fourth
     field appears. */
  for (const route of graphRoutes.filter(
    (route) => personDefinitionsPerRoute[route] > 0,
  )) {
    test(`${route} names the employer with a resolvable url and nothing else`, async ({
      page,
    }) => {
      await page.goto(route);
      const person = await personStructuredData(page);

      expect(person.worksFor).toEqual({
        "@type": "Organization",
        name: RESUME_DATA.work[0].company,
        url: RESUME_DATA.work[0].link,
      });

      /* `link` is empty on the work entries with no public site, so equality
         against the data alone would pass on `url: ""` — present, and not
         something an agent can follow. */
      expect(
        person.worksFor.url,
        "the employer url should be absolute",
      ).toMatch(/^https:\/\/\S+$/);
    });
  }

  test("no reference points at a node the site never defines", async ({
    page,
  }) => {
    const defined = new Set<string>();
    const referenced = new Map<string, string[]>();

    for (const route of graphRoutes) {
      await page.goto(route);
      const documents = await structuredDataDocuments(page);
      for (const id of definedIds(documents)) defined.add(id);
      for (const id of referencedIds(documents)) {
        referenced.set(id, [...(referenced.get(id) ?? []), route]);
      }
    }

    /* Guards the emptiness check below from passing on a graph that stopped
       using references altogether. */
    expect(
      [...referenced.keys()],
      "the graph should reference the Person by @id",
    ).toContain(PERSON_ID);

    const dangling = [...referenced].filter(([id]) => !defined.has(id));
    expect(
      Object.fromEntries(dangling),
      "every referenced @id should be defined by some route",
    ).toEqual({});
  });
});
