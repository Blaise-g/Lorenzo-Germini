import { expect, type Locator, type Page } from "@playwright/test";

export const COMMAND_MENU_LABEL = "Open command menu";

const COMMIT_BUDGET_MS = 2_000;
const ATTACH_BUDGET_MS = 16_000;

export function commandMenuTrigger(page: Page) {
  return page.getByRole("button", { name: COMMAND_MENU_LABEL });
}

export function commandPaletteInput(dialog: Locator) {
  return dialog.getByPlaceholder("Type a command or search...");
}

/* One attempt is not enough for either trigger: the button's `onClick` and the
   Ctrl/Cmd+J listener both come from the same client component, so anything that
   fires before hydration is dropped and nothing redelivers it.

   Waiting a full commit budget between attempts is what makes the retry safe:
   both triggers toggle, so a check that gave up while React was still
   committing would fire again and close what it had just opened. */
async function openUntilVisible(page: Page, trigger: () => Promise<unknown>) {
  const dialog = page.getByRole("dialog");

  await expect
    .poll(
      async () => {
        await trigger();
        try {
          await dialog.waitFor({
            state: "visible",
            timeout: COMMIT_BUDGET_MS,
          });
          return true;
        } catch (error) {
          /* Only a timeout means "not open yet". A closed page or a navigation
             would otherwise read as a dropped trigger and retry until the budget
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

export function openCommandPalette(page: Page): Promise<Locator> {
  return openUntilVisible(page, () => commandMenuTrigger(page).click());
}

export function openCommandPaletteWithShortcut(page: Page): Promise<Locator> {
  return openUntilVisible(page, () => page.keyboard.press("Control+j"));
}
