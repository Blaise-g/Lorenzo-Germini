import { expect, type Locator, type Page } from "@playwright/test";

/* One press is not enough: the Ctrl/Cmd+J listener attaches in a client effect,
   so a press that lands before hydration is dropped and nothing redelivers it. */
const COMMIT_BUDGET_MS = 2_000;
const ATTACH_BUDGET_MS = 16_000;

export async function openCommandPalette(page: Page): Promise<Locator> {
  const dialog = page.getByRole("dialog");

  /* Waiting a full commit budget between presses is what makes the retry safe:
     the shortcut toggles, so a check that gave up while React was still
     committing would press again and close what it had just opened. */
  await expect
    .poll(
      async () => {
        await page.keyboard.press("Control+j");
        try {
          await dialog.waitFor({
            state: "visible",
            timeout: COMMIT_BUDGET_MS,
          });
          return true;
        } catch (error) {
          /* Only a timeout means "not open yet". A closed page or a navigation
             would otherwise read as a dropped press and retry until the budget
             ran out, reporting the wrong failure. */
          if ((error as Error).name !== "TimeoutError") throw error;
          return false;
        }
      },
      { intervals: [100], timeout: ATTACH_BUDGET_MS },
    )
    .toBe(true);

  return dialog;
}
