import { expect, test, type Locator, type Page } from "@playwright/test";

import { RESUME_DATA } from "@/data/resume-data";

import {
  BACK_TO_TOP_MIN_WIDTH,
  BACK_TO_TOP_SELECTOR,
  backToTopButton,
  backToTopClearance,
  fixedControls,
  revealBackToTop,
} from "./support/back-to-top";
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

  /* Decision 2's bottom-right cluster, now that #89 left one control in it:
     `BackToTop` positions itself, and the assertion is that it is still the
     only thing fixed to the bottom-right corner — a second control landing
     there unpositioned would stack on top of it rather than beside it. */
  test("back to top is the only fixed bottom-right control", async ({
    page,
  }) => {
    await page.setViewportSize({ width: BACK_TO_TOP_MIN_WIDTH, height: 800 });
    await page.goto("/");
    await revealBackToTop(page);

    /* Polled on the button's own opacity, not on the sweep: the reveal
       transitions through `translate-y-2 scale-95`, so a corner read taken the
       moment it becomes visible catches it 7px short of its resting place — but
       polling the sweep itself would re-resolve styles for every link in `main`
       every 100ms to wait out one transition. */
    await expect(backToTopButton(page)).toHaveCSS("opacity", "1");

    expect(await fixedControls(page)).toEqual([
      { label: "Back to top", rightGap: 16, bottomGap: 16 },
    ]);
  });

  /* "In the margin" is the whole condition it survives on since #89: below `xl`
     there is no margin at the hub's `max-w-5xl` measure, and the button is not
     painted there rather than reserving a gutter to sit in. */
  test("desktop keeps Back to top available in the margin", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/");
    await revealBackToTop(page);

    /* The margin at 1440 is 208px of empty space, so "available" means it is
       reachable without covering the measure the reader is in. */
    await expect(backToTopButton(page)).toBeVisible();
    expect(await backToTopClearance(page, "body-inset")).toBeGreaterThan(0);
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

    test(`${width}px keeps the masthead box within 70px`, async ({ page }) => {
      /* Neither the route links nor the theme toggle may buy horizontal use of
         the masthead with vertical growth. The ceiling was 84px while the toggle
         was fixed overhead and this box had to clear it; measured after #89 put
         the toggle inside the row, it is 70px. */
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      const box = await page.getByTestId("masthead-rule").boundingBox();
      expect(box!.height).toBeLessThanOrEqual(70);
    });
  }

  test("375 reclaims the chrome the old padding held", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const geometry = await page.evaluate(() => {
      const rect = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect();
      return {
        masthead: rect('[data-testid="masthead-rule"]'),
        name: rect('[data-testid="masthead-name"]'),
        toggle: rect('[data-testid="theme-toggle"]'),
      };
    });

    /* The toggle is inside the box now, so it can no longer set the box's
       floor from outside it — the padding only has to seat the control. 92px
       before #26 trimmed it, 66px while the toggle was fixed overhead. */
    expect(geometry.masthead.height).toBeLessThanOrEqual(62);
    /* Still true, and now because they are siblings in one row rather than
       because a reserved gutter kept them apart. */
    expect(geometry.name.right).toBeLessThan(geometry.toggle.left);
    expect(geometry.toggle.bottom).toBeLessThan(geometry.masthead.bottom);

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

/* #89 removed the palette and its floating button, and moved the theme toggle
   from a fixed top-right slot into the surface that owns each route's controls.
   Three things have to hold afterwards, and each was broken by the fixed
   placement it replaces: the control is in flow, its 44px hit area does not
   steal its neighbours', and no shell reserves a gutter for chrome that is no
   longer overhead. */
test.describe("the theme toggle rides in the page's own chrome", () => {
  const routes = ["/", "/writing", "/cv"] as const;

  for (const route of routes) {
    for (const width of [375, 768, 1024, 1440] as const) {
      /* One navigation per route × width, asserting both halves of the same
         placement: the control is in flow with its own 44px hit area, and no
         inset reserves a gutter for the fixed chrome it used to be. Split across
         two tests these paid for two page loads to read two independent
         measurements off one layout. */
      test(`${route} at ${width}px puts the toggle in flow and reserves no gutter`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 812 });
        await page.goto(route);

        const toggle = await page
          .getByTestId("theme-toggle")
          .evaluate((element) => {
            const rect = element.getBoundingClientRect();
            const after = getComputedStyle(element, "::after");
            /* Sampled at the hit area's own corners, not the box's: the box is
               36px and `touch-target` supplies the rest, so a hit area that
               failed to render would still pass a box-only check. */
            const hitArea = {
              left: rect.left + rect.width / 2 - 22,
              right: rect.left + rect.width / 2 + 22,
              top: rect.top + rect.height / 2 - 22,
              bottom: rect.top + rect.height / 2 + 22,
            };
            const corners = [
              [hitArea.left + 1, hitArea.top + 1],
              [hitArea.right - 1, hitArea.top + 1],
              [hitArea.left + 1, hitArea.bottom - 1],
              [hitArea.right - 1, hitArea.bottom - 1],
            ] as const;

            return {
              position: getComputedStyle(element).position,
              hitWidth: after.width,
              hitHeight: after.height,
              /* `document.elementFromPoint` returns the toggle for a point over
                 its own pseudo-element, so anything else here is a control whose
                 target the toggle overlaps. */
              cornersHittingSomethingElse: corners.flatMap(([x, y]) => {
                const target = document
                  .elementFromPoint(x, y)
                  ?.closest("a, button");
                if (!target || target === element) return [];
                return [
                  target.getAttribute("aria-label") ||
                    target.textContent?.trim().slice(0, 24) ||
                    target.tagName,
                ];
              }),
            };
          });

        expect(toggle.position).not.toBe("fixed");
        expect(toggle.hitWidth).toBe("44px");
        expect(toggle.hitHeight).toBe("44px");
        expect(toggle.cornersHittingSomethingElse).toEqual([]);

        /* The toggle is not merely unpositioned but outside every fixed
           container: `BackToTop` is the only control allowed to be in one. */
        expect(
          (await fixedControls(page)).map(({ label }) => label),
        ).not.toContain("Light mode");

        /* The exclusion zone was `pr-20` against `px-6`, so an asymmetry of 56px
           is the exact defect. Read off every box that takes a shell inset,
           because the reservation was duplicated into three of them. */
        const asymmetric = await page.evaluate(() => {
          const boxes = document.querySelectorAll<HTMLElement>(
            '[data-testid="masthead-inset"], [data-testid="body-inset"], [data-cv-document], main header',
          );
          return Array.from(boxes).flatMap((box) => {
            const style = getComputedStyle(box);
            const left = Number.parseFloat(style.paddingLeft);
            const right = Number.parseFloat(style.paddingRight);
            if (Math.abs(left - right) < 1) return [];
            return [{ left, right, testId: box.dataset.testid ?? box.tagName }];
          });
        });

        expect(asymmetric).toEqual([]);
      });
    }
  }

  /* The toggle is a route's last masthead control at every width, so it is also
     where a keyboard user arrives after the nav — the order the eye reads on a
     row that now holds both. */
  test("follows the masthead links in focus order", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 812 });
    await page.goto("/");
    await removeDevOverlay(page);

    const focused = async () =>
      page.evaluate(() => {
        const active = document.activeElement;
        return (
          active?.getAttribute("data-testid") ||
          active?.textContent?.trim().slice(0, 24) ||
          active?.tagName ||
          null
        );
      });

    await page.getByTestId("masthead-routes").getByText("Writing").focus();
    expect(await focused()).toBe("Writing");
    await page.keyboard.press("Tab");
    expect(await focused()).toBe("CV");
    await page.keyboard.press("Tab");
    expect(await focused()).toBe("theme-toggle");
  });

  /* Below `lg` the masthead carries no route links, so the toggle is the first
     thing in it — and the widths where the row is tightest are the ones where a
     control landing out of order is least recoverable. */
  for (const width of [375, 768] as const) {
    test(`${width}px reaches the toggle as the masthead's first stop`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto("/");
      await removeDevOverlay(page);

      /* From the document start, so this measures the tab order a reader
         actually walks rather than one seeded by a `focus()` call. The skip link
         is the site's first stop on every route. */
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: /skip/i })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByTestId("theme-toggle")).toBeFocused();
    });
  }
});

test.describe("back to top is painted only where there is margin", () => {
  /* `BACK_TO_TOP_MIN_WIDTH - 1` is the one that holds the constant to the `xl:`
     class beside it: move either without the other and this pair fails. */
  for (const width of [375, 768, 1024, BACK_TO_TOP_MIN_WIDTH - 1] as const) {
    test(`${width}px paints no floating control`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.evaluate(() => window.scrollTo(0, 900));

      /* Attribute, not role: hidden it leaves the accessibility tree, so a role
         query would pass on a button that was painted but unnamed. */
      await expect(page.locator(BACK_TO_TOP_SELECTOR)).toBeHidden();
    });
  }

  test(`${BACK_TO_TOP_MIN_WIDTH}px paints it clear of the measure`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: BACK_TO_TOP_MIN_WIDTH, height: 800 });
    await page.goto("/");
    await revealBackToTop(page);

    /* The gate is `xl`, not `lg`, because this is what fails at 1024: the hub's
       measure is `max-w-5xl` — 1024px — so the button would land on the body
       text rather than beside it. */
    expect(await backToTopClearance(page, "body-inset")).toBeGreaterThan(0);
  });
});
