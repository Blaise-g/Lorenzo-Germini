/* The door to `/path` (GH-151): off by default, and with the switch on a link
   that names whether the visitor has entered and carries the current step.
   The switched-on state is reached through the dev-only preview key, since
   the switch itself is a code constant. */

import { expect, test, type Page } from "@playwright/test";

import { PATH_DOOR_PREVIEW_STORAGE_KEY } from "@/components/flat-site/path-door";
import { ENTERED_STORAGE_KEY } from "@/lib/path-state";

async function openDoor(page: Page, entered = false) {
  await page.addInitScript(
    ({ previewKey, enteredKey, isEntered }) => {
      window.localStorage.setItem(previewKey, "1");
      if (isEntered) window.localStorage.setItem(enteredKey, "1");
    },
    {
      previewKey: PATH_DOOR_PREVIEW_STORAGE_KEY,
      enteredKey: ENTERED_STORAGE_KEY,
      isEntered: entered,
    },
  );
}

test("with the switch off, / renders no door", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("masthead-name")).toBeVisible();
  await expect(page.getByTestId("path-door")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /the path/i })).toHaveCount(0);
});

test("the door invites a first visit to a bare /path, whose tour starts from home", async ({
  page,
}) => {
  await openDoor(page);
  await page.goto("/");
  const door = page.getByTestId("path-door");
  await expect(door).toHaveText("Walk the path in 3D");
  await expect(door).toHaveAttribute("href", "/path");
  await expect(page.locator("header").getByTestId("path-door")).toBeVisible();
});

test("the door reads Continue once the visitor has entered", async ({
  page,
}) => {
  await openDoor(page, true);
  await page.goto("/");
  await expect(page.getByTestId("path-door")).toHaveText("Continue the path");
});

test("the door carries the current step across", async ({ page }) => {
  await openDoor(page);
  await page.goto("/#lille");
  const door = page.getByTestId("path-door");
  await expect(door).toHaveAttribute("href", "/path#lille");
  /* The default step named outright is carried too. */
  await page.evaluate(() => {
    window.location.hash = "now";
  });
  await expect(door).toHaveAttribute("href", "/path#now");
  await page.evaluate(() => {
    window.location.hash = "cuneo-2022";
  });
  await expect(door).toHaveAttribute("href", "/path#cuneo-2022");
  /* A fragment naming no step keeps the last one, as \`/\` does. */
  await page.evaluate(() => {
    window.location.hash = "%";
  });
  await expect(door).toHaveAttribute("href", "/path#cuneo-2022");
});

test("nothing opens /path without a click", async ({ page }) => {
  await openDoor(page, true);
  await page.goto("/#lille");
  await expect(page.getByTestId("path-door")).toBeVisible();
  /* Past hydration and the fade-in: a client redirect would have fired by
     now. A sleep is the only way to observe an absence of navigation. */
  await page.waitForTimeout(1500);
  expect(new URL(page.url()).pathname).toBe("/");
  await page.getByTestId("path-door").click();
  await expect(page).toHaveURL(/\/path#lille$/);
});
