import type { Page } from "@playwright/test";

export type Theme = "light" | "dark";

export const themes: Theme[] = ["light", "dark"];

/* Seeded before any document script runs, so the inline theme bootstrap in the
   layout sees the choice on first paint and the page never renders the wrong
   mode first. Call it before `goto`, or follow it with a reload. */
export function setTheme(page: Page, theme: Theme) {
  return page.addInitScript((nextTheme) => {
    localStorage.setItem("theme", nextTheme);
  }, theme);
}
