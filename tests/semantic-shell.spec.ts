import { expect, test } from "@playwright/test";

const routesUsingTheSharedShell = [
  "/",
  "/?variant=a",
  "/?variant=b",
  "/?variant=b1",
  "/?variant=b2",
  "/?variant=b3",
  "/?variant=c",
  "/?variant=d",
  "/?variant=b1a",
  "/cv",
  "/writing",
  "/route-that-does-not-exist",
];

test.describe("route-shared semantic shell", () => {
  for (const route of routesUsingTheSharedShell) {
    test(`${route} exposes working skip navigation and one main landmark`, async ({
      page,
    }) => {
      await page.goto(route);
      await page
        .locator("nextjs-portal")
        .evaluateAll((portals) => portals.forEach((portal) => portal.remove()));

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
    await expect(footer.getByRole("link", { name: "Phone" })).toHaveAttribute(
      "href",
      "tel:+393279220232",
    );

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
    await expect(footer.locator('a[href*="feed"]')).toHaveCount(0);
    await expect(footer.locator('a[href*="subscribe"]')).toHaveCount(0);
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
});
