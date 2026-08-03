import { expect, test, type Locator } from "@playwright/test";

import {
  BACK_TO_TOP_LABEL,
  BACK_TO_TOP_MIN_WIDTH,
  revealBackToTop,
} from "./support/back-to-top";
import { contrast } from "./support/color";
import { setTheme, themes } from "./support/theme";

/* The theme toggle is located by test id rather than by name: its accessible
   name is its state now ("Light mode" / "Dark mode" with `aria-pressed`), so a
   literal label here would assert the mode rather than find the control. */
const focusControls = [
  { testId: "theme-toggle", label: "theme toggle", prepare: async () => {} },
  {
    name: BACK_TO_TOP_LABEL,
    label: BACK_TO_TOP_LABEL,
    /* Revealed immediately before its own focus, not once for the whole list:
       since #89 the theme toggle is a masthead control, and `focus()` scrolls it
       into view — which returns the page to the top and takes `BackToTop` back
       out of the accessibility tree with it. */
    prepare: revealBackToTop,
  },
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

    test(`${theme} mode gives the chrome controls a contrasting keyboard focus indicator`, async ({
      page,
    }) => {
      /* Wide enough to paint `BackToTop`, which is `hidden xl:block` since #89.
         The theme toggle is no longer floating chrome at all — it is a masthead
         control — but the two are still the site's only icon-only buttons, which
         is what makes an invisible focus ring on either unrecoverable. */
      await page.setViewportSize({ width: BACK_TO_TOP_MIN_WIDTH, height: 800 });
      await setTheme(page, theme);
      await page.reload();

      for (const control of focusControls) {
        await control.prepare(page);
        await expectVisibleFocus(
          "testId" in control
            ? page.getByTestId(control.testId)
            : page.getByRole("button", { name: control.name }),
          control.label,
        );
      }
    });
  }
});
