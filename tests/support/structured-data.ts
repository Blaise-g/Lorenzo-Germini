import type { Page } from "@playwright/test";

/* The homepage wraps the Person in a ProfilePage; /cv emits it bare. Both are
   the same identity surface, so a test asserting on the identity should not
   have to know which shape the route it is on happens to use. */
export async function personStructuredData(page: Page) {
  return page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) => {
      const documents = scripts.map((script) =>
        JSON.parse(script.textContent ?? "{}"),
      );
      const profilePage = documents.find(
        (data) => data["@type"] === "ProfilePage",
      );
      return (
        profilePage?.mainEntity ??
        documents.find((data) => data["@type"] === "Person")
      );
    });
}
