import { type Locator, type Page } from "@playwright/test";

import { actUntilVisible } from "./hydration";

export const COMMAND_MENU_LABEL = "Open command menu";

/* Both triggers toggle, so a check that gave up while React was still
   committing would fire again and close what it had just opened. */
const COMMIT_BUDGET_MS = 2_000;

export function commandMenuTrigger(page: Page) {
  return page.getByRole("button", { name: COMMAND_MENU_LABEL });
}

export function commandPaletteInput(dialog: Locator) {
  return dialog.getByPlaceholder("Type a command or search...");
}

/* The button's `onClick` and the Ctrl/Cmd+J listener both come from the same
   client component, so either can arrive before hydration and be dropped. */
function openUntilVisible(page: Page, trigger: () => Promise<unknown>) {
  return actUntilVisible(
    page,
    page.getByRole("dialog"),
    trigger,
    COMMIT_BUDGET_MS,
  );
}

export function openCommandPalette(page: Page): Promise<Locator> {
  return openUntilVisible(page, () => commandMenuTrigger(page).click());
}

export function openCommandPaletteWithShortcut(page: Page): Promise<Locator> {
  return openUntilVisible(page, () => page.keyboard.press("Control+j"));
}
