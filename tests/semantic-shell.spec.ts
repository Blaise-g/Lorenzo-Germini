import { expect, test } from "@playwright/test";

import { removeDevOverlay } from "./support/dev-overlay";
import { routesUsingTheSharedShell } from "./support/routes";

test.describe("route-shared semantic shell", () => {
  for (const route of routesUsingTheSharedShell) {
    test(`${route} exposes working skip navigation and one main landmark`, async ({
      page,
    }) => {
      await page.goto(route);
      await removeDevOverlay(page);

      const main = page.getByRole("main");
      await expect(main).toHaveCount(1);
      await expect(main).toHaveAttribute("id", "main-content");
      await expect(
        page.getByRole("link", { name: "Skip to content" }),
      ).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);

      await page.keyboard.press("Tab");
      const skipLink = page.getByRole("link", { name: "Skip to content" });
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toHaveAttribute("href", "#main-content");

      await page.keyboard.press("Enter");
      await expect(main).toBeFocused();
    });
  }

  test("the footer exposes every destination that currently exists", async ({
    page,
  }) => {
    await page.goto("/");

    const footer = page.getByRole("contentinfo");
    await expect(footer).toHaveCount(1);
    await expect(footer.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      "mailto:lorenzo.germini@icloud.com",
    );
    /* No Phone link: the number came out of every surface in #85, and the render
       site is conditional on `contact.tel` so an absent one drops the link
       rather than rendering an empty `tel:`. */
    await expect(footer.getByRole("link", { name: "Phone" })).toHaveCount(0);
    await expect(footer.locator('a[href^="tel:"]')).toHaveCount(0);

    const socialDestinations = {
      GitHub: "https://github.com/Blaise-g",
      LinkedIn: "https://www.linkedin.com/in/lorenzogermini/",
      X: "https://twitter.com/spleenboi_",
    };
    for (const [name, href] of Object.entries(socialDestinations)) {
      await expect(
        footer.getByRole("link", { name, exact: true }),
      ).toHaveAttribute("href", href);
    }

    await expect(
      footer.getByRole("link", { name: "/llms.txt" }),
    ).toHaveAttribute("href", "/llms.txt");
    await expect(footer.getByRole("link", { name: "CV" })).toHaveAttribute(
      "href",
      "/cv",
    );
    /* Phase 2 footer links, live since the publication URL was confirmed
       (#24 owner-input gate): destinations exist, so the links render. */
    await expect(footer.locator('a[href*="feed"]')).toHaveAttribute(
      "href",
      "https://lorenzogermini.substack.com/feed",
    );
    await expect(footer.locator('a[href*="subscribe"]')).toHaveAttribute(
      "href",
      "https://lorenzogermini.substack.com/subscribe",
    );
  });

  for (const route of ["/cv", "/writing", "/route-that-does-not-exist"]) {
    test(`${route} keeps the homepage as the CV hub`, async ({ page }) => {
      await page.goto(route);

      await expect(
        page.getByRole("contentinfo").locator('a[href="/cv"]'),
      ).toHaveCount(0);
    });
  }

  test("the shell keeps DOM, visual, and print order aligned", async ({
    page,
  }) => {
    await page.goto("/");
    await page.emulateMedia({ media: "print" });

    const shellState = await page.evaluate(() => {
      const skipLink = document.querySelector<HTMLAnchorElement>(
        'body > a[href="#main-content"]',
      );
      const main = document.querySelector<HTMLElement>("body > main");
      const footer = document.querySelector<HTMLElement>("body > footer");

      if (!skipLink || !main || !footer) return null;

      return {
        skipDisplay: getComputedStyle(skipLink).display,
        mainDisplay: getComputedStyle(main).display,
        footerDisplay: getComputedStyle(footer).display,
        mainOrder: getComputedStyle(main).order,
        footerOrder: getComputedStyle(footer).order,
        mainBeforeFooter: Boolean(
          main.compareDocumentPosition(footer) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      };
    });

    expect(shellState).toEqual({
      skipDisplay: "none",
      mainDisplay: "block",
      footerDisplay: "block",
      mainOrder: "0",
      footerOrder: "0",
      mainBeforeFooter: true,
    });
  });

  test("the not-found shell hands back three destinations, on a real 404", async ({
    page,
  }) => {
    /* #121: the status code was already right, and a correct 404 with no way
       forward is still a dead end for the agent that followed a stale link. The
       status is asserted here too, because the recoverable body is only worth
       anything if it did not arrive as a 200. */
    const response = await page.goto("/route-that-does-not-exist");
    expect(response?.status()).toBe(404);

    const destinations = {
      "Back to resume": "/",
      "/llms.txt": "/llms.txt",
      "/sitemap.xml": "/sitemap.xml",
    };
    for (const [name, href] of Object.entries(destinations)) {
      const link = page.getByRole("main").getByRole("link", { name });
      await expect(link).toHaveAttribute("href", href);

      /* Naming a destination the site does not serve would be a worse dead end
         than the one it replaces, so each one is fetched. */
      const target = await page.request.get(href);
      expect(target.status(), `${href} must resolve to real content`).toBe(200);
      expect(await target.text()).not.toBe("");
    }
  });
});

/* The footer used `container mx-auto px-4 pr-16 md:px-16` with an inner
   `max-w-3xl` — geometry that appeared in none of the three shells. Measured at
   1024 the last rule on every page missed the content above it: 16px inside on
   `/cv`, a 40px overhang both sides on `/writing`, and a third distinct left
   edge on `/`. Each shell now hands the footer its own inset (`RouteFrame`),
   which is why the footer takes a prop rather than reading the pathname — that
   is runtime data on a route with dynamic segments, and hoisting it out of the
   footer's existing `<Suspense>` boundary would block the route under Cache
   Components. */
test.describe("the footer aligns to its host route", () => {
  /* The element whose padding box defines each route's content column. */
  const contentBox = {
    "/": '[data-testid="body-inset"]',
    "/cv": "[data-cv-document]",
    "/writing": "main h1",
  } as const;

  for (const [route, selector] of Object.entries(contentBox)) {
    test(`${route} ends the footer rule where its content ends`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1024, height: 900 });
      await page.goto(route);

      const edges = await page.evaluate((contentSelector) => {
        const inner = (element: Element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left + Number.parseFloat(style.paddingLeft),
            right: rect.right - Number.parseFloat(style.paddingRight),
          };
        };

        /* The footer's rule is the inner div's top border, so its box is what
           has to line up — not the `<footer>`'s own padding box. */
        const rule = document
          .querySelector("body > footer")!
          .firstElementChild!.getBoundingClientRect();

        return {
          content: inner(document.querySelector(contentSelector)!),
          rule: { left: rule.left, right: rule.right },
        };
      }, selector);

      /* `/writing`'s `<h1>` sits in a narrower 34rem box by design, so the
         comparison there is against its measure's left edge, which the h1 shares.
         Both other routes compare the full column. */
      expect(
        Math.abs(edges.rule.left - edges.content.left),
      ).toBeLessThanOrEqual(1);
      if (route !== "/writing") {
        expect(
          Math.abs(edges.rule.right - edges.content.right),
        ).toBeLessThanOrEqual(1);
      }
    });
  }

  test("every route still exposes exactly one contentinfo", async ({
    page,
  }) => {
    /* `RouteFrame` moved `<main>` and the footer out of the root layout into the
       shells, so a shell that forgets one — or a route that renders two — is a
       real failure mode now. The 404 has no shell of its own and takes the
       default inset. */
    for (const route of [
      "/",
      "/cv",
      "/writing",
      "/route-that-does-not-exist",
    ]) {
      await page.goto(route);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      /* Nested inside `main`, `contentinfo` is not exposed as a landmark. */
      expect(
        await page.locator("main footer").count(),
        `${route} must not nest the footer inside main`,
      ).toBe(0);
    }
  });
});
