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

/** Attribute form, for the states the role query cannot reach: hidden, the button
 *  is `aria-hidden` and leaves the accessibility tree, so `getByRole` finds
 *  nothing whether it is painted or not. */
export const BACK_TO_TOP_SELECTOR = `button[aria-label="${BACK_TO_TOP_LABEL}"]`;

/** Every control fixed to the viewport, with the gap from each corner it is
 *  pinned to. One sweep rather than a per-control lookup, because since #89 the
 *  assertion is about the whole set: `BackToTop` is meant to be alone in it. */
export function fixedControls(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("main button, main a"))
      .filter((element) => {
        let current: HTMLElement | null = element;
        while (current) {
          if (getComputedStyle(current).position === "fixed") return true;
          current = current.parentElement;
        }
        return false;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: element.getAttribute("aria-label"),
          rightGap: Math.round(innerWidth - rect.right),
          bottomGap: Math.round(innerHeight - rect.bottom),
        };
      }),
  );
}

/** Horizontal distance from the button to the right edge of the reading measure.
 *  Positive is the whole condition the button survives on since #89 — it is
 *  painted only where there is margin to sit in, rather than reserving one. */
export function backToTopClearance(page: Page, measureTestId: string) {
  return page.evaluate(
    ([selector, testId]) => {
      const button = document.querySelector(selector)!.getBoundingClientRect();
      const measure = document
        .querySelector(`[data-testid="${testId}"]`)!
        .getBoundingClientRect();
      return Math.round(button.left - measure.right);
    },
    [BACK_TO_TOP_SELECTOR, measureTestId] as const,
  );
}

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
