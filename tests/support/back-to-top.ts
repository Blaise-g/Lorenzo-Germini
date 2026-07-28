import { expect, type Page } from "@playwright/test";

const COMMIT_BUDGET_MS = 2_000;
const ATTACH_BUDGET_MS = 16_000;

/* Past the 300px threshold the button watches, with room to spare. */
const REVEAL_OFFSET = 600;

export function backToTopButton(page: Page) {
  return page.getByRole("button", { name: "Back to top" });
}

/* One scroll is not enough: the visibility state comes from a `scroll` listener
   a client component attaches in an effect, so a scroll that lands before
   hydration is dropped and nothing redelivers it — the same race the command
   palette triggers have.

   Each attempt returns to the top first, because `scrollTo` to the offset the
   page is already at fires no event. Unlike the palette triggers this is
   idempotent, so a retry that arrives mid-commit cannot undo the reveal. */
export async function revealBackToTop(page: Page) {
  const button = backToTopButton(page);

  await expect
    .poll(
      async () => {
        await page.evaluate((offset) => {
          window.scrollTo(0, 0);
          window.scrollTo(0, offset);
        }, REVEAL_OFFSET);

        try {
          await button.waitFor({ state: "visible", timeout: COMMIT_BUDGET_MS });
          return true;
        } catch (error) {
          /* Only a timeout means "not revealed yet"; a closed page or a
             navigation has to surface as itself. */
          if ((error as Error).name !== "TimeoutError") throw error;
          return false;
        }
      },
      { intervals: [100], timeout: ATTACH_BUDGET_MS },
    )
    .toBe(true);

  return button;
}
