import type { Page } from "@playwright/test";

import type { buildPersonStructuredData } from "@/lib/person-structured-data";

export type JsonLdNode = Record<string, unknown>;

/** What the shipped Person node looks like, so callers get real field types. */
type PersonNode = ReturnType<typeof buildPersonStructuredData>;

/** Every top-level JSON-LD document a route emits, in document order. */
export async function structuredDataDocuments(page: Page) {
  return page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.map(
        (script) => JSON.parse(script.textContent ?? "{}") as JsonLdNode,
      ),
    );
}

/** The top-level document a route emits for one `@type`, if it emits one. */
export async function structuredDataNode(page: Page, type: string) {
  const documents = await structuredDataDocuments(page);
  return documents.find((data) => data["@type"] === type);
}

/* The homepage wraps the Person in a ProfilePage; /cv emits it bare. Both are
   the same identity surface, so a test asserting on the identity should not
   have to know which shape the route it is on happens to use. */
export async function personStructuredData(page: Page): Promise<PersonNode> {
  const documents = await structuredDataDocuments(page);
  const profilePage = documents.find((data) => data["@type"] === "ProfilePage");
  const person =
    profilePage?.mainEntity ??
    documents.find((data) => data["@type"] === "Person");
  if (!person) throw new Error("the route emitted no Person JSON-LD");
  return person as PersonNode;
}

/**
 * Flattens a route's JSON-LD into every embedded object, however deeply nested.
 *
 * The identity assertions in #103 are about the whole graph rather than the
 * top-level nodes — a re-inlined `author` hides one level down — so they need
 * the flattened view rather than the documents.
 */
export function flattenNodes(value: unknown): JsonLdNode[] {
  if (Array.isArray(value)) return value.flatMap(flattenNodes);
  if (value === null || typeof value !== "object") return [];
  const node = value as JsonLdNode;
  return [node, ...Object.values(node).flatMap(flattenNodes)];
}

/** The JSON-LD keys that identify a node without saying anything about it. */
const IDENTITY_ONLY_KEYS = new Set(["@id", "@type", "@context"]);

/**
 * True when a node asserts facts rather than merely pointing at another node.
 *
 * This is the line the structural assertion draws: a bare `{"@id": ...}` is a
 * reference to the one Person entity, while anything carrying a `name` is a
 * second definition of it — which is the duplication #103 removed.
 */
export function definesEntity(node: JsonLdNode) {
  return Object.keys(node).some((key) => !IDENTITY_ONLY_KEYS.has(key));
}

/** Every `@id` a route's graph asserts a definition for. */
export function definedIds(documents: JsonLdNode[]) {
  return flattenNodes(documents)
    .filter((node) => definesEntity(node) && typeof node["@id"] === "string")
    .map((node) => node["@id"] as string);
}

/** Every `@id` a route's graph points at without defining it. */
export function referencedIds(documents: JsonLdNode[]) {
  return flattenNodes(documents)
    .filter((node) => !definesEntity(node) && typeof node["@id"] === "string")
    .map((node) => node["@id"] as string);
}
