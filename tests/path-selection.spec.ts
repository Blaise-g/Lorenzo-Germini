/* Selecting a step on the flat site (#145): the piece, the step panel, the
   fragments and the seen ticks. The contract is #141 — decisions 5, 7 and 13,
   and implementation decision 4 — with storyboard §7.3 and §7.7 of
   docs/research/experience-rethink.md: under 600 ms and a cut under reduced
   motion, ticks in local storage that can be cleared, Tab in path order, and
   arrows only on the path and never with a modifier. The step panel is the
   step's own section, the one #144 renders (answered on #145). */

import { expect, test, type Page } from "@playwright/test";

import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";
import { SEEN_STORAGE_KEY } from "@/lib/path-state";

const path = (page: Page) => page.getByRole("navigation", { name: "The path" });
const stepLink = (page: Page, slug: PathStepSlug) =>
  page.locator(`[data-path-step-link="${slug}"]`);
const piece = (page: Page) => page.locator("[data-path-piece]");

/** The piece only exists once the leaf has hydrated, so waiting for it is
 *  waiting for the key handlers too. */
async function hydrated(page: Page) {
  await expect(piece(page)).toHaveCount(1);
}

/** Selected means all of it at once: the link is current, the piece is on the
 *  step, and its section — the step panel — is marked and on screen with its
 *  text. */
async function expectSelected(page: Page, slug: PathStepSlug) {
  const step = PATH_STEPS.find((candidate) => candidate.slug === slug)!;
  await expect(stepLink(page, slug)).toHaveAttribute(
    "aria-current",
    "location",
  );
  await expect(path(page).locator("[aria-current]")).toHaveCount(1);
  await expect(piece(page)).toHaveAttribute("data-path-piece", slug);
  await expect(page.locator("[data-path-selected]")).toHaveCount(1);
  const section = page.locator(`section#${slug}`);
  await expect(section).toHaveAttribute("data-path-selected", "");
  await expect(section).toBeInViewport();
  await expect(section).toContainText(step.lines[0]);
}

async function seenSlugs(page: Page) {
  return page
    .locator("[data-path-seen] [data-path-step-link]")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("data-path-step-link")),
    );
}

test("every step can be selected in any order by click, Enter and Space", async ({
  page,
}) => {
  await page.goto("/");
  await hydrated(page);

  /* Out of time order on purpose, and each way of selecting used more than
     once, so neither "next along the path" nor one input path can pass it. */
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
    await expect(page, `${slug} by ${how}`).toHaveURL(new RegExp(`/#${slug}$`));
    await expectSelected(page, slug);
  }
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 375, height: 812 } });

  test("a tap selects a step", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);

    await stepLink(page, "switzerland").tap();

    await expect(page).toHaveURL(/\/#switzerland$/);
    await expectSelected(page, "switzerland");
  });
});

test("with no fragment, now is selected but not seen", async ({ page }) => {
  await page.goto("/");
  await hydrated(page);

  await expect(stepLink(page, "now")).toHaveAttribute(
    "aria-current",
    "location",
  );
  await expect(piece(page)).toHaveAttribute("data-path-piece", "now");
  await expect(page.locator("section#now")).toHaveAttribute(
    "data-path-selected",
    "",
  );
  expect(await seenSlugs(page)).toEqual([]);
  await expect(page.getByRole("button", { name: "Clear seen" })).toHaveCount(0);
});

test("a load of /#lille selects Lille, without a hydration error", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/#lille");
  await hydrated(page);

  await expectSelected(page, "lille");
  expect(await seenSlugs(page)).toEqual(["lille"]);
  expect(errors).toEqual([]);
});

test("Back and Forward move between the selected steps, without a reload", async ({
  page,
}) => {
  await page.goto("/");
  await hydrated(page);
  await page.evaluate(() => {
    (window as unknown as { pathMarker: boolean }).pathMarker = true;
  });

  for (const slug of ["lille", "turin", "next"] as const) {
    await stepLink(page, slug).click();
    await expectSelected(page, slug);
  }

  await page.goBack();
  await expect(page).toHaveURL(/\/#turin$/);
  await expectSelected(page, "turin");

  await page.goBack();
  await expect(page).toHaveURL(/\/#lille$/);
  await expectSelected(page, "lille");

  await page.goForward();
  await expect(page).toHaveURL(/\/#turin$/);
  await expectSelected(page, "turin");

  expect(
    await page.evaluate(
      () => (window as unknown as { pathMarker?: boolean }).pathMarker,
    ),
  ).toBe(true);
});

test("seen ticks persist across reloads and can be cleared", async ({
  page,
}) => {
  await page.goto("/");
  await hydrated(page);
  await stepLink(page, "lille").click();
  await stepLink(page, "turin").click();
  await expectSelected(page, "turin");

  /* Without the fragment, so the ticks can only have come from storage. */
  await page.goto("/");
  await hydrated(page);
  await expect.poll(() => seenSlugs(page)).toEqual(["turin", "lille"]);
  await expect(stepLink(page, "lille")).toContainText("seen");
  /* The key `/path` shares (implementation decision 4). */
  expect(
    JSON.parse(
      (await page.evaluate(
        (key) => localStorage.getItem(key),
        SEEN_STORAGE_KEY,
      ))!,
    ),
  ).toEqual(expect.arrayContaining(["lille", "turin"]));

  await page.reload();
  await hydrated(page);
  await expect.poll(() => seenSlugs(page)).toEqual(["turin", "lille"]);

  await page.getByRole("button", { name: "Clear seen" }).click();
  await expect.poll(() => seenSlugs(page)).toEqual([]);
  await expect(page.getByRole("button", { name: "Clear seen" })).toHaveCount(0);

  await page.reload();
  await hydrated(page);
  expect(await seenSlugs(page)).toEqual([]);
});

test("unreadable seen storage reads as nothing seen", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "{not json");
  }, SEEN_STORAGE_KEY);
  await page.goto("/");
  await hydrated(page);

  expect(await seenSlugs(page)).toEqual([]);
  await stepLink(page, "lille").click();
  await expect.poll(() => seenSlugs(page)).toEqual(["lille"]);
});

/** The centre of the piece and of the step's node in the drawn SVG. */
async function pieceAndNodeCentres(page: Page, slug: PathStepSlug) {
  const index = PATH_STEPS.findIndex((step) => step.slug === slug);
  const node = path(page)
    .locator("svg")
    .first()
    .locator("rect, circle")
    .nth(index);
  const [pieceBox, nodeBox] = await Promise.all([
    piece(page).boundingBox(),
    node.boundingBox(),
  ]);
  const centre = (box: NonNullable<typeof pieceBox>) => ({
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  });
  return { piece: centre(pieceBox!), node: centre(nodeBox!) };
}

async function pieceTransitions(page: Page) {
  return piece(page).evaluate((element) =>
    element.getAnimations().map((animation) => ({
      property: (animation as CSSTransition).transitionProperty,
      duration: Number(animation.effect?.getTiming().duration),
    })),
  );
}

test.describe("with motion allowed", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("the piece travels along the path in under 600ms and lands on the step", async ({
    page,
  }) => {
    await page.goto("/");
    await hydrated(page);
    /* No travel on arrival: the piece mounts on its step. */
    expect(await pieceTransitions(page)).toEqual([]);

    await stepLink(page, "home").click();
    await expect(piece(page)).toHaveAttribute("data-path-piece", "home");
    const transitions = await pieceTransitions(page);
    expect(transitions).toHaveLength(1);
    expect(transitions[0].property).toBe("offset-distance");
    expect(transitions[0].duration).toBeGreaterThan(0);
    expect(transitions[0].duration).toBeLessThan(600);

    await expect.poll(() => pieceTransitions(page)).toEqual([]);
    const { piece: at, node } = await pieceAndNodeCentres(page, "home");
    expect(Math.abs(at.x - node.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(at.y - node.y)).toBeLessThanOrEqual(1);
  });
});

test("under reduced motion the piece cuts, and the page jumps rather than glides", async ({
  page,
}) => {
  await page.goto("/");
  await hydrated(page);

  for (const slug of ["turin", "next"] as const) {
    await stepLink(page, slug).click();
    await expect(piece(page)).toHaveAttribute("data-path-piece", slug);
    expect(await pieceTransitions(page), slug).toEqual([]);
    const { piece: at, node } = await pieceAndNodeCentres(page, slug);
    expect(Math.abs(at.x - node.x), slug).toBeLessThanOrEqual(1);
    expect(Math.abs(at.y - node.y), slug).toBeLessThanOrEqual(1);
  }
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
});

test("Tab walks the steps in path order", async ({ page }) => {
  await page.goto("/");
  await hydrated(page);

  await stepLink(page, PATH_STEPS[0].slug).focus();
  for (const step of PATH_STEPS.slice(1)) {
    await page.keyboard.press("Tab");
    await expect(stepLink(page, step.slug)).toBeFocused();
  }
});

test.describe("arrow keys", () => {
  test("move between steps with focus on the path", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);

    await stepLink(page, "lille").focus();
    await page.keyboard.press("ArrowDown");
    await expect(stepLink(page, "now")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(stepLink(page, "next")).toBeFocused();
    /* The end of the path is the end: no wrap back to home. */
    await page.keyboard.press("ArrowDown");
    await expect(stepLink(page, "next")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowLeft");
    await expect(stepLink(page, "lille")).toBeFocused();

    /* Focus moves; the selection and history do not. */
    await expect(page).toHaveURL(/\/$/);
    await expect(stepLink(page, "now")).toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  test("do nothing with a modifier held", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);

    for (const modifier of ["Shift", "Alt", "Control", "Meta"]) {
      await stepLink(page, "lille").focus();
      await page.keyboard.press(`${modifier}+ArrowDown`);
      await expect(stepLink(page, "lille"), modifier).toBeFocused();
    }
  });

  test("do nothing with focus off the path", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);

    const email = page
      .getByTestId("flat-site-intro")
      .getByRole("link", { name: "Email" });
    await email.focus();
    await page.keyboard.press("ArrowDown");
    await expect(email).toBeFocused();
    await expect(path(page).locator("[data-path-step-link]:focus")).toHaveCount(
      0,
    );
  });
});

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("the path is #144's: no piece, no selection, no ticks", async ({
    page,
  }) => {
    await page.goto("/#lille");

    await expect(page.locator("section#lille")).toBeInViewport();
    await expect(piece(page)).toHaveCount(0);
    await expect(path(page).locator("[aria-current]")).toHaveCount(0);
    await expect(page.locator("[data-path-selected]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Clear seen" })).toHaveCount(
      0,
    );
  });
});
