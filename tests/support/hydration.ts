import { expect, type Locator, type Page } from "@playwright/test";

const ATTACH_BUDGET_MS = 16_000;

/* Anything a client component wires up in an effect — a click handler, a key
   listener, a scroll listener — drops whatever arrives before hydration, and
   nothing redelivers it. One attempt is therefore not enough for any of them.

   `commitBudgetMs` is how long an attempt waits for React to commit before it
   counts as dropped, so it is also the retry interval that matters. A toggling
   trigger needs a budget long enough that a retry cannot undo a commit already
   under way; an idempotent one can be impatient. */
export async function actUntilVisible(
  page: Page,
  target: Locator,
  act: () => Promise<unknown>,
  commitBudgetMs: number,
) {
  await expect
    .poll(
      async () => {
        await act();
        try {
          await target.waitFor({ state: "visible", timeout: commitBudgetMs });
          return true;
        } catch (error) {
          /* Only a timeout means "not there yet". A closed page or a navigation
             would otherwise read as a dropped attempt and retry until the
             budget ran out, reporting the wrong failure. */
          if ((error as Error).name !== "TimeoutError") throw error;
          return false;
        }
      },
      { intervals: [100], timeout: ATTACH_BUDGET_MS },
    )
    .toBe(true);

  return target;
}
