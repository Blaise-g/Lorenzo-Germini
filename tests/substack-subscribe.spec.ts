import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { contrast } from "./support/color";
import { removeDevOverlay } from "./support/dev-overlay";
import { setTheme, themes } from "./support/theme";
import { fixtureRoute } from "./support/writing-fixtures";

/* Issue #25 — the accessible Substack subscribe handoff. The oracle is the
   locked spec (§2.5 subscribe module, decisions 3 and 6) plus the issue's
   acceptance criteria: real label with native validation, locked error copy,
   a JS-less GET handoff with correct encoding, the one ≥44px filled control,
   stacking below `sm` with the Italian expansion budget, and never more than
   two Substack links per route. */

const SUBSTACK = "https://lorenzogermini.substack.com";

/* The module lives at the end of the /writing index and does not depend on the
   feed, so the live route is the default here. A fixture state is passed only
   where the count matters — the archive link's placement below the module. */
async function gotoWriting(page: Page, state?: string, query = "") {
  await page.goto(state ? fixtureRoute(state, query) : `/writing${query}`);
  await removeDevOverlay(page);
}

function emailInput(page: Page) {
  return page.getByLabel("Email address");
}

function submitButton(page: Page) {
  return page.getByRole("button", { name: "Continue on Substack →" });
}

/* Serve any Substack navigation locally so the handoff can be asserted
   without depending on the live publication. */
function stubSubstack(context: BrowserContext) {
  return context.route("**://lorenzogermini.substack.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "ok" }),
  );
}

test.describe("subscribe module semantics", () => {
  test("the form pairs a real label with native validation and stays enabled", async ({
    page,
  }) => {
    await gotoWriting(page);

    const input = emailInput(page);
    await expect(input).toHaveAttribute("type", "email");
    await expect(input).toHaveAttribute("required", "");
    await expect(input).toHaveAttribute("autocomplete", "email");
    await expect(input).toBeEnabled();
    await expect(input).toBeEditable();

    /* Progressive enhancement, hydrated half: once JS runs, `novalidate` is on
       so the locked copy replaces the browser bubbles. The server half — that
       the markup ships WITHOUT it, keeping the no-JS path natively validated —
       is asserted in "the GET handoff works without JavaScript" below. */
    const form = page.locator('form[action$="/subscribe"]');
    await expect(form).toHaveAttribute("method", "get");
    await expect(form).toHaveAttribute("novalidate", "");

    await input.focus();
    await expect(input).toBeFocused();
    await expect(submitButton(page)).toBeEnabled();
  });

  test("empty and invalid submissions surface the locked errors without a disabled or spinner state", async ({
    page,
  }) => {
    await gotoWriting(page);
    const form = page.locator('form[action$="/subscribe"]');
    await expect(form).toHaveAttribute("novalidate", "");

    const input = emailInput(page);
    const submit = submitButton(page);

    await submit.click();
    /* Scoped to the form: Next's route announcer is also role="alert". */
    const alert = form.getByRole("alert");
    await expect(alert).toHaveText("Enter an email address to continue.");
    await expect(input).toHaveAttribute("aria-invalid", "true");

    await input.fill("not-an-email");
    await submit.click();
    await expect(alert).toHaveText("That doesn’t look like an email address.");

    /* The errored control must stay the user's to fix: enabled, focusable,
       described by the alert, and no busy affordance anywhere. */
    await expect(input).toBeEnabled();
    await expect(submit).toBeEnabled();
    const describedBy = await input.getAttribute("aria-describedby");
    const alertId = await alert.getAttribute("id");
    expect(describedBy?.split(/\s+/)).toContain(alertId);
    await expect(page.locator("[aria-busy='true']")).toHaveCount(0);
  });

  test("the handoff opens Substack with plus and at-sign correctly encoded", async ({
    page,
  }) => {
    await stubSubstack(page.context());
    await gotoWriting(page);
    await expect(page.locator('form[action$="/subscribe"]')).toHaveAttribute(
      "novalidate",
      "",
    );

    await emailInput(page).fill("lorenzo+notes@example.com");
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      submitButton(page).click(),
    ]);

    expect(popup.url()).toBe(
      `${SUBSTACK}/subscribe?email=lorenzo%2Bnotes%40example.com`,
    );
  });

  test("the GET handoff works without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    await stubSubstack(context);
    const page = await context.newPage();
    await page.goto("/writing");

    /* The other half of the progressive-enhancement contract, and the half the
       hydrated assertions above cannot see: the SERVER markup must not carry
       `novalidate`, or the native validation below has nothing to do. Asserted
       directly so a change to how `hydrated` is derived cannot quietly ship a
       server-rendered `novalidate`. */
    await expect(
      page.locator('form[action$="/subscribe"]'),
    ).not.toHaveAttribute("novalidate", "");

    /* Native required validation must block an empty submit: no new page. */
    await submitButton(page).click();
    const blocked = await page
      .context()
      .waitForEvent("page", { timeout: 750 })
      .then(
        () => false,
        () => true,
      );
    expect(blocked, "empty submit must be blocked natively").toBe(true);

    await emailInput(page).fill("lorenzo+notes@example.com");
    const [handoff] = await Promise.all([
      context.waitForEvent("page"),
      submitButton(page).click(),
    ]);
    await handoff.waitForLoadState();
    expect(handoff.url()).toBe(
      `${SUBSTACK}/subscribe?email=lorenzo%2Bnotes%40example.com`,
    );

    await context.close();
  });
});

test.describe("the one filled control", () => {
  for (const theme of themes) {
    test(`${theme} mode: the submit is the only accent-filled control, ≥44px, AA`, async ({
      page,
    }) => {
      await setTheme(page, theme);
      await gotoWriting(page);

      const filled = await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.color = getComputedStyle(
          document.documentElement,
        ).getPropertyValue("--color-accent");
        document.body.append(probe);
        const accent = getComputedStyle(probe).color;
        probe.remove();

        return Array.from(document.querySelectorAll<HTMLElement>("*")).flatMap(
          (element) => {
            const style = getComputedStyle(element);
            if (
              element.getClientRects().length === 0 ||
              style.backgroundColor !== accent
            ) {
              return [];
            }
            return [
              {
                tag: element.tagName,
                text: element.textContent?.trim().slice(0, 40) ?? "",
                height: element.getBoundingClientRect().height,
                color: style.color,
                background: style.backgroundColor,
              },
            ];
          },
        );
      });

      expect(filled).toHaveLength(1);
      const [submit] = filled;
      expect(submit.tag).toBe("BUTTON");
      expect(submit.text).toBe("Continue on Substack →");
      expect(submit.height).toBeGreaterThanOrEqual(44);
      expect(contrast(submit.color, submit.background)).toBeGreaterThanOrEqual(
        4.5,
      );

      /* Decision 3's locked hover: the fill mixes toward ink (darkens in
         light, lightens in dark) while the label stays unchanged — never an
         opacity fade of the whole control. */
      const button = submitButton(page);
      await button.hover();
      const hovered = await button.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          color: style.color,
          background: style.backgroundColor,
          opacity: style.opacity,
        };
      });
      expect(hovered.color).toBe(submit.color);
      expect(hovered.background).not.toBe(submit.background);
      expect(hovered.opacity).toBe("1");
    });
  }
});

test.describe("geometry and the Italian expansion budget", () => {
  test("the row stacks below sm and keeps the field usable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoWriting(page);

    const inputBox = await emailInput(page).boundingBox();
    const buttonBox = await submitButton(page).boundingBox();
    if (!inputBox || !buttonBox)
      throw new Error("module controls not laid out");

    /* Stacked: the submit sits under the field. And the field must never
       shrink again to the 133px that truncated its own placeholder. */
    expect(buttonBox.y).toBeGreaterThanOrEqual(inputBox.y + inputBox.height);
    expect(inputBox.width).toBeGreaterThanOrEqual(250);
  });

  test("the row sits side by side from sm up", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    await gotoWriting(page);

    const inputBox = await emailInput(page).boundingBox();
    const buttonBox = await submitButton(page).boundingBox();
    if (!inputBox || !buttonBox)
      throw new Error("module controls not laid out");

    expect(buttonBox.x).toBeGreaterThanOrEqual(inputBox.x + inputBox.width);
    expect(buttonBox.y).toBeLessThan(inputBox.y + inputBox.height);
  });

  test("Italian copy stays inside the module's budget at 375", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoWriting(page, "1", "?lang=it");

    await expect(
      page.getByRole("heading", { name: "Ricevi gli appunti via email" }),
    ).toBeVisible();
    const submit = page.getByRole("button", { name: "Continua su Substack →" });
    const box = await submit.boundingBox();
    if (!box) throw new Error("IT submit not laid out");
    expect(box.height).toBeGreaterThanOrEqual(44);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("Substack link budget (decision 6, locked)", () => {
  const routes = [
    "/",
    "/cv",
    "/writing",
    /* The count that renders the most Substack surfaces at once: subscribe
       module, archive link, and six outbound essay links. */
    fixtureRoute("6"),
    "/route-that-does-not-exist",
  ];

  for (const route of routes) {
    test(`${route} carries at most two Substack links`, async ({ page }) => {
      await page.goto(route);
      await removeDevOverlay(page);

      /* Decision 6 names the three budgeted surfaces: the subscribe module
         (a form, not an anchor), the archive link, and the footer subscribe
         link. The essays' canonical links (`/p/<slug>`) scale with the index
         by construction, and the RSS link is a separate §2.5 semantics item
         — neither is in the budget. */
      const count = await page
        .locator(
          'a[href*="substack.com/subscribe"], a[href*="substack.com/archive"], form[action*="substack.com/subscribe"]',
        )
        .count();
      expect(count).toBeLessThanOrEqual(2);
    });
  }

  test("the footer subscribe link exists everywhere except /writing", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(
      footer.getByRole("link", { name: "Subscribe" }),
    ).toHaveAttribute("href", `${SUBSTACK}/subscribe`);

    await page.goto("/writing");
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "Subscribe" }),
    ).toHaveCount(0);
  });

  test("the footer carries the RSS feed link beside the agents line", async ({
    page,
  }) => {
    await page.goto("/writing");
    const footer = page.getByRole("contentinfo");
    await expect(
      footer.getByRole("link", { name: "RSS feed →" }),
    ).toHaveAttribute("href", `${SUBSTACK}/feed`);
    await expect(footer.getByRole("link", { name: "/llms.txt" })).toBeVisible();
  });

  test("the archive link renders below the subscribe module, only at 4+ posts", async ({
    page,
  }) => {
    await gotoWriting(page, "6");

    const archive = page.getByRole("link", {
      name: "Read all posts on Substack →",
    });
    await expect(archive).toBeVisible();

    const moduleBox = await page
      .getByRole("heading", { name: "Get the field notes by email" })
      .boundingBox();
    const archiveBox = await archive.boundingBox();
    if (!moduleBox || !archiveBox) throw new Error("surfaces not laid out");
    expect(archiveBox.y).toBeGreaterThan(moduleBox.y);

    await gotoWriting(page, "1");
    await expect(
      page.getByRole("link", { name: "Read all posts on Substack →" }),
    ).toHaveCount(0);
  });
});
