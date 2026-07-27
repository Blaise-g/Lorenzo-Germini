import { expect, type Locator, type Page } from "@playwright/test";

/* The Ctrl/Cmd+J listener attaches in a client effect, so a press that lands
   before hydration is dropped with nothing to retry it — the source of the
   1-in-6 timeout on the dialog in #38. Press, wait a bounded moment, press
   again if nothing opened.

   The bounded wait is load-bearing, not politeness: the shortcut toggles, so a
   check that gave up before React committed the open state would press again
   and close it, and the poll would flip-flop instead of converging. */
export function openCommandPalette(page: Page): Promise<Locator> {
  const dialog = page.getByRole("dialog");

  return expect
    .poll(async () => {
      await page.keyboard.press("Control+j");
      return dialog
        .waitFor({ state: "visible", timeout: 2_000 })
        .then(() => true)
        .catch(() => false);
    })
    .toBe(true)
    .then(() => dialog);
}
