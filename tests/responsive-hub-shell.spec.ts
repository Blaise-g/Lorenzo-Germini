import { expect, test, type Locator, type Page } from "@playwright/test";

import { RESUME_DATA } from "@/data/resume-data";

import { revealBackToTop } from "./support/back-to-top";
import { commandMenuTrigger } from "./support/command-palette";
import { removeDevOverlay } from "./support/dev-overlay";
import { personStructuredData } from "./support/structured-data";

const mobileAndTabletWidths = [375, 768, 1023] as const;
const desktopWidths = [1024, 1440, 1728] as const;
const allWidths = [...mobileAndTabletWidths, ...desktopWidths] as const;

/* Border-box edges of the masthead rule against the layout viewport. The rule is
   a border, so its own box is what has to be flush — clientWidth, not
   innerWidth, is the width in-flow content can actually reach. */
async function mastheadRuleEdges(page: Page) {
  return page.getByTestId("masthead-rule").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      borderWidth: Number.parseFloat(
        getComputedStyle(element).borderBottomWidth,
      ),
      left: rect.left,
      right: rect.right,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
}

/* Line boxes, not wrapping utilities: a Range over the element's text yields one
   client rect per line box, so a wrap shows up as 2 whatever the class list says.
   Rects are grouped by rounded top edge because a Range spanning several text
   nodes can report adjacent rects on the same line. */
async function lineBoxCount(target: Locator) {
  return target.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const tops = [...range.getClientRects()]
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => Math.round(rect.top));
    return new Set(tops).size;
  });
}

async function visibleCount(page: Page, selector: string) {
  return page.locator(selector).evaluateAll(
    (elements) =>
      elements.filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      }).length,
  );
}

test.describe("responsive hub shell", () => {
  for (const width of mobileAndTabletWidths) {
    test(`${width}px uses one reading measure and mobile orientation`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      await expect(
        page.getByRole("navigation", { name: "On this page" }),
      ).toBeVisible();
      await expect(
        page.getByRole("complementary", {
          name: "Profile and page sections",
        }),
      ).toBeHidden();
      await expect(page.getByTestId("mobile-identity")).toBeVisible();

      expect(
        await visibleCount(page, '[data-profile-orientation="identity"]'),
      ).toBe(1);

      const readingWidths = await page
        .locator('[data-reading-measure="true"]')
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().width),
        );
      expect(readingWidths.length).toBeGreaterThan(0);
      expect(readingWidths.every((measure) => measure <= 672)).toBe(true);

      const projectGrid = page.getByTestId("projects-grid");
      const projectColumns = await projectGrid.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      );
      expect(projectColumns).toBe(1);
      expect(
        await projectGrid.evaluate(
          (element) => element.getBoundingClientRect().width,
        ),
      ).toBeLessThanOrEqual(672);
    });
  }

  for (const width of desktopWidths) {
    test(`${width}px uses the 220px sticky rail and a measure-aligned Projects grid`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      const rail = page.getByRole("complementary", {
        name: "Profile and page sections",
      });
      await expect(rail).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "On this page" }),
      ).toBeHidden();
      await expect(page.getByTestId("mobile-identity")).toBeHidden();

      expect(
        await visibleCount(page, '[data-profile-orientation="identity"]'),
      ).toBe(1);

      const railMetrics = await rail.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          position: style.position,
          top: Number.parseFloat(style.top),
          width: element.getBoundingClientRect().width,
        };
      });
      expect(railMetrics.width).toBe(220);
      expect(railMetrics.position).toBe("sticky");
      expect(railMetrics.top).toBeGreaterThanOrEqual(24);

      /* The grid follows the count rather than always being two-up (#86): one
         320px card in a 652px two-column row read as a section that had failed
         to load, with a left edge 12px outside every sibling's. Under two
         homepage-visible projects it collapses to one column on the reading
         measure; from two it holds the wider two-column box. */
      const homepageProjects = RESUME_DATA.projects.filter(
        (project) => project.homepage !== false,
      ).length;
      const projectGrid = page.getByTestId("projects-grid");
      const projectColumns = await projectGrid.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      );
      expect(projectColumns).toBe(homepageProjects < 2 ? 1 : 2);

      /* The defect the collapse exists to fix: the grid's left edge has to line
         up with every other section's, not sit outside it. */
      const edges = await page.evaluate(() => {
        const grid = document.querySelector('[data-testid="projects-grid"]')!;
        const sibling = document.querySelector(
          '[data-reading-measure="true"]',
        )!;
        return {
          grid: grid.getBoundingClientRect().left,
          sibling: sibling.getBoundingClientRect().left,
        };
      });
      expect(Math.abs(edges.grid - edges.sibling)).toBeLessThanOrEqual(1);
    });
  }

  /* `data-profile-orientation` marks identity surfaces; the masthead carries its
     own value so the count above sees only band-or-rail. The footer signature is
     not part of this vocabulary: it attributes the page rather than stating the
     identity, and it is shared with every other route. */
  test("the masthead orientation value is distinct from the body surfaces'", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/");

    const masthead = page.getByTestId("masthead-inset");
    await expect(masthead).toHaveAttribute("data-profile-orientation");

    const mastheadValue = await masthead.getAttribute(
      "data-profile-orientation",
    );
    const bodyValues = await Promise.all(
      [
        page.getByTestId("mobile-identity"),
        page.getByRole("complementary", { name: "Profile and page sections" }),
      ].map((surface) => surface.getAttribute("data-profile-orientation")),
    );

    /* Spelled out rather than compared as a set: these are the values the
       "exactly one visible" counts above select on, so a rename has to break
       here too. */
    expect(bodyValues).toEqual(["identity", "identity"]);
    expect(bodyValues).not.toContain(mastheadValue);
  });

  /* Plain at every width since #26 removed the band's second `<h1>`: the
     masthead is now the only surface that states the name, and below 1024 the
     band states the role and location instead. */
  for (const width of allWidths) {
    test(`${width}px states the name exactly once`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      expect(await visibleCount(page, "[data-identity-name]")).toBe(1);
    });
  }

  /* The assertion above only means something if the count it reads can move, so
     it is forced here on a live page: hiding every name surface leaves 0, so a
     page that stated the name nowhere would fail the invariant rather than pass
     it vacuously. Only one direction is left to force — with the band's
     duplicate gone (#26) there is no second surface to hide. */
  test("the visible name count moves when forced", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");

    expect(await visibleCount(page, "[data-identity-name]")).toBe(1);

    await page.addStyleTag({
      content: "[data-identity-name] { display: none !important; }",
    });
    expect(await visibleCount(page, "[data-identity-name]")).toBe(0);
  });

  for (const width of allWidths) {
    test(`${width}px spans the masthead rule edge to edge`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      const rule = await mastheadRuleEdges(page);
      expect(rule.borderWidth).toBeGreaterThan(0);
      expect(rule.left).toBeCloseTo(0, 0);
      expect(rule.right).toBeCloseTo(rule.viewportWidth, 0);
    });
  }

  /* Both halves of the masthead share one flex row with no min-width, so a role
     slot long enough to wrap steals the width the name needs: a 100-character
     role sentence leaves the name 125px and breaks it as "Lorenzo / Germini".
     Soft assertions so each half reports its own count instead of the first
     failure hiding the second. */
  for (const width of desktopWidths) {
    test(`${width}px keeps the masthead name and role on one line each`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      await expect(page.getByTestId("masthead-role")).toBeVisible();
      expect
        .soft(await lineBoxCount(page.getByTestId("masthead-name")))
        .toBe(1);
      expect
        .soft(await lineBoxCount(page.getByTestId("masthead-role")))
        .toBe(1);
    });
  }

  /* `roleLabel` is the masthead's own field, and per spec §2.7 it is also what
     the machine-readable identity claims — while the work history keeps the
     employer's own job title. The two must not collapse into each other. */
  test("the masthead role comes from roleLabel, and the bio keeps its surfaces", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/");

    await expect(page.getByTestId("masthead-role")).toHaveText(
      RESUME_DATA.roleLabel,
    );
    await expect(page).toHaveTitle(
      `${RESUME_DATA.name} | ${RESUME_DATA.about}`,
    );

    const person = await personStructuredData(page);

    expect(person, "the homepage should emit Person JSON-LD").toBeTruthy();
    expect(person.jobTitle).toBe(RESUME_DATA.roleLabel);
    expect(person.hasOccupation.name).toBe(RESUME_DATA.roleLabel);

    /* The positioning label is not the employer's title, so deriving either one
       from the other is the defect this guards. */
    expect(
      RESUME_DATA.work[0].title,
      "the work history should keep the employer-accurate title",
    ).not.toBe(RESUME_DATA.roleLabel);
    expect(person.worksFor.name).toBe(RESUME_DATA.work[0].company);
  });

  test("the masthead rule does not move with the shell's horizontal padding", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");

    const before = await mastheadRuleEdges(page);
    await page.addStyleTag({
      content: `[data-testid="masthead-inset"], [data-testid="body-inset"] {
        padding-left: 4px !important;
        padding-right: 140px !important;
      }`,
    });
    const after = await mastheadRuleEdges(page);

    expect(after.left).toBeCloseTo(before.left, 0);
    expect(after.right).toBeCloseTo(before.right, 0);
    expect(after.left).toBeCloseTo(0, 0);
    expect(after.right).toBeCloseTo(after.viewportWidth, 0);
  });

  test("the rail marks the current destination semantically and with the accent rule", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/");

    const railNav = page.getByRole("navigation", { name: "Page sections" });
    /* Writing is the first destination since #26 made it the page's single
       primary CTA, so it is what a page at scroll position 0 marks current. */
    const writingLink = railNav.getByRole("link", { name: "Writing" });
    /* `location`, not `true`: the token for a position within the page. */
    await expect(writingLink).toHaveAttribute("aria-current", "location");

    await page.locator("#work").scrollIntoViewIfNeeded();
    await expect
      .poll(() => railNav.locator('[aria-current="location"]').textContent())
      .toBe("Work");

    /* Polled, not read once: `border-left-color` is a transitioning property, so
       a read in the same tick React swaps the class returns the transition's
       start value — the colour the link is leaving, not the one it is taking. */
    await expect
      .poll(() =>
        railNav.locator('[aria-current="location"]').evaluate((element) => {
          const style = getComputedStyle(element);
          const root = getComputedStyle(document.documentElement);
          const probe = document.createElement("span");
          probe.style.color = root.getPropertyValue("--color-accent");
          document.body.append(probe);
          const accent = getComputedStyle(probe).color;
          probe.remove();

          return {
            borderColorIsAccent: style.borderLeftColor === accent,
            hasBorder: Number.parseFloat(style.borderLeftWidth) >= 1,
          };
        }),
      )
      .toEqual({ borderColorIsAccent: true, hasBorder: true });
  });

  /* Systems is the last destination and its section is short (87px measured at
     1440), so at maximum scroll its top never reaches the 28%-of-viewport
     activation line — the item was unreachable, not merely hard to hit, even by
     clicking it. */
  test("the rail marks the last destination once the page is scrolled to the bottom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/");

    const railNav = page.getByRole("navigation", { name: "Page sections" });
    await railNav.getByRole("link", { name: "Systems" }).click();

    /* Waits on the observable fact — scrolling has stopped — rather than
       re-implementing the production bottom-of-document predicate, which would
       weaken this to "when the browser satisfies the expression the code
       satisfies, the code fires". */
    await page.waitForFunction(
      () => {
        const w = window as Window & { __lastScrollY?: number };
        const settled = w.__lastScrollY === window.scrollY;
        w.__lastScrollY = window.scrollY;
        return settled && window.scrollY > 0;
      },
      undefined,
      { timeout: 5_000, polling: 100 },
    );

    /* The 0.28 ratio is written out rather than imported from `sticky-rail`: a
       test that reads the production constant cannot notice the constant
       changing. Numbers, not a boolean, so a failure prints the distance. */
    const geometry = await page.locator("#systems").evaluate((section) => ({
      scrollY: Math.round(window.scrollY),
      maxScroll: Math.round(
        document.documentElement.scrollHeight - window.innerHeight,
      ),
      systemsTop: Math.round(section.getBoundingClientRect().top),
      activationLine: Math.round(window.innerHeight * 0.28),
    }));

    expect(
      geometry.scrollY,
      "the Systems anchor must leave the page at maximum scroll",
    ).toBeGreaterThanOrEqual(geometry.maxScroll - 4);

    /* Guards the guard: if the section ever grows tall enough to clear the
       activation line on its own, this test stops reproducing the defect and
       should be retired rather than left passing for the wrong reason. */
    expect(
      geometry.systemsTop,
      "#systems now clears the activation line unaided — retire this test rather than leave it green for the wrong reason",
    ).toBeGreaterThan(geometry.activationLine);

    await expect
      .poll(() => railNav.locator('[aria-current="location"]').textContent())
      .toBe("Systems");
  });

  test("bottom fixed controls share one 56px cluster", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    await revealBackToTop(page);

    const cluster = await page.evaluate(() => {
      const fixedAncestor = (element: Element | null) => {
        let current = element?.parentElement ?? null;
        while (current && getComputedStyle(current).position !== "fixed") {
          current = current.parentElement;
        }
        return current;
      };
      const backToTop = document.querySelector(
        'button[aria-label="Back to top"]',
      );
      const command = document.querySelector(
        'button[aria-label="Open command menu"]',
      );
      const backToTopCluster = fixedAncestor(backToTop);
      const commandCluster = fixedAncestor(command);

      return {
        sameCluster:
          backToTopCluster !== null && backToTopCluster === commandCluster,
        width: backToTopCluster?.getBoundingClientRect().width,
      };
    });

    expect(cluster).toEqual({ sameCluster: true, width: 56 });
  });

  test("desktop keeps Back to top available in the margin", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/");
    await revealBackToTop(page);
    await expect(commandMenuTrigger(page)).toBeHidden();
  });

  test("interactive DOM order follows the mobile visual flow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    await removeDevOverlay(page);

    const visibleMainTargets = await page
      .locator("main a[href], main button")
      .evaluateAll((elements) =>
        elements.flatMap((element, domIndex) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          let ancestor: Element | null = element;
          let hasFixedAncestor = false;
          while (ancestor) {
            if (getComputedStyle(ancestor).position === "fixed") {
              hasFixedAncestor = true;
              break;
            }
            ancestor = ancestor.parentElement;
          }
          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            hasFixedAncestor ||
            rect.width === 0 ||
            rect.height === 0 ||
            element.getAttribute("tabindex") === "-1"
          ) {
            return [];
          }
          return [
            {
              domIndex,
              label:
                element.getAttribute("aria-label") ||
                element.textContent?.trim().slice(0, 40),
              top: rect.top,
            },
          ];
        }),
      );

    const inFlowTargets = visibleMainTargets.filter(({ top }) => top >= 0);
    const visualOrder = [...inFlowTargets].sort(
      (first, second) =>
        first.top - second.top || first.domIndex - second.domIndex,
    );

    expect(inFlowTargets.map(({ label }) => label)).toEqual(
      visualOrder.map(({ label }) => label),
    );
    expect(inFlowTargets[0]?.top).toBeLessThanOrEqual(800);
  });
});

/* #86 item 2 and item 5, which are the same defect from two directions: the
   masthead held ~600px of dead space between the name and the role at 1024,
   while `/writing` had zero inbound links from this page at any breakpoint — the
   homepage's designated primary CTA pointed at the publication and the one
   honest surface was unreachable. The route links occupy the dead space, and the
   Writing section's `All writing →` covers the phone. */
test.describe("the masthead earns its space", () => {
  for (const width of [1024, 1440] as const) {
    test(`${width}px offers Writing and CV opposite the name`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      const routes = page.getByTestId("masthead-routes");
      await expect(routes).toBeVisible();
      await expect(
        routes.getByRole("link", { name: "Writing" }),
      ).toHaveAttribute("href", "/writing");
      await expect(routes.getByRole("link", { name: "CV" })).toHaveAttribute(
        "href",
        "/cv",
      );

      /* The role label moved up beside the name, so what is left between the two
         clusters reads as margin rather than as a gap. */
      const gap = await page.evaluate(() => {
        const role = document
          .querySelector('[data-testid="masthead-role"]')!
          .getBoundingClientRect();
        const nav = document
          .querySelector('[data-testid="masthead-routes"]')!
          .getBoundingClientRect();
        return nav.left - role.right;
      });
      expect(gap).toBeGreaterThan(0);
      /* The dead space was ~600px. Anything near that means the links did not
         actually fill it. */
      expect(gap).toBeLessThan(520);
    });

    test(`${width}px keeps the masthead box within 84px`, async ({ page }) => {
      /* The route links must not buy horizontal use of the masthead with
         vertical growth — at `lg:pt-10` the box measured 86px. */
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      const box = await page.getByTestId("masthead-rule").boundingBox();
      expect(box!.height).toBeLessThanOrEqual(84);
    });
  }

  test("375 reclaims the chrome the old padding held, and still clears the toggle", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    /* The source comment used to claim `pt-12` was needed to clear the fixed
       theme toggle. Measured, the two never overlap horizontally — the name sits
       at x=24..164 and the toggle at x=315..359 — so the only real constraint is
       that this box's bottom rule stays below the toggle's bottom edge. */
    const geometry = await page.evaluate(() => {
      const masthead = document
        .querySelector('[data-testid="masthead-rule"]')!
        .getBoundingClientRect();
      const name = document
        .querySelector('[data-testid="masthead-name"]')!
        .getBoundingClientRect();
      const toggle = document
        .querySelector('[data-testid="theme-toggle"]')!
        .getBoundingClientRect();
      return { masthead, name, toggle };
    });

    expect(geometry.masthead.bottom).toBeGreaterThan(geometry.toggle.bottom);
    /* They never share horizontal space, which is why the box could shrink. */
    expect(geometry.name.right).toBeLessThan(geometry.toggle.left);
    /* Was 92px before the trim. */
    expect(geometry.masthead.height).toBeLessThanOrEqual(70);

    /* No route links here: below lg the dead space does not exist, and this
       masthead already carries too much. */
    await expect(page.getByTestId("masthead-routes")).toBeHidden();
  });

  test("the homepage links to the essay index at every width", async ({
    page,
  }) => {
    /* The orphaning, asserted as the count it was measured as: zero of 28
       visible links on `/` pointed at `/writing`. */
    for (const width of [375, 1024] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const count = await page
        .locator('main a[href="/writing"]:visible')
        .count();
      expect(count, `${width}px should reach /writing`).toBeGreaterThan(0);
    }
  });
});

test.describe("the theme toggle reports its state", () => {
  test("names the mode and exposes it as a pressed state", async ({ page }) => {
    /* The label was always "Toggle theme" with no `aria-pressed`, so a screen
       reader user could not tell which mode was active — the icon was the only
       indicator. */
    await page.goto("/");
    const toggle = page.getByTestId("theme-toggle");

    const before = {
      label: await toggle.getAttribute("aria-label"),
      pressed: await toggle.getAttribute("aria-pressed"),
    };
    expect(before.pressed).not.toBeNull();

    await toggle.click();

    await expect
      .poll(() => toggle.getAttribute("aria-pressed"))
      .not.toBe(before.pressed);
    /* The name tracks the mode too, so name and state cannot disagree. */
    await expect
      .poll(() => toggle.getAttribute("aria-label"))
      .not.toBe(before.label);
  });
});
