import { type Page } from "@playwright/test";

import { actUntilVisible } from "./hydration";

export const BACK_TO_TOP_LABEL = "Back to top";

/** The narrowest viewport that paints the button at all. It is `hidden xl:block`
 *  since #89: below `xl` the hub's `max-w-5xl` measure leaves no margin for it to
 *  sit in, and it used to buy that margin with a 56px right gutter reserved on
 *  every shell inset. Any test that reveals it has to be at least this wide. */
export const BACK_TO_TOP_MIN_WIDTH = 1280;

/* Past the 300px threshold the button watches, with room to spare. */
const REVEAL_OFFSET = 600;

/* Scrolling is idempotent, so a retry that lands mid-commit cannot undo the
   reveal — this can be far more impatient than the palette's toggling triggers. */
const COMMIT_BUDGET_MS = 300;

export function backToTopButton(page: Page) {
  return page.getByRole("button", { name: BACK_TO_TOP_LABEL });
}

export function revealBackToTop(page: Page) {
  return actUntilVisible(
    page,
    backToTopButton(page),
    /* Returning to the top first: `scrollTo` to the offset the page already
       sits at fires no event for the listener to miss or catch. */
    () =>
      page.evaluate((offset) => {
        window.scrollTo(0, 0);
        window.scrollTo(0, offset);
      }, REVEAL_OFFSET),
    COMMIT_BUDGET_MS,
  );
}
