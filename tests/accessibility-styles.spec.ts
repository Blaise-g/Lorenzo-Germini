import { expect, test, type Locator } from "@playwright/test";

import { contrast } from "./support/color";
import { COMMAND_MENU_LABEL } from "./support/command-palette";
import { setTheme, themes } from "./support/theme";

const focusControls = [
  "Toggle theme",
  "Back to top",
  COMMAND_MENU_LABEL,
] as const;

async function expectVisibleFocus(control: Locator, label: string) {
  await control.focus();
  await expect
    .poll(
      () =>
        control.evaluate((element) => {
          const probe = document.createElement("span");
          probe.style.color = getComputedStyle(
            document.documentElement,
          ).getPropertyValue("--color-accent");
          document.body.append(probe);
          const ringColor = getComputedStyle(probe).color;
          probe.remove();
          return getComputedStyle(element).boxShadow.includes(ringColor);
        }),
      {
        message: `${label} should finish rendering the theme ring color`,
      },
    )
    .toBe(true);

  const metrics = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);

    const normalizeColor = (value: string) => {
      const probe = document.createElement("span");
      probe.style.color = value;
      document.body.append(probe);
      const normalized = getComputedStyle(probe).color;
      probe.remove();
      return normalized;
    };

    const ringColor = normalizeColor(
      rootStyle.getPropertyValue("--color-accent"),
    );
    const ringUtilityColor = normalizeColor(
      style.getPropertyValue("--tw-ring-color"),
    );
    const offsetColor = normalizeColor(
      rootStyle.getPropertyValue("--color-ground"),
    );
    const controlColor = normalizeColor(style.backgroundColor);
    const pageColor = normalizeColor(bodyStyle.backgroundColor);

    return {
      boxShadow: style.boxShadow,
      controlColor,
      focusVisible: element.matches(":focus-visible"),
      offsetColor,
      pageColor,
      ringColor,
      ringUtilityColor,
    };
  });

  const controlOffsetContrast = contrast(
    metrics.controlColor,
    metrics.offsetColor,
  );
  const controlRingContrast = contrast(metrics.controlColor, metrics.ringColor);
  const pageRingContrast = contrast(metrics.pageColor, metrics.ringColor);

  expect(metrics.focusVisible, `${label} should match :focus-visible`).toBe(
    true,
  );
  expect(
    metrics.ringUtilityColor,
    `${label} should own the theme ring utility`,
  ).toBe(metrics.ringColor);
  expect(
    metrics.boxShadow,
    `${label} should render the theme ring color`,
  ).toContain(metrics.ringColor);
  expect(
    pageRingContrast,
    `${label} ring should contrast with the page`,
  ).toBeGreaterThanOrEqual(3);
  expect(
    Math.max(controlRingContrast, controlOffsetContrast),
    `${label} ring or offset should contrast with the control`,
  ).toBeGreaterThanOrEqual(3);
}

test.describe("component-owned border and focus styles", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  for (const theme of themes) {
    test(`${theme} mode honors a representative border-color utility`, async ({
      page,
    }) => {
      await setTheme(page, theme);
      await page.reload();

      const avatar = page.locator(".border-2").first();
      const colors = await avatar.evaluate((element) => {
        const probe = document.createElement("span");
        probe.style.borderColor =
          "color-mix(in oklab, var(--color-accent) 20%, transparent)";
        document.body.append(probe);
        const expected = getComputedStyle(probe).borderColor;
        probe.remove();

        return {
          actual: getComputedStyle(element).borderColor,
          expected,
        };
      });

      expect(colors.actual).toBe(colors.expected);
    });

    test(`${theme} mode gives floating controls a contrasting keyboard focus indicator`, async ({
      page,
    }) => {
      await setTheme(page, theme);
      await page.reload();
      await page.evaluate(() => window.scrollTo(0, 600));
      await expect(
        page.getByRole("button", { name: "Back to top" }),
      ).toBeVisible();

      for (const label of focusControls) {
        await expectVisibleFocus(
          page.getByRole("button", { name: label }),
          label,
        );
      }
    });
  }
});
