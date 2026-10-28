/* `/path` before any 3D (#147): its HTML overlay — the step list with the piece
   and seen ticks, the step's text panel, and the permanent "Flat site" link.
   The contract is #141 — decisions 6, 7 and 13, implementation decisions 4
   and 6 — with storyboard §7.4 and §7.7 of docs/research/experience-rethink.md
   and ADR-0002 (its own shell, one `contentinfo`). `/path` is deliberately not
   in `routesUsingTheSharedShell`, so its landmarks are asserted here. */

import { expect, test, type Page } from "@playwright/test";

import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";
import { ENTERED_STORAGE_KEY, SEEN_STORAGE_KEY } from "@/lib/path-state";

const stepList = (page: Page) =>
  page.getByRole("navigation", { name: "The path" });
const stepLink = (page: Page, slug: PathStepSlug) =>
  page.locator(`[data-path-step-link="${slug}"]`);
const piece = (page: Page) => page.locator("[data-path-piece]");
const panel = (page: Page) => page.locator("[data-path-text-panel]");
const flatSiteLink = (page: Page) =>
  page.getByRole("link", { name: "Flat site", exact: true });

const stepNamed = (slug: PathStepSlug) =>
  PATH_STEPS.find((step) => step.slug === slug)!;

/** The piece mounts on hydration, so waiting for it waits for the handlers. */
async function hydrated(page: Page) {
  await expect(piece(page)).toHaveCount(1);
}

/** Selected means all of it: the link is current, the piece is on the step,
 *  the panel shows that step's place, roles and results and no other step's,
 *  and "Flat site" carries it back to `/`. */
async function expectSelected(page: Page, slug: PathStepSlug) {
  const step = stepNamed(slug);
  await expect(stepLink(page, slug)).toHaveAttribute(
    "aria-current",
    "location",
  );
  await expect(stepList(page).locator("[aria-current]")).toHaveCount(1);
  await expect(piece(page)).toHaveAttribute("data-path-piece", slug);

  const shown = panel(page).locator("[data-path-panel]:visible");
  await expect(shown).toHaveCount(1);
  await expect(shown).toHaveAttribute("data-path-panel", slug);
  await expect(shown.getByRole("heading", { level: 3 })).toContainText(
    step.place,
  );
  for (const line of step.lines) await expect(shown).toContainText(line);
  for (const role of step.roles) {
    await expect(shown).toContainText(`${role.start} – ${role.end}`);
  }

  await expect(flatSiteLink(page)).toHaveAttribute("href", `/#${slug}`);
}

async function seenSlugs(page: Page) {
  return page
    .locator("[data-path-seen] [data-path-step-link]")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("data-path-step-link")),
    );
}

test("the overlay is server HTML: the step list, the text panel and Flat site", async ({
  request,
}) => {
  const html = await (await request.get("/path")).text();
  for (const step of PATH_STEPS) {
    expect(html, `${step.slug}'s link`).toContain(
      `data-path-step-link="${step.slug}"`,
    );
  }
  /* With no fragment the panel shows now, as `/` selects it. */
  expect(html).toMatch(/data-path-panel="now"(?! hidden)/);
  expect(html).toMatch(/<a href="\/#now"[^>]*>Flat site<\/a>/);
});

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  /* `/path` is the JavaScript route: without it the overlay paints at the
     default step and the step links only change the fragment. `/` is the
     route that works without it (GH-141's JavaScript-off test is for `/`). */
  test("the overlay still paints, with now's text and the way back", async ({
    page,
  }) => {
    await page.goto("/path");
    await expect(stepList(page).getByRole("link")).toHaveCount(
      PATH_STEPS.length,
    );
    await expect(panel(page)).toContainText(stepNamed("now").lines[0]);
    await expect(flatSiteLink(page)).toBeVisible();
    /* Every step's text is in the page, hidden or not, so selecting one
       fetches nothing (GH-141, decision 7). */
    for (const step of PATH_STEPS) {
      await expect(
        page.locator(`[data-path-panel="${step.slug}"]`),
      ).toContainText(step.lines[0]);
    }
  });
});

test("its own shell: one main, one contentinfo outside it", async ({
  page,
}) => {
  await page.goto("/path");

  const main = page.getByRole("main");
  await expect(main).toHaveCount(1);
  await expect(main).toHaveAttribute("id", "main-content");
  await expect(page.getByRole("contentinfo")).toHaveCount(1);
  expect(await page.locator("main footer").count()).toBe(0);
  await expect(stepList(page)).toHaveCount(1);

  /* The skip link the root layout renders lands somewhere real. */
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(main).toBeFocused();
});

/* ADR-0002: a shell's footer rule ends where its content ends. `/path` stays
   out of `semantic-shell.spec.ts`'s route lists, so its case is here. */
test("the footer rule spans the overlay's inset", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/path");

  const edges = await page.evaluate(() => {
    const overlay = document.querySelector("[data-path-overlay]")!;
    const style = getComputedStyle(overlay);
    const box = overlay.getBoundingClientRect();
    const rule = document
      .querySelector("body > footer")!
      .firstElementChild!.getBoundingClientRect();
    return {
      content: {
        left: box.left + Number.parseFloat(style.paddingLeft),
        right: box.right - Number.parseFloat(style.paddingRight),
      },
      rule: { left: rule.left, right: rule.right },
    };
  });

  expect(Math.abs(edges.rule.left - edges.content.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(edges.rule.right - edges.content.right)).toBeLessThanOrEqual(
    1,
  );
});

test("Flat site is in the first screen and goes back to the same step", async ({
  page,
}) => {
  await page.goto("/path");
  await hydrated(page);
  await expect(flatSiteLink(page)).toBeInViewport();
  await expect(flatSiteLink(page)).toHaveAttribute("href", "/#now");

  await stepLink(page, "lille").click();
  await expectSelected(page, "lille");

  await flatSiteLink(page).click();
  await expect(page).toHaveURL(/\/#lille$/);
  await expect(
    page.locator('[data-path-step-link="lille"][aria-current="location"]'),
  ).toHaveCount(1);
});

test("every step can be selected in any order by click, Enter and Space", async ({
  page,
}) => {
  await page.goto("/path");
  await hydrated(page);

  /* Out of time order, each input used more than once. */
  const order: [PathStepSlug, "click" | "Enter" | "Space"][] = [
    ["lille", "click"],
    ["home", "Enter"],
    ["next", "Space"],
    ["switzerland", "click"],
    ["now", "Space"],
    ["cuneo-2022", "Enter"],
    ["turin", "click"],
  ];
  expect(new Set(order.map(([slug]) => slug)).size).toBe(PATH_STEPS.length);

  for (const [slug, how] of order) {
    const link = stepLink(page, slug);
    if (how === "click") {
      await link.click();
    } else {
      await link.focus();
      await page.keyboard.press(how);
    }
    await expect(page, `${slug} by ${how}`).toHaveURL(
      new RegExp(`/path#${slug}$`),
    );
    await expectSelected(page, slug);
    /* Focus stays on the step that was selected (storyboard §7.7). */
    await expect(link).toBeFocused();
  }
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 375, height: 812 } });

  test("a tap selects a step", async ({ page }) => {
    await page.goto("/path");
    await hydrated(page);

    await stepLink(page, "switzerland").tap();

    await expect(page).toHaveURL(/\/path#switzerland$/);
    await expectSelected(page, "switzerland");
  });
});

test("a load of /path#lille selects Lille, and a reload keeps it", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/path#lille");
  await hydrated(page);
  await expectSelected(page, "lille");

  await page.reload();
  await hydrated(page);
  await expectSelected(page, "lille");
  expect(errors).toEqual([]);
});

test("Back and Forward move between the selected steps, without a reload", async ({
  page,
}) => {
  await page.goto("/path");
  await hydrated(page);
  await page.evaluate(() => {
    (window as unknown as { pathMarker: boolean }).pathMarker = true;
  });

  for (const slug of ["lille", "turin", "next"] as const) {
    await stepLink(page, slug).click();
    await expectSelected(page, slug);
  }

  await page.goBack();
  await expect(page).toHaveURL(/\/path#turin$/);
  await expectSelected(page, "turin");

  await page.goBack();
  await expect(page).toHaveURL(/\/path#lille$/);
  await expectSelected(page, "lille");

  await page.goForward();
  await expect(page).toHaveURL(/\/path#turin$/);
  await expectSelected(page, "turin");

  /* Back past the first selection is the bare `/path`: the default step. */
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/\/path$/);
  await expectSelected(page, "now");

  expect(
    await page.evaluate(
      () => (window as unknown as { pathMarker?: boolean }).pathMarker,
    ),
  ).toBe(true);
});

test("seen ticks are shared with /, both ways", async ({ page }) => {
  await page.goto("/path");
  await hydrated(page);
  await stepLink(page, "lille").click();
  await expectSelected(page, "lille");

  await page.goto("/");
  await hydrated(page);
  await expect.poll(() => seenSlugs(page)).toEqual(["lille"]);

  await stepLink(page, "turin").click();
  await expect(page).toHaveURL(/\/#turin$/);

  await page.goto("/path");
  await hydrated(page);
  await expect.poll(() => seenSlugs(page)).toEqual(["turin", "lille"]);
  expect(
    JSON.parse(
      (await page.evaluate(
        (key) => localStorage.getItem(key),
        SEEN_STORAGE_KEY,
      ))!,
    ),
  ).toEqual(expect.arrayContaining(["lille", "turin"]));
});

test("visiting /path sets the entered flag, and visiting / does not", async ({
  page,
}) => {
  const entered = () =>
    page.evaluate((key) => localStorage.getItem(key), ENTERED_STORAGE_KEY);

  await page.goto("/");
  await hydrated(page);
  expect(await entered()).toBeNull();

  await page.goto("/path");
  await expect.poll(entered).toBe("1");
});

test("/path is absent from the sitemap", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<urlset");
  expect(sitemap).not.toMatch(/\/path</);
});
