/* Issue #24 — the published Writing index. The oracle is the issue's
   acceptance criteria plus spec §2.5: count-aware transitions with no
   numbering, reading time omitted rather than guessed, accessible essay
   semantics, the cover image contract, and a surface that goes absent instead
   of breaking when the feed does.

   Everything runs against `/writing/fixture/<state>` so every count and failure
   state stays reproducible after the live publication changes. */

import { expect, test, type Page } from "@playwright/test";

import { contrast } from "./support/color";
import { removeDevOverlay } from "./support/dev-overlay";
import { setTheme, themes } from "./support/theme";
import {
  breakCoverImages,
  essayTitles,
  fixtureRoute,
  stubCoverImages,
} from "./support/writing-fixtures";

const LAUNCH_LINE = /^First post published/;
const ARCHIVE_LINK = "Read all posts on Substack →";

async function gotoFixture(page: Page, state: string, query = "") {
  await stubCoverImages(page);
  await page.goto(fixtureRoute(state, query));
  await removeDevOverlay(page);
}

function essays(page: Page) {
  return page.locator("main article");
}

test.describe("count-aware transitions (locked)", () => {
  const states = [
    { state: "0", essays: 0, launchLine: false, archive: false },
    { state: "1", essays: 1, launchLine: true, archive: false },
    { state: "2", essays: 2, launchLine: false, archive: false },
    { state: "3", essays: 3, launchLine: false, archive: false },
    { state: "4", essays: 4, launchLine: false, archive: true },
    { state: "6", essays: 6, launchLine: false, archive: true },
  ] as const;

  for (const expected of states) {
    test(`${expected.essays} essays: lead, rows and archive link follow the count`, async ({
      page,
    }) => {
      await gotoFixture(page, expected.state);

      await expect(essays(page)).toHaveCount(expected.essays);

      /* The launch line exists so a plural standfirst is not delivering one
         essay unframed. It must appear at exactly one, and nowhere else. */
      await expect(page.getByText(LAUNCH_LINE)).toHaveCount(
        expected.launchLine ? 1 : 0,
      );

      /* The archive is an off-site Substack URL and only honest at 4+, where
         the feed window is no longer the whole archive. */
      await expect(page.getByRole("link", { name: ARCHIVE_LINK })).toHaveCount(
        expected.archive ? 1 : 0,
      );

      /* One lead, and rows only once there is more than one essay. Rows carry
         list semantics so they are announced as a set. */
      await expect(page.locator("main ul li article")).toHaveCount(
        Math.max(expected.essays - 1, 0),
      );
    });
  }

  test("the same essay is stable between four and six", async ({ page }) => {
    /* #10's publication-order numbering was dropped because the numbers came
       from the fetched window, not the archive: the same essay rendered 04 at
       four items and 06 at six. Nothing about an essay may depend on how many
       of its neighbours the feed happened to return. */
    await gotoFixture(page, "4");
    const atFour = await essayTitles(page);

    await gotoFixture(page, "6");
    const atSix = await essayTitles(page);

    expect(atFour).toEqual(atSix.slice(0, 4));
  });

  test("nothing on the index is numbered", async ({ page }) => {
    await gotoFixture(page, "6");

    const listText = await page.locator("main").innerText();
    expect(listText).not.toMatch(/\b0\d\b/);
    await expect(page.locator("main ol")).toHaveCount(0);
  });

  test("the archive link sits below the subscribe module, not at the end of the list", async ({
    page,
  }) => {
    await gotoFixture(page, "6");

    const moduleBox = await page
      .getByRole("heading", { name: "Get the field notes by email" })
      .boundingBox();
    const archiveBox = await page
      .getByRole("link", { name: ARCHIVE_LINK })
      .boundingBox();
    if (!moduleBox || !archiveBox) throw new Error("surfaces not laid out");

    expect(archiveBox.y).toBeGreaterThan(moduleBox.y);
  });
});

test.describe("failure is absence, never a broken page", () => {
  for (const state of ["0", "malformed", "unreachable"] as const) {
    test(`a ${state} feed omits the essays and keeps the rest of the route`, async ({
      page,
    }) => {
      const failures: string[] = [];
      page.on("pageerror", (error) => failures.push(error.message));

      const response = await page.goto(fixtureRoute(state));
      await removeDevOverlay(page);

      expect(response?.status()).toBe(200);
      await expect(essays(page)).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Writing",
      );
      /* The conversion point survives the failure — this is the surface the
         whole site's primary CTA points at. */
      await expect(
        page.getByRole("heading", { name: "Get the field notes by email" }),
      ).toBeVisible();
      /* After launch, a failed or empty feed must not revive the retired claim
         that the first post has not been published. */
      await expect(
        page.getByText(/first post is not published yet/i),
      ).toHaveCount(0);

      expect(failures).toEqual([]);
    });
  }
});

test.describe("essay semantics", () => {
  test("each essay is one link named by its title alone", async ({ page }) => {
    await gotoFixture(page, "6");

    const titles = await essayTitles(page);
    expect(titles).toHaveLength(6);

    /* As prototyped, every essay was a single 221–268-character link — the
       cover, date, excerpt and CTA all inside the accessible name, six times
       over. The card stays clickable; the name is the title. */
    for (const [index, title] of titles.entries()) {
      const links = essays(page).nth(index).getByRole("link");
      await expect(links).toHaveCount(1);
      await expect(links).toHaveAccessibleName(title);
      await expect(links).toHaveAttribute("target", "_blank");
      await expect(links).toHaveAttribute("rel", /noopener/);
      await expect(links).toHaveAttribute(
        "href",
        /^https:\/\/lorenzogermini\.substack\.com\/p\//,
      );
    }
  });

  test("rows are peers of the lead, not sections of it", async ({ page }) => {
    await gotoFixture(page, "6");

    /* Rows used to be `h3` under the lead's `h2`, so heading navigation
       announced the other five essays as subsections of the lead essay. */
    const levels = await page
      .locator("main h1, main h2, main h3, main h4")
      .evaluateAll((headings) => headings.map((heading) => heading.tagName));

    expect(levels[0]).toBe("H1");
    expect(new Set(levels.slice(1))).toEqual(new Set(["H2"]));
  });

  test("the metadata row omits reading time rather than guessing at it", async ({
    page,
  }) => {
    await gotoFixture(page, "6");

    /* The fifth fixture essay ships a body under the 250-word floor — the
       shape a truncated paid preview arrives in, and equally the shape a short
       free post does. The site cannot tell them apart, so it labels neither. */
    const short = essays(page).filter({
      hasText: "Pricing an agent you cannot fully predict",
    });
    await expect(short).toHaveCount(1);
    await expect(short).toContainText("19 May 2026");
    await expect(short).not.toContainText("min read");
    await expect(short).not.toContainText(/paid/i);

    const lead = essays(page).first();
    await expect(lead).toContainText("21 Jul 2026 · 11 min read");
  });

  test("the index publishes minimal Blog structured data", async ({ page }) => {
    await page.goto("/writing");

    const blog = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) =>
        scripts
          .map((script) => JSON.parse(script.textContent ?? "{}"))
          .find((data) => data["@type"] === "Blog"),
      );

    expect(blog).toMatchObject({
      "@type": "Blog",
      name: "germinai",
      url: "https://lorenzogermini.substack.com",
      author: { "@type": "Person", name: "Lorenzo Germini" },
    });
  });
});

test.describe("the cover contract", () => {
  test("the lead cover loads eagerly and the rows stay lazy", async ({
    page,
  }) => {
    await gotoFixture(page, "6");

    const lead = essays(page).first().locator("img");
    /* The LCP element. Not `priority` — deprecated in Next 16 — and not a
       `<link rel=preload>`, which is for images the parser has not reached. */
    await expect(lead).toHaveAttribute("loading", "eager");
    await expect(lead).toHaveAttribute("fetchpriority", "high");
    await expect(lead).toHaveAttribute(
      "sizes",
      "(min-width: 768px) 42rem, 100vw",
    );

    const rows = page.locator("main ul li article img");
    for (const row of await rows.all()) {
      await expect(row).toHaveAttribute("loading", "lazy");
      /* A bare `sizes="160px"` served a 160px file into a 325px slot at DPR 2
         on every phone, where the row thumb is full width. */
      await expect(row).toHaveAttribute(
        "sizes",
        "(min-width: 640px) 160px, 100vw",
      );
    }
  });

  for (const theme of themes) {
    test(`${theme} mode: every cover carries a hairline that reads against the ground`, async ({
      page,
    }) => {
      await setTheme(page, theme);
      await gotoFixture(page, "6");

      /* Substack auto-generates near-white title cards: 1.04:1 against the
         paper, 17:1 against the near-black. The hairline is the boundary that
         makes a cover an object on both grounds, so it is held to 3:1 like any
         other functional non-text element. */
      const measurements = await page
        .locator("main article img")
        .evaluateAll((images) =>
          images.map((image) => {
            const box = image.parentElement as HTMLElement;
            return {
              border: getComputedStyle(box).borderTopColor,
              width: getComputedStyle(box).borderTopWidth,
              ground: getComputedStyle(document.body).backgroundColor,
              filter: getComputedStyle(image).filter,
            };
          }),
        );

      expect(measurements.length).toBeGreaterThan(0);
      for (const measurement of measurements) {
        expect(parseFloat(measurement.width)).toBeGreaterThan(0);
        expect(
          contrast(measurement.border, measurement.ground),
        ).toBeGreaterThanOrEqual(3);
        /* Light covers are knocked back in dark, where they otherwise out-shout
           every word on the page. */
        expect(measurement.filter).toBe(
          theme === "dark" ? "brightness(0.82)" : "none",
        );
      }
    });
  }

  test("a coverless essay keeps the rhythm above sm and drops the panel below it", async ({
    page,
  }) => {
    await gotoFixture(page, "6");
    const coverless = essays(page).filter({
      hasText: "The compliance market has a reader problem",
    });
    /* The feed does not guarantee an `<enclosure>`; a missing one gets a
       typographic panel at the same aspect ratio rather than a gap. */
    await expect(coverless.locator("img")).toHaveCount(0);
    await expect(coverless.locator("[aria-hidden='true']")).toBeVisible();

    await page.setViewportSize({ width: 375, height: 812 });
    /* Full width on a phone, the same panel is just a large empty box. */
    await expect(coverless.locator("[aria-hidden='true']")).toBeHidden();
  });
});

test.describe("geometry", () => {
  test("the index fits every width without horizontal overflow", async ({
    page,
  }) => {
    /* One navigation, three reflows: the overflow is pure CSS, so re-loading
       the fixture per width would only spend time. */
    await gotoFixture(page, "6");

    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test("the lead outranks the rows, and the h1 outranks the lead", async ({
    page,
  }) => {
    await gotoFixture(page, "6");

    /* Decision 5: `h1` 36px, lead 28px, rows 20px. #13 found the `h1` and the
       lead title both at 36px in the same colour, differing only by weight. */
    const sizes = await page.evaluate(() => {
      const size = (selector: string) =>
        parseFloat(
          getComputedStyle(document.querySelector(selector)!).fontSize,
        );
      return {
        h1: size("main h1"),
        lead: size("main article h2"),
        row: size("main ul li article h2"),
      };
    });

    expect(sizes.h1).toBeGreaterThan(sizes.lead);
    expect(sizes.lead).toBeGreaterThan(sizes.row);
  });

  test("essay excerpts cap with the rest of the page's prose", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await gotoFixture(page, "6");

    /* The lead excerpt set at 90 characters per line while every other
       paragraph ran 63–74, because `max-width` computed to `none`. Metadata
       rows are excluded deliberately: a one-line mono date is not prose and
       has no measure to keep. */
    const widths = await page
      .locator("main article [data-essay-excerpt]")
      .evaluateAll((paragraphs) =>
        paragraphs.map((paragraph) => paragraph.getBoundingClientRect().width),
      );

    for (const width of widths) {
      expect(width).toBeLessThanOrEqual(560);
    }
  });
});

/* #86: `Cover` fell back when the feed carried no `<enclosure>` at all, but never
   when the URL in one it did carry failed to load. A CDN 404 therefore rendered
   the bordered box with nothing inside it — and at the launch state that empty
   386px lead box pushed the title to y≈780, below the fold at 1024×900. The one
   essay on the site, invisible. */
test.describe("a cover that fails to load", () => {
  /** Serves a 404 for every optimizer request, which is what a dead CDN URL
   *  looks like to the browser. */
  test("falls back to the same coverless panel the missing-enclosure case gets", async ({
    page,
  }) => {
    await breakCoverImages(page);
    await page.goto(fixtureRoute("1"));

    const lead = page.locator("main article").first();

    /* The image is replaced, not merely broken: a broken `<img>` still occupies
       the box and still renders the browser's own placeholder glyph. */
    await expect(lead.locator("img")).toHaveCount(0);
    await expect(lead.locator("[aria-hidden='true']").first()).toBeVisible();
  });

  test("carries the date, so the box says something rather than nothing", async ({
    page,
  }) => {
    /* Deliberately not a geometry assertion: the panel holds the same 16:9 box a
       loaded cover would, so nothing above or below it moves — which is the
       point, and also means position cannot tell the two apart. What changes is
       that the box stops being empty. */
    await breakCoverImages(page);
    await page.goto(fixtureRoute("1"));

    await expect(
      page.locator("main article [aria-hidden='true']").first(),
    ).not.toBeEmpty();
  });

  test("does not double the panel's hairline", async ({ page }) => {
    /* The fallback replaces the wrapper rather than filling it — rendered inside
       the box, the panel's own border would sit on top of the wrapper's. */
    await breakCoverImages(page);
    await page.goto(fixtureRoute("1"));

    const panel = page.locator("main article [aria-hidden='true']").first();
    const nestedBorders = await panel.evaluate((el) => {
      let depth = 0;
      let node: Element | null = el;
      while (node && node !== document.body) {
        if (Number.parseFloat(getComputedStyle(node).borderTopWidth) > 0) {
          depth += 1;
        }
        node = node.parentElement;
      }
      return depth;
    });
    expect(nestedBorders).toBe(1);
  });
});
