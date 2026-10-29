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
  expect(html).toMatch(/<div data-path-overlay="true" data-path-shown="now"/);
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

/* The server cannot see the fragment, so the inline first-paint script puts
   the step on the overlay before any app JavaScript runs: with every chunk
   blocked, nothing else could have. */
test.describe("before hydration", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/\/_next\/static\/chunks\/.+\.js(\?.*)?$/, (route) =>
      route.abort(),
    );
  });

  test("a load of /path#lille paints Lille's panel and Flat site to /#lille", async ({
    page,
  }) => {
    const response = await page.goto("/path#lille");
    const html = await response!.text();
    expect(html).toContain('data-path-shown="now"');
    expect(html).toMatch(/<script>\(function\(\)\{[^<]*data-path-shown/);

    /* Not hydrated: the piece is the client leaf's. */
    await expect(piece(page)).toHaveCount(0);
    await expect(page.locator("[data-path-overlay]")).toHaveAttribute(
      "data-path-shown",
      "lille",
    );
    const shown = panel(page).locator("[data-path-panel]:visible");
    await expect(shown).toHaveCount(1);
    await expect(shown).toHaveAttribute("data-path-panel", "lille");
    await expect(shown).toContainText(stepNamed("lille").lines[0]);
    await expect(flatSiteLink(page)).toHaveAttribute("href", "/#lille");
    /* `display: none`, so the hidden panels are out of the tree too. */
    await expect(
      page.getByRole("heading", { level: 3, name: /^Cuneo/ }),
    ).toHaveCount(0);
  });

  for (const fragment of ["#quadrell", "#%", "#LILLE"]) {
    test(`a load of /path${fragment} paints the default step`, async ({
      page,
    }) => {
      await page.goto(`/path${fragment}`);
      await expect(piece(page)).toHaveCount(0);
      await expect(
        panel(page).locator("[data-path-panel]:visible"),
      ).toHaveAttribute("data-path-panel", "now");
      await expect(flatSiteLink(page)).toHaveAttribute("href", "/#now");
    });
  }
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

/* The panel rules are layered (AGENTS.md: never bare), and still pick the
   selected step's text, on screen and in print. */
test("the panel rules are layered, and print shows the selected step's text only", async ({
  page,
}) => {
  await page.goto("/path#lille");
  const css = await page
    .locator("[data-path-overlay] style, style")
    .evaluateAll((styles) =>
      styles
        .map((style) => style.textContent ?? "")
        .filter((text) => text.includes("data-path-panel")),
    );
  expect(css.length).toBe(1);
  expect(css[0]).toMatch(/^@layer components\{/);

  await page.emulateMedia({ media: "print" });
  await expect(panel(page).locator('[data-path-panel="lille"]')).toBeVisible();
  await expect(panel(page).locator("[data-path-panel]:visible")).toHaveCount(1);
  for (const line of stepNamed("lille").lines) {
    await expect(panel(page)).toContainText(line);
  }
});

/* Decision 7: a step's text appears the moment it is selected. On a phone
   the panel is under the list and the stage, so selecting brings it into
   view, without taking focus off the step. */
test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  const panelInView = (page: Page) =>
    panel(page).evaluate((element) => {
      const { top } = element.getBoundingClientRect();
      return top >= 0 && top < window.innerHeight * 0.85;
    });

  test("selecting a step brings its text into view and keeps focus on it", async ({
    page,
  }) => {
    /* A short phone: on a tall one the panel's top shows under the board
       already. */
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/path");
    await expect(stepLink(page, "now")).toBeVisible();
    expect(await panelInView(page)).toBe(false);
    await stepLink(page, "lille").focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => panelInView(page)).toBe(true);
    await expect(stepLink(page, "lille")).toBeFocused();
    await expect(
      panel(page).locator('[data-path-panel="lille"]'),
    ).toBeInViewport();
  });

  test("a load of a step's fragment does not scroll", async ({ page }) => {
    await page.goto("/path#lille");
    await expect(stepLink(page, "lille")).toHaveAttribute("aria-current", /./);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test.describe("with motion allowed", () => {
    test.use({ contextOptions: { reducedMotion: "no-preference" } });

    /* With motion allowed the tour has already put a bare `/path` on home,
       so the pick is another step. */
    test("the text glides into view", async ({ page }) => {
      await page.goto("/path");
      await hydrated(page);
      await stepLink(page, "lille").click();
      await expect.poll(() => panelInView(page)).toBe(true);
      await expect(stepLink(page, "lille")).toBeFocused();
    });
  });
});

test("on a wide screen, selecting a step does not scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/path");
  await stepLink(page, "lille").click();
  await expect(page.locator("[data-path-overlay]")).toHaveAttribute(
    "data-path-shown",
    "lille",
  );
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("/path is absent from the sitemap", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<urlset");
  expect(sitemap).not.toMatch(/\/path</);
});

/* The first screen on a wide screen: the steps as one strip across the
   top, the board under it, the tour's tabs and the text panel down the
   right. Nothing is cut: every step is whole in the strip, and the panel's
   text, where it scrolls, fades at its foot rather than stopping. */
test.describe("the first screen on a wide screen", () => {
  for (const [width, height] of [
    [1440, 900],
    [1280, 720],
  ] as const) {
    test(`at ${width}×${height} every step is whole in the strip, and the strip, the board and the panel are in the first screen`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/path#lille");
      await hydrated(page);
      /* A step is cut if anything printed in it runs past its link. */
      const clipped = await stepList(page)
        .locator("[data-path-step-link]")
        .evaluateAll((links) =>
          links
            .filter((link) => {
              const box = link.getBoundingClientRect();
              return [...link.children]
                .filter((child) => !child.classList.contains("sr-only"))
                .some((child) => {
                  const at = child.getBoundingClientRect();
                  return at.left < box.left - 1 || at.right > box.right + 1;
                });
            })
            .map((link) => link.getAttribute("data-path-step-link")),
        );
      expect(clipped).toEqual([]);
      const strip = page.locator(".path-step-strip");
      expect(
        await strip.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);

      const stage = (await page.locator("[data-path-stage]").boundingBox())!;
      const list = (await stepList(page).boundingBox())!;
      const card = (await panel(page).locator("..").boundingBox())!;
      for (const box of [stage, list, card]) {
        expect(box.y + box.height).toBeLessThanOrEqual(height);
      }
      /* The strip above the board, the panel beside it. */
      expect(list.y + list.height).toBeLessThanOrEqual(stage.y);
      expect(stage.x + stage.width).toBeLessThanOrEqual(card.x);
    });
  }

  test("the panel's lines stay at a readable measure", async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto("/path#lille");
    await hydrated(page);
    const characters = await panel(page)
      .locator('[data-path-panel="lille"] li')
      .first()
      .evaluate((item) => {
        const style = getComputedStyle(item);
        const probe = document.createElement("span");
        probe.style.font = style.font;
        probe.textContent = "abcdefghijklmnopqrstuvwxyz".repeat(4);
        document.body.append(probe);
        const perCharacter = probe.getBoundingClientRect().width / 104;
        probe.remove();
        return item.getBoundingClientRect().width / perCharacter;
      });
    expect(characters).toBeLessThanOrEqual(75);
    expect(characters).toBeGreaterThanOrEqual(40);
  });

  test("a step's text too long for the panel fades at its foot, until it is read to the end", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/path#lille");
    await hydrated(page);
    const text = panel(page);
    await expect(text).toHaveAttribute("data-path-more", "");
    expect(await text.evaluate((el) => getComputedStyle(el).maskImage)).toMatch(
      /gradient/,
    );
    await text.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await expect(text).not.toHaveAttribute("data-path-more");

    /* A short step fits, and does not fade. */
    await stepLink(page, "home").click();
    await expect(text).not.toHaveAttribute("data-path-more");
  });
});

/* On a phone the strip shows three steps at a time, whole, the current one
   in the middle; nothing in it is cut at the strip's edges. */
test.describe("the strip on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  for (const slug of ["home", "lille", "next"] as const) {
    test(`with ${slug} selected, it is in the middle and every step shown is whole`, async ({
      page,
    }) => {
      await page.goto(`/path#${slug}`);
      await hydrated(page);
      const strip = page.locator(".path-step-strip");
      await expect
        .poll(() =>
          strip.evaluate((el, current) => {
            const box = el.getBoundingClientRect();
            const row = el
              .querySelector(`[data-path-step-link="${current}"]`)!
              .closest("li")!
              .getBoundingClientRect();
            return Math.abs(
              row.left + row.width / 2 - (box.left + box.width / 2),
            );
          }, slug),
        )
        .toBeLessThanOrEqual(2);
      const cut = await strip.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return [...el.querySelectorAll("li")]
          .map((row) => row.getBoundingClientRect())
          .filter((row) => row.right > box.left + 1 && row.left < box.right - 1)
          .filter((row) => row.left < box.left - 1 || row.right > box.right + 1)
          .length;
      });
      expect(cut).toBe(0);
    });
  }

  test("the keys' line is not shown to a finger", async ({ page }) => {
    await page.goto("/path");
    await hydrated(page);
    await expect(page.getByText(/J back/)).toBeHidden();
  });
});
