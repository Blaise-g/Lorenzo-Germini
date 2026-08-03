import { expect, type Page } from "@playwright/test";

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

/** The theme toggle, located by test id rather than by name: its accessible name
 *  is its state ("Light mode" / "Dark mode"), so a literal would assert the mode
 *  rather than find the control. */
export function themeToggle(page: Page) {
  return page.getByTestId("theme-toggle");
}

/** Waits until this route's client handlers have committed, and leaves the theme
 *  as it found it. The toggle is the one client component every route carries, so
 *  its `aria-pressed` flipping on click is the cheapest honest proof — needed by
 *  any assertion that something does *not* happen, where an unhydrated page would
 *  otherwise pass for the wrong reason. */
export async function proveHydrated(page: Page) {
  const toggle = themeToggle(page);
  const before = await toggle.getAttribute("aria-pressed");

  await toggle.click();
  await expect.poll(() => toggle.getAttribute("aria-pressed")).not.toBe(before);

  await toggle.click();
  await expect.poll(() => toggle.getAttribute("aria-pressed")).toBe(before);
}
