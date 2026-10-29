/* The pawn on the `/path` board (v2's board ticket): one arc to the next
   tile, a far jump inside about 1.2 s and the tile's build after it, tiles
   already built staying built, Skip during a hop, reduced motion cutting,
   the tour's settled cue, and the frame sample's verdict. The motion curves
   themselves are `path-scene-contract.spec.ts`'s. */

import { expect, test, type Page } from "@playwright/test";

import { BUILD_MS } from "@/components/path/scene/build-plan";
import { FALLBACK_REASON_LINES } from "@/components/path/scene/fallback";
import { loopSteps, moveDuration } from "@/components/path/scene/motion";
import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";

/* The board draws on this machine's GPU, as `path-scene.spec.ts` explains;
   the frame sample's own verdict is tested below with a faked clock. */
test.use({
  launchOptions: {
    args: [
      "--mute-audio",
      "--use-angle=metal",
      "--enable-gpu",
      "--ignore-gpu-blocklist",
    ],
  },
});

const stage = (page: Page) => page.locator("[data-path-stage]");
const buildControl = (page: Page) => page.locator("[data-path-build-control]");
const stepLink = (page: Page, slug: PathStepSlug) =>
  page.locator(`[data-path-step-link="${slug}"]`);

const index = (slug: PathStepSlug) =>
  PATH_STEPS.findIndex((step) => step.slug === slug);
const propsOf = (slug: PathStepSlug) =>
  PATH_STEPS[index(slug)].props.map((prop) => prop.id);
const moveMs = (from: PathStepSlug, to: PathStepSlug) =>
  moveDuration(loopSteps(index(from), index(to), PATH_STEPS.length));

/** The stage's shown props, sampled on every change from now on, with the
 *  time each set first showed. */
async function watchProps(page: Page) {
  await page.evaluate(() => {
    const log: { at: number; props: string }[] = [];
    (window as unknown as { __props: typeof log }).__props = log;
    const stageElement = document.querySelector("[data-path-stage]")!;
    new MutationObserver(() => {
      log.push({
        at: performance.now(),
        props: stageElement.getAttribute("data-scene-props") ?? "",
      });
    }).observe(stageElement, {
      attributes: true,
      attributeFilter: ["data-scene-props"],
    });
  });
  return page.evaluate(() => performance.now());
}

const propsLog = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __props: { at: number; props: string }[] })
        .__props,
  );

/** Lands on `slug` and settles there at once, with Skip. */
async function settleOn(page: Page, slug: PathStepSlug) {
  await page.goto(`/path#${slug}`);
  await expect(stage(page)).toHaveAttribute("data-build-state", "building");
  await buildControl(page).click();
  await expect(stage(page)).toHaveAttribute("data-build-state", "built");
  await expect(stage(page)).toHaveAttribute("data-scene-step", slug);
}

test.describe("the pawn's move", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  /* Lille to "now" is one tile: one hop, then now's cards fold up in the
     data's order over about 2–3 s. No card of now's shows while the pawn is
     in the air. */
  test("hops to the next tile, then builds it", async ({ page }) => {
    await settleOn(page, "lille");
    const start = await watchProps(page);
    await stepLink(page, "now").click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 6000,
    });

    const log = await propsLog(page);
    const firstOwn = log.find((entry) =>
      entry.props.split(" ").includes(propsOf("now")[0]),
    )!;
    /* The pawn is in the air first: a hop the eye can follow, not a cut. */
    expect(firstOwn.at - start).toBeGreaterThanOrEqual(400);
    /* Each of now's props appears no earlier than the one before it. */
    const appeared = propsOf("now").map(
      (prop) => log.find((entry) => entry.props.split(" ").includes(prop))!.at,
    );
    expect(appeared).toEqual([...appeared].sort((a, b) => a - b));
  });

  /* Lille to Turin is three tiles the short way: the jump lands inside
     about 1.2 s, Turin builds after it, and Lille's tile, already built,
     stays standing throughout. */
  test("a far jump lands inside 1.2 s, and built tiles stay built", async ({
    page,
  }) => {
    expect(moveMs("lille", "turin")).toBeLessThanOrEqual(1200);
    await settleOn(page, "lille");
    const start = await watchProps(page);
    await stepLink(page, "turin").click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 6000,
    });
    await expect(stage(page)).toHaveAttribute("data-scene-step", "turin");
    const took = (await page.evaluate(() => performance.now())) - start;
    expect(took).toBeLessThan(moveMs("lille", "turin") + BUILD_MS + 1000);

    const log = await propsLog(page);
    for (const entry of log) {
      for (const prop of propsOf("lille")) {
        expect(entry.props.split(" "), `${prop} at ${entry.at}`).toContain(
          prop,
        );
      }
    }
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      new RegExp(propsOf("turin").join(" ")),
    );
  });

  test("Skip mid-hop lands the pawn and builds the tile at once", async ({
    page,
  }) => {
    await settleOn(page, "lille");
    await stepLink(page, "turin").click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    await buildControl(page).click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 300,
    });
    await expect(stage(page)).toHaveAttribute("data-scene-step", "turin");
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      new RegExp(propsOf("turin").join(" ")),
    );
  });
});

/* The tour's cue (`stage-status.tsx`): settled once the pawn has landed and
   the tile is built, and at once for reduced motion. */
test.describe("the settled cue", () => {
  test.describe("with motion", () => {
    test.use({ contextOptions: { reducedMotion: "no-preference" } });

    test("waits for the landing and the build", async ({ page }) => {
      await settleOn(page, "lille");
      await expect(stage(page)).toHaveAttribute("data-stage-settled", "");
      await stepLink(page, "now").click();
      await expect(stage(page)).toHaveAttribute("data-build-state", "building");
      await expect(stage(page)).not.toHaveAttribute("data-stage-settled", /.*/);
      await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
        timeout: 6000,
      });
      await expect(stage(page)).toHaveAttribute("data-stage-settled", "");
    });
  });

  test("under reduced motion, is settled as each step shows", async ({
    page,
  }) => {
    const seen: string[] = [];
    await page.exposeFunction("recordState", (state: string) =>
      seen.push(state),
    );
    await page.addInitScript(() => {
      new MutationObserver(() => {
        const stageElement = document.querySelector("[data-path-stage]");
        if (!stageElement) return;
        (window as unknown as { recordState(state: string): void }).recordState(
          `${stageElement.getAttribute("data-build-state")} ${stageElement.hasAttribute("data-stage-settled")}`,
        );
      }).observe(document, {
        subtree: true,
        attributes: true,
        childList: true,
        attributeFilter: ["data-build-state", "data-stage-settled"],
      });
    });
    await page.goto("/path#lille");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect(stage(page)).toHaveAttribute("data-stage-settled", "");
    expect(seen.filter((state) => state.startsWith("building"))).toEqual([]);
  });
});

/* Storyboard §7.4: the median of the first 60 frame times above 33 ms shows
   the stills. The rAF clock is faked so the verdict depends on the frames'
   reported spacing, not on this machine. */
test.describe("the frame sample", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  const fakeFrames = (page: Page, ms: number) =>
    page.addInitScript((spacing) => {
      const native = window.requestAnimationFrame.bind(window);
      let now = 0;
      window.requestAnimationFrame = (callback) =>
        native(() => callback((now += spacing)));
    }, ms);

  test("frames 35 ms apart show the stills, and say why", async ({ page }) => {
    await fakeFrames(page, 35);
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "fallback", {
      timeout: 10_000,
    });
    await expect(stage(page)).toHaveAttribute(
      "data-fallback-reason",
      "slow-frames",
    );
    await expect(page.locator("[data-path-fallback-reason]")).toHaveText(
      FALLBACK_REASON_LINES["slow-frames"],
    );
  });

  test("frames 17 ms apart keep the board through a whole build", async ({
    page,
  }) => {
    await fakeFrames(page, 17);
    await page.goto("/path#home");
    /* BUILD_MS at 17 ms a frame is well over the 60-frame sample. */
    expect(BUILD_MS / 17).toBeGreaterThan(60);
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 10_000,
    });
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "webgl");
    await expect(stage(page)).not.toHaveAttribute("data-fallback-reason", /./);
  });
});
