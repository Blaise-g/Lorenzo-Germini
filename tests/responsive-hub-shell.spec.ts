import { expect, test, type Page } from "@playwright/test";

import { revealBackToTop } from "./support/back-to-top";
import { commandMenuTrigger } from "./support/command-palette";
import { removeDevOverlay } from "./support/dev-overlay";

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
