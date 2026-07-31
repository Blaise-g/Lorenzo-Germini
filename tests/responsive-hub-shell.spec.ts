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
    test(`${width}px uses the 220px sticky rail and two-column projects`, async ({
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

      const projectGrid = page.getByTestId("projects-grid");
      const projectColumns = await projectGrid.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      );
      expect(projectColumns).toBe(2);
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

  /* Inverted below 1024: the masthead and the mobile band both state the name
     there — measured at 375, 768 and 1023, the band's heading sits 38px below
     the masthead name's box — so the count is legitimately 2 today and this test
     is green because the expectation fails. #26 removes the band's duplicate;
     the day it lands this goes red and whoever lands it flips it to a plain
     assertion. */
  for (const width of allWidths) {
    test(`${width}px states the name exactly once`, async ({ page }) => {
      test.fail(width < 1024, "duplicate name surface, removed by #26");

      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      expect(await visibleCount(page, "[data-identity-name]")).toBe(1);
    });
  }

  /* The inverted assertion only means something if the count it reads moves, so
     both directions are forced here on a live page: hiding the band's name
     leaves 1, which is what turns the inverted test red once #26 lands, and
     hiding every name surface leaves 0, so a page that stated the name nowhere
     would fail the assertion rather than pass it vacuously. */
  test("the visible name count moves in both directions when forced", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");

    expect(await visibleCount(page, "[data-identity-name]")).toBe(2);

    await page.addStyleTag({
      content: `[data-testid="mobile-identity"] [data-identity-name] {
        display: none !important;
      }`,
    });
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
    const aboutLink = railNav.getByRole("link", { name: "About" });
    await expect(aboutLink).toHaveAttribute("aria-current", "true");

    await page.locator("#work").scrollIntoViewIfNeeded();
    await expect
      .poll(() => railNav.locator('[aria-current="true"]').textContent())
      .toBe("Work");

    /* Polled, not read once: `border-left-color` is a transitioning property, so
       a read in the same tick React swaps the class returns the transition's
       start value — the colour the link is leaving, not the one it is taking. */
    await expect
      .poll(() =>
        railNav.locator('[aria-current="true"]').evaluate((element) => {
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
