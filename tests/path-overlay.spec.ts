/* `/path` before any 3D (#147): its HTML overlay — the step list with the piece
   and seen ticks, the narration bar, and the permanent "Flat site" link. The
   steps' full text is in the HTML too, for print and for a visit without
   JavaScript; once scripted, the screen has the voice and captions instead
   (v3), and "Read this step" for the text.
   The contract is #141 — decisions 6, 7 and 13, implementation decisions 4
   and 6 — with storyboard §7.4 and §7.7 of docs/research/experience-rethink.md
   and ADR-0002 (its own shell, one `contentinfo`). `/path` is deliberately not
   in `routesUsingTheSharedShell`, so its landmarks are asserted here. */

import { expect, test, type Page } from "@playwright/test";

import { narrationFor } from "@/app/path/narration";
import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";
import { ENTERED_STORAGE_KEY, SEEN_STORAGE_KEY } from "@/lib/path-state";

const stepList = (page: Page) =>
  page.getByRole("navigation", { name: "The path" });
const stepLink = (page: Page, slug: PathStepSlug) =>
  page.locator(`[data-path-step-link="${slug}"]`);
const piece = (page: Page) => page.locator("[data-path-piece]");
const panel = (page: Page) => page.locator("[data-path-text-panel]");
const bar = (page: Page) => page.locator("[data-path-narration]");
const readStep = (page: Page) =>
  page.getByRole("link", { name: "Read this step" });
const flatSiteLink = (page: Page) =>
  page.getByRole("link", { name: "Flat site", exact: true });

const stepNamed = (slug: PathStepSlug) =>
  PATH_STEPS.find((step) => step.slug === slug)!;

/** The piece mounts on hydration, so waiting for it waits for the handlers. */
async function hydrated(page: Page) {
  await expect(piece(page)).toHaveCount(1);
}

/** The step's text as paper shows it: its place, roles and results, and no
 *  other step's. */
async function expectPrinted(page: Page, slug: PathStepSlug) {
  const step = stepNamed(slug);
  await page.emulateMedia({ media: "print" });
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
  await page.emulateMedia({ media: null });
}

/** Selected means all of it: the link is current, the piece is on the step,
 *  the caption line tells that step, its full text is a click away, on
 *  paper and on the flat site, and "Flat site" carries it back to `/`. */
async function expectSelected(page: Page, slug: PathStepSlug) {
  await expect(stepLink(page, slug)).toHaveAttribute(
    "aria-current",
    "location",
  );
  await expect(stepList(page).locator("[aria-current]")).toHaveCount(1);
  await expect(piece(page)).toHaveAttribute("data-path-piece", slug);

  /* Under reduced motion the tour waits, on the step's first cue. */
  await expect(page.locator("[data-path-caption]")).toHaveText(
    narrationFor(slug).cues[0].text,
  );
  await expect(panel(page)).toBeHidden();
  await expect(readStep(page)).toHaveAttribute("href", `/#${slug}`);
  await expectPrinted(page, slug);

  await expect(flatSiteLink(page)).toHaveAttribute("href", `/#${slug}`);
}

/** The longest cue fits in the lines the caption holds open, so no cue
 *  moves what is around the caption. */
async function expectLongestCueFits(page: Page) {
  const longest = PATH_STEPS.flatMap(
    (step) => narrationFor(step.slug).cues,
  ).reduce((a, b) => (b.text.length > a.text.length ? b : a)).text;
  const fits = await page
    .locator("[data-path-caption]")
    .evaluate((caption, text) => {
      const held = caption.getBoundingClientRect().height;
      const probe = caption.cloneNode() as HTMLElement;
      probe.textContent = text;
      caption.after(probe);
      const needed = probe.getBoundingClientRect().height;
      probe.remove();
      return needed <= held + 1;
    }, longest);
  expect(fits, longest).toBe(true);
}

async function seenSlugs(page: Page) {
  return page
    .locator("[data-path-seen] [data-path-step-link]")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("data-path-step-link")),
    );
}

test("the overlay is server HTML: the step list, every step's text and Flat site", async ({
  request,
}) => {
  const html = await (await request.get("/path")).text();
  for (const step of PATH_STEPS) {
    expect(html, `${step.slug}'s link`).toContain(
      `data-path-step-link="${step.slug}"`,
    );
    expect(html, `${step.slug}'s text`).toContain(
      `data-path-panel="${step.slug}"`,
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
    /* The text is on screen here: no voice and no captions without
       JavaScript. */
    await expect(panel(page)).toBeVisible();
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

  test("a load of /path#lille keeps the text off the screen, puts Lille's on paper, and Flat site to /#lille", async ({
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
    /* Scripted before paint, so the text never flashes on screen. */
    await expect(panel(page)).toBeHidden();
    await expectPrinted(page, "lille");
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
      await expect(panel(page)).toBeHidden();
      await page.emulateMedia({ media: "print" });
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
    /* Focus stays on the step that was selected (storyboard §7.7). Before
       the print check, whose media switch takes the page's focus. */
    await expect(link).toBeFocused();
    await expectSelected(page, slug);
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

  /* The switches were at the screen's bottom edge (v3-harden), and a third,
     Sound, is to join them in the same row. */
  test("the Voice and Captions switches are whole in the first screen, with room for a third beside them", async ({
    page,
  }) => {
    await page.goto("/path#lille");
    await hydrated(page);
    const voice = page.locator("[data-path-voice-switch]");
    const captions = page.locator("[data-path-captions-switch]");
    await expect(voice).toBeInViewport({ ratio: 1 });
    await expect(captions).toBeInViewport({ ratio: 1 });
    /* A third switch, labelled as Sound will be, laid in the row: it has
       to stay in the row and in the screen. */
    const third = await voice.evaluate((button) => {
      const probe = button.cloneNode(true) as HTMLElement;
      probe.lastChild!.textContent = "Sound";
      button.parentElement!.append(probe);
      const at = probe.getBoundingClientRect();
      const first = button.getBoundingClientRect();
      probe.remove();
      return { top: at.top, firstTop: first.top, bottom: at.bottom };
    });
    expect(third.top).toBe(third.firstTop);
    expect(third.bottom).toBeLessThanOrEqual(812);
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

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("a load of a step's fragment does not scroll", async ({ page }) => {
    await page.goto("/path#lille");
    await expect(stepLink(page, "lille")).toHaveAttribute("aria-current", /./);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("the caption and the tour's tabs are in the first screen", async ({
    page,
  }) => {
    await page.goto("/path#lille");
    await hydrated(page);
    await expect(page.locator("[data-path-caption]")).toBeInViewport();
    await expect(page.locator("[data-path-tour-play]")).toBeInViewport();
    await expectLongestCueFits(page);
  });

  /* Under a finger the keys' line is hidden; with a mouse on a narrow
     window it wraps under the tabs rather than running off the screen. */
  test("the keys' line stays inside the screen", async ({ page }) => {
    await page.goto("/path#lille");
    await hydrated(page);
    const keys = page.getByText(/J back/);
    await expect(keys).toBeVisible();
    const box = (await keys.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  });
});

test("Read this step goes to the step's section on the flat site", async ({
  page,
}) => {
  await page.goto("/path#lille");
  await hydrated(page);
  await expect(readStep(page)).toHaveAttribute("href", "/#lille");
  await stepLink(page, "turin").click();
  await expect(readStep(page)).toHaveAttribute("href", "/#turin");
  await readStep(page).click();
  await expect(page).toHaveURL(/\/#turin$/);
  await expect(page.locator("#turin")).toBeInViewport();
});

test("/path hydrates without a mismatch", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/path#lille");
  await hydrated(page);
  await page.waitForTimeout(300);
  expect(errors.filter((error) => /hydrat/i.test(error))).toEqual([]);
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
   top, the board under it, the narration bar under that. Nothing is cut:
   every step is whole in the strip. */
test.describe("the first screen on a wide screen", () => {
  for (const [width, height] of [
    [1440, 900],
    [1280, 720],
    [1024, 800],
  ] as const) {
    test(`at ${width}×${height} every step is whole in the strip, and the strip, the board and the bar are in the first screen`, async ({
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
      const card = (await bar(page).boundingBox())!;
      for (const box of [stage, list, card]) {
        expect(box.y + box.height).toBeLessThanOrEqual(height);
      }
      /* The strip above the board, the bar under it, all three as wide. */
      expect(list.y + list.height).toBeLessThanOrEqual(stage.y);
      expect(stage.y + stage.height).toBeLessThanOrEqual(card.y);
      expect(Math.abs(card.width - list.width)).toBeLessThanOrEqual(1);
      /* The longest cue fits the caption's held lines: a cue changing
         never moves the bar. */
      await expectLongestCueFits(page);
    });
  }
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

  test("a step tapped at the strip's edge comes to its middle", async ({
    page,
  }) => {
    await page.goto("/path#lille");
    await hydrated(page);
    const strip = page.locator(".path-step-strip");
    const offCentre = (slug: PathStepSlug) =>
      strip.evaluate((el, current) => {
        const box = el.getBoundingClientRect();
        const row = el
          .querySelector(`[data-path-step-link="${current}"]`)!
          .closest("li")!
          .getBoundingClientRect();
        return Math.abs(row.left + row.width / 2 - (box.left + box.width / 2));
      }, slug);
    await expect.poll(() => offCentre("lille")).toBeLessThanOrEqual(2);
    /* Lille's right-hand neighbour, at the strip's edge until it is chosen. */
    const next = PATH_STEPS[PATH_STEPS.findIndex((s) => s.slug === "lille") + 1]
      .slug as PathStepSlug;
    expect(await offCentre(next)).toBeGreaterThan(50);
    await stepLink(page, next).tap();
    await expect.poll(() => offCentre(next)).toBeLessThanOrEqual(2);
  });

  test("the keys' line is not shown to a finger", async ({ page }) => {
    await page.goto("/path");
    await hydrated(page);
    await expect(page.getByText(/J back/)).toBeHidden();
  });
});
