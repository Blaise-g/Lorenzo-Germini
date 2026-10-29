/* Helpers the `/path` specs share: the stage's states they wait on, the
   draw counter and the paused clock they drive the board with. */

import { expect, type Page } from "@playwright/test";

import { buildPlan } from "@/components/path/scene/build-plan";
import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";

export const stepNamed = (slug: PathStepSlug) =>
  PATH_STEPS.find((step) => step.slug === slug)!;

/** Every prop on the board up to and including `slug`'s, in the data's
 *  order: what stands once the pawn has reached its tile. */
export function propsThrough(slug: PathStepSlug) {
  const plan = buildPlan(stepNamed(slug));
  return [...plan.standing, ...plan.building.map((prop) => prop.id)].join(" ");
}

/** The piece mounts on hydration, so waiting for it waits for the handlers. */
export async function hydrated(page: Page) {
  await expect(page.locator("[data-path-piece]")).toHaveCount(1);
}

/** The steps the overlay ticks as seen, in its order. */
export async function seenSlugs(page: Page) {
  return page
    .locator("[data-path-seen] [data-path-step-link]")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("data-path-step-link")),
    );
}

/** Waits for every landmark the index lists to have arrived, or failed.
 *  The board loads all but the first step's once it is up, when the page
 *  is idle, and each that lands on a tile in view draws its arrival. */
export async function landmarksSettled(page: Page) {
  await expect(page.locator("[data-path-stage] canvas")).toHaveAttribute(
    "data-path-landmarks",
    "settled",
    /* A state, waited on for as long as the test may run: on a starved
       machine the files take what they take. */
    { timeout: 0 },
  );
}

/** Counts draw calls at the GL context, in `window.__draws`. */
export async function countDraws(page: Page) {
  await page.addInitScript(() => {
    const counts = { draws: 0 };
    (window as unknown as { __draws: typeof counts }).__draws = counts;
    const proto = WebGL2RenderingContext.prototype;
    for (const name of [
      "drawElements",
      "drawArrays",
      "drawElementsInstanced",
      "drawArraysInstanced",
    ] as const) {
      const original = proto[name] as (...args: unknown[]) => void;
      (proto as unknown as Record<string, unknown>)[name] = function (
        this: WebGL2RenderingContext,
        ...args: unknown[]
      ) {
        counts.draws += 1;
        return original.apply(this, args);
      };
    }
  });
}

/** Draw calls so far, as `countDraws` counts them. */
export const draws = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __draws: { draws: number } }).__draws.draws,
  );

/** Fake time, paused: frames and the tour's timers run only when the test
 *  runs the clock, so a slow first compile in dev cannot play a step
 *  through before the test acts. */
export async function pauseTime(page: Page) {
  const start = new Date("2026-10-29T09:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
}
