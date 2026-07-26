import { expect, test, type Locator, type Page } from "@playwright/test";

type Theme = "light" | "dark";

const themes: Theme[] = ["light", "dark"];
const focusControls = [
  "Toggle theme",
  "Back to top",
  "Open command menu",
] as const;

function setTheme(page: Page, theme: Theme) {
  return page.evaluate((nextTheme) => {
    localStorage.setItem("theme", nextTheme);
  }, theme);
}

async function expectVisibleFocus(control: Locator, label: string) {
  await control.focus();
  await expect
    .poll(
      () =>
        control.evaluate((element) => {
          const probe = document.createElement("span");
          probe.style.color = getComputedStyle(
            document.documentElement,
          ).getPropertyValue("--color-ring");
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

    const channels = (value: string) => {
      const matches = normalizeColor(value).match(/[\d.]+/g);
      if (!matches || matches.length < 3) {
        throw new Error(`Unable to parse color: ${value}`);
      }
      return matches.slice(0, 3).map(Number);
    };

    const luminance = (value: string) => {
      const linear = channels(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };

    const contrast = (first: string, second: string) => {
      const firstLuminance = luminance(first);
      const secondLuminance = luminance(second);
      const lighter = Math.max(firstLuminance, secondLuminance);
      const darker = Math.min(firstLuminance, secondLuminance);
      return (lighter + 0.05) / (darker + 0.05);
    };

    const ringColor = normalizeColor(
      rootStyle.getPropertyValue("--color-ring"),
    );
    const ringUtilityColor = normalizeColor(
      style.getPropertyValue("--tw-ring-color"),
    );
    const offsetColor = normalizeColor(
      rootStyle.getPropertyValue("--color-background"),
    );
    const controlColor = normalizeColor(style.backgroundColor);
    const pageColor = normalizeColor(bodyStyle.backgroundColor);

    return {
      boxShadow: style.boxShadow,
      controlOffsetContrast: contrast(controlColor, offsetColor),
      controlRingContrast: contrast(controlColor, ringColor),
      focusVisible: element.matches(":focus-visible"),
      pageRingContrast: contrast(pageColor, ringColor),
      ringColor,
      ringUtilityColor,
    };
  });

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
    metrics.pageRingContrast,
    `${label} ring should contrast with the page`,
  ).toBeGreaterThanOrEqual(3);
  expect(
    Math.max(metrics.controlRingContrast, metrics.controlOffsetContrast),
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
          "color-mix(in oklab, var(--color-primary) 20%, transparent)";
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
