/* The pawn on the `/path` board (v2's board ticket): one arc to the next
   tile, a far jump inside the skip flight and the tile's build after it, tiles
   already built staying built, Skip during a hop, reduced motion cutting,
   the tour's settled cue, and the frame sample's verdict. The motion curves
   themselves are `path-scene-contract.spec.ts`'s. */

import { expect, test, type Page } from "@playwright/test";

import { FALLBACK_REASON_LINES } from "@/components/path/scene/fallback";
import { loopSteps } from "@/components/path/scene/motion";
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

  /* Lille to "now" is one tile: one hop, then now's pieces rise in the
     data's order over about 2–3 s. No piece of now's shows while the pawn
     is in the air. */
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

  /* Home to step 4 is three tiles forward, a pick: the skip flight's one
     long hop lands inside its 1.4 s (a 0.3 s hold and a 1.1 s flight, the
     benchmark's §4(a)), so step 4's first piece starts to rise before the
     flight settles, and home's tile, already built, stays standing
     throughout. Timed against the settle rather than the clock: both run
     from the same frames, so a loaded machine slows them alike. */
  test("a far jump lands inside the skip flight, and built tiles stay built", async ({
    page,
  }) => {
    expect(
      Math.abs(
        loopSteps(index("home"), index("cuneo-2022"), PATH_STEPS.length),
      ),
    ).toBe(3);
    await settleOn(page, "home");
    const start = await watchProps(page);
    /* When the stage, unsettled by the click, settles again. */
    const settled = page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const element = document.querySelector("[data-path-stage]")!;
          let left = false;
          new MutationObserver(() => {
            if (!element.hasAttribute("data-stage-settled")) left = true;
            else if (left) resolve(performance.now());
          }).observe(element, {
            attributes: true,
            attributeFilter: ["data-stage-settled"],
          });
        }),
    );
    await stepLink(page, "cuneo-2022").click();
    /* Home's own "built" holds until the click lands: wait for the step. */
    await expect(stage(page)).toHaveAttribute("data-scene-step", "cuneo-2022");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 6000,
    });

    const log = await propsLog(page);
    const landed = log.find((entry) =>
      entry.props.split(" ").includes(propsOf("cuneo-2022")[0]),
    )!;
    /* The pawn is in the air first, and down before the flight ends. */
    expect(landed.at - start).toBeGreaterThanOrEqual(400);
    expect(landed.at).toBeLessThan(await settled);
    for (const entry of log) {
      for (const prop of propsOf("home")) {
        expect(entry.props.split(" "), `${prop} at ${entry.at}`).toContain(
          prop,
        );
      }
    }
  });

  /* A tile being built again, cut short by another selection, keeps
     standing: Replay on "now", then straight back to Lille. */
  test("a rebuild cut short leaves its tile standing", async ({ page }) => {
    await settleOn(page, "lille");
    await stepLink(page, "now").click();
    await expect(stage(page)).toHaveAttribute("data-scene-step", "now");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 6000,
    });
    await buildControl(page).click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    await stepLink(page, "lille").click();
    await expect(stage(page)).toHaveAttribute("data-scene-step", "lille");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 6000,
    });
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      new RegExp(propsOf("now").join(" ")),
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

/* The tour's cue (`stage-status.tsx`): settled once the camera has landed
   on the close-up, its push-in done, with the tile's build rising on into
   the dwell (v3); at once for reduced motion. */
test.describe("the settled cue", () => {
  test.describe("with motion", () => {
    test.use({ contextOptions: { reducedMotion: "no-preference" } });

    test("waits for the camera to land on the close-up", async ({ page }) => {
      await settleOn(page, "lille");
      await expect(stage(page)).toHaveAttribute("data-stage-settled", "");
      await stepLink(page, "now").click();
      await expect(stage(page)).toHaveAttribute("data-build-state", "building");
      await expect(stage(page)).not.toHaveAttribute("data-stage-settled", /.*/);
      await expect(stage(page)).toHaveAttribute("data-stage-settled", "", {
        timeout: 6000,
      });
      await expect(stage(page)).toHaveAttribute("data-camera-shot", "close-up");
      await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
        timeout: 6000,
      });
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
    /* Stills are settled at once, with motion on: the tour need not wait. */
    await expect(stage(page)).toHaveAttribute("data-stage-settled", "");
  });

  test("frames 17 ms apart keep the board through a whole build", async ({
    page,
  }) => {
    await fakeFrames(page, 17);
    await page.goto("/path#home");
    /* A 2.4 s build at 17 ms a frame is about 140 frames: the sample of 60
       fills during it. */
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 10_000,
    });
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "webgl");
    await expect(stage(page)).not.toHaveAttribute("data-fallback-reason", /./);
  });
});
