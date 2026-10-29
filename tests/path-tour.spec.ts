/* The tour on `/path` (v2, comp B): the board plays itself step by step from
   home, or from the fragment's step, and stops at "?"; picking a step skips
   there like a tape; the tour's own steps replace the history entry while a
   pick pushes; it pauses on one click, the K key and a hidden tab, and never
   plays under reduced motion. A step dwells for its narration and a beat,
   and the caption line runs on the narration's cue timings (v3). The timing
   is `src/app/path/tour-clock.ts`, tested directly first. The page tests
   install Playwright's clock so a dwell is skipped, not waited out. */

import { expect, test, type Page } from "@playwright/test";

import { narrationFor } from "@/app/path/narration";
import {
  dwellMs,
  elapseClock,
  NARRATION_BEAT_MS,
  playheadMs,
  SETTLE_MAX_WAIT_MS,
  settleClock,
  startClock,
  stepAfter,
  stepBefore,
  timingReducer,
  type Timing,
  type TimingAction,
} from "@/app/path/tour-clock";
import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";

import { hydrated, pauseTime } from "./support/path-stage";

/* The board draws on this machine's GPU, as `path-scene.spec.ts` explains;
   the tests that only need the tour's timing show the stills instead
   (`stillsStage`), where the stage settles every step at once. */
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

const tourPhase = (page: Page) =>
  page.locator("[data-path-tour]").getAttribute("data-path-tour-phase");

/** Plays a step through on a stage that has settled it: straight to the
 *  dwell, then the dwell. `short` stops that much before its end. */
async function playThrough(page: Page, slug: PathStepSlug, short = 0) {
  await expect.poll(() => tourPhase(page)).toBe("dwelling");
  await page.clock.runFor(dwellMs(slug) - short);
}

/** Plays a step through on a stage that never settles it: the whole wait,
 *  then the dwell. In two runs of the clock, because the dwell's timer is
 *  set when React commits the end of the wait, which fake time cannot do by
 *  itself. */
async function waitThenPlayThrough(page: Page, slug: PathStepSlug) {
  await expect.poll(() => tourPhase(page)).toBe("waiting");
  await page.clock.runFor(SETTLE_MAX_WAIT_MS);
  await expect.poll(() => tourPhase(page)).toBe("dwelling");
  await page.clock.runFor(dwellMs(slug));
}

/** Runs the clock past a whole step, wait and dwell, pausing between them as
 *  `waitThenPlayThrough` does, but asserting nothing: for a tour that should
 *  not move. */
async function runPastStep(page: Page, slug: PathStepSlug) {
  await page.clock.runFor(SETTLE_MAX_WAIT_MS + 100);
  await page.waitForTimeout(200);
  await page.clock.runFor(dwellMs(slug) + 100);
  await page.waitForTimeout(200);
}

/** The stage shows its stills — WebGL refused — so it reports every step
 *  settled as soon as it shows it, and the tour's timing is the dwell's
 *  alone. */
async function stillsStage(page: Page) {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
}

const tour = (page: Page) => page.locator("[data-path-tour]");
const playTab = (page: Page) => page.locator("[data-path-tour-play]");
const previousTab = (page: Page) => page.locator("[data-path-tour-previous]");
const nextTab = (page: Page) => page.locator("[data-path-tour-next]");
const stepLink = (page: Page, slug: PathStepSlug) =>
  page.locator(`[data-path-step-link="${slug}"]`);
const overlay = (page: Page) => page.locator("[data-path-overlay]");

async function expectShown(page: Page, slug: PathStepSlug) {
  await expect(page).toHaveURL(new RegExp(`/path#${slug}$`));
  await expect(overlay(page)).toHaveAttribute("data-path-shown", slug);
}

const historyLength = (page: Page) => page.evaluate(() => history.length);

test.describe("the clock", () => {
  test("the dwell is the step's narration plus a beat, voice or no voice", () => {
    for (const step of PATH_STEPS) {
      const { durationMs } = narrationFor(step.slug);
      expect(dwellMs(step.slug), step.slug).toBe(
        durationMs + NARRATION_BEAT_MS,
      );
    }
    /* A longer narration dwells longer: Lille says more than Turin. */
    expect(dwellMs("lille")).toBeGreaterThan(dwellMs("turin"));
  });

  test("the playhead is nothing while waiting, the dwell's elapsed time after", () => {
    const waiting = startClock(10_000, 6000);
    expect(playheadMs(waiting)).toBe(0);
    expect(playheadMs(elapseClock(waiting, 2000))).toBe(0);

    const dwelling = elapseClock(settleClock(waiting), 3000);
    expect(playheadMs(dwelling)).toBe(3000);
    /* Time the timer has not yet reported counts, up to the dwell's end. */
    expect(playheadMs(dwelling, 500)).toBe(3500);
    expect(playheadMs(dwelling, 60_000)).toBe(10_000);
    expect(playheadMs(elapseClock(dwelling, 7000))).toBe(10_000);
  });

  test("settled starts the dwell early, and only once", () => {
    const waiting = startClock(8000, 6000);
    expect(waiting).toEqual({ phase: "waiting", remaining: 6000, dwell: 8000 });

    const settled = settleClock(elapseClock(waiting, 1000));
    expect(settled).toEqual({
      phase: "dwelling",
      remaining: 8000,
      dwell: 8000,
    });

    /* A second report, or one after the wait ran out, restarts nothing. */
    const later = elapseClock(settled, 3000);
    expect(settleClock(later)).toBe(later);
    const timedOut = elapseClock(waiting, 6000);
    expect(timedOut.phase).toBe("dwelling");
    expect(settleClock(elapseClock(timedOut, 2000)).remaining).toBe(6000);
  });

  test("the wait runs out into the dwell, and the dwell into done", () => {
    const clock = startClock(5000, 6000);
    /* A late timer's overshoot is taken from the dwell, not added to it. */
    expect(elapseClock(clock, 6500)).toEqual({
      phase: "dwelling",
      remaining: 4500,
      dwell: 5000,
    });
    expect(elapseClock(clock, 11_000).phase).toBe("done");
    expect(elapseClock(clock, 10_999).phase).toBe("dwelling");
    /* Elapsing in parts — a pause between them — lands in the same place. */
    expect(
      elapseClock(elapseClock(elapseClock(clock, 4000), 4000), 3000),
    ).toEqual(elapseClock(clock, 11_000));
    const done = elapseClock(clock, 20_000);
    expect(elapseClock(done, 1000)).toBe(done);
  });

  /* React can replay queued actions over an earlier state: a step that a
     `replaceStep` from an effect renders at once, ahead of the last step's
     timer update. Whatever the order, the new step gets a new clock, never
     the last step's finished one. */
  test("the timing pairs every step with its own clock, however its actions replay", () => {
    const dwelling = settleClock(startClock(5000, 6000));
    const home: Timing = { slug: "home", clock: dwelling };
    const finished = timingReducer(home, {
      type: "elapse",
      from: dwelling,
      ms: 5000,
    });
    expect(finished.clock.phase).toBe("done");

    const late: TimingAction = { type: "elapse", from: dwelling, ms: 5000 };
    const start: TimingAction = { type: "start", slug: "turin", dwell: 5935 };
    const settle: TimingAction = { type: "settle", slug: "turin" };
    for (const order of [
      [late, start, settle],
      [start, late, settle],
      [start, settle, late],
    ]) {
      const timing = order.reduce(timingReducer, finished);
      expect(timing).toEqual({
        slug: "turin",
        clock: { phase: "dwelling", remaining: 5935, dwell: 5935 },
      });
    }
    /* A settle for another step, or a second start, changes nothing. */
    const turin = timingReducer(finished, start);
    expect(timingReducer(turin, { type: "settle", slug: "lille" })).toBe(turin);
    expect(timingReducer(turin, start)).toBe(turin);
  });

  test("the steps run in the data's order, home to ?, without wrapping", () => {
    const order: PathStepSlug[] = [];
    for (let slug: PathStepSlug | null = "home"; slug; slug = stepAfter(slug)) {
      order.push(slug);
    }
    expect(order).toEqual(PATH_STEPS.map((step) => step.slug));
    expect(stepAfter("next")).toBeNull();
    expect(stepBefore("home")).toBeNull();
    expect(stepBefore("turin")).toBe("home");
  });
});

test.describe("with motion allowed", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test.beforeEach(async ({ page }) => {
    await stillsStage(page);
    await pauseTime(page);
  });

  test("a bare /path plays from home, replacing history as it moves on", async ({
    page,
  }) => {
    await page.goto("/path");
    /* Home from the first paint: the inline script put it there. */
    await expectShown(page, "home");
    await hydrated(page);
    await expect(tour(page)).toHaveAttribute("data-path-tour", "playing");
    const length = await historyLength(page);

    await playThrough(page, "home", 500);
    await expectShown(page, "home");
    await page.clock.runFor(1000);
    await expectShown(page, "turin");
    await expect(page.locator("[data-path-tour-announcement]")).toHaveText(
      "Now playing: Turin",
    );
    await playThrough(page, "turin");
    await expectShown(page, "switzerland");

    /* The auto-steps replaced the entry: none was pushed. */
    expect(await historyLength(page)).toBe(length);
    /* And each step it played has its tick. */
    for (const slug of ["home", "turin"] as const) {
      await expect(
        page.locator(`li[data-path-seen] [data-path-step-link="${slug}"]`),
      ).toHaveCount(1);
    }
  });

  test("a fragment plays from its step and ends at ?, without looping", async ({
    page,
  }) => {
    await page.goto("/path#now");
    await hydrated(page);
    await expect(tour(page)).toHaveAttribute("data-path-tour", "playing");

    await playThrough(page, "now");
    await expectShown(page, "next");
    await expect(tour(page)).toHaveAttribute("data-path-tour", "playing");
    await playThrough(page, "next");
    await expect(tour(page)).toHaveAttribute("data-path-tour", "ended");
    await expect(playTab(page)).toHaveAccessibleName(/^Again/);
    await expect(page.locator("[data-path-tour-announcement]")).toContainText(
      "ended",
    );

    await runPastStep(page, "next");
    await expectShown(page, "next");

    /* Again plays from home, a step the visitor chose: pushed. */
    const length = await historyLength(page);
    await playTab(page).click();
    await expectShown(page, "home");
    await expect(tour(page)).toHaveAttribute("data-path-tour", "playing");
    expect(await historyLength(page)).toBe(length + 1);
  });

  test("picking a step jumps there, pushes, and the tour carries on from it", async ({
    page,
  }) => {
    await page.goto("/path");
    await hydrated(page);
    const length = await historyLength(page);

    await page.clock.runFor(2000);
    await stepLink(page, "lille").click();
    await expectShown(page, "lille");
    expect(await historyLength(page)).toBe(length + 1);
    await expect(tour(page)).toHaveAttribute("data-path-tour", "playing");

    /* Lille's clock starts at the pick, not where home's had got to. */
    await playThrough(page, "lille", 500);
    await expectShown(page, "lille");
    await page.clock.runFor(1000);
    await expectShown(page, "now");
    expect(await historyLength(page)).toBe(length + 1);

    /* Back skips the auto-step: it lands on the entry before the pick. */
    await page.goBack();
    await expectShown(page, "home");
    await page.goForward();
    await expectShown(page, "now");
  });

  test("after the end, picking a step plays on from it", async ({ page }) => {
    await page.goto("/path#next");
    await hydrated(page);
    await playThrough(page, "next");
    await expect(tour(page)).toHaveAttribute("data-path-tour", "ended");

    await stepLink(page, "now").click();
    await expect(tour(page)).toHaveAttribute("data-path-tour", "playing");
    await playThrough(page, "now");
    await expectShown(page, "next");
  });

  test("one click or the K key pauses and plays; a paused tour stays put", async ({
    page,
  }) => {
    await page.goto("/path");
    await hydrated(page);
    await expect(playTab(page)).toHaveAccessibleName("Pause the tour");

    await playTab(page).click();
    await expect(tour(page)).toHaveAttribute("data-path-tour", "paused");
    await expect(playTab(page)).toHaveAccessibleName("Play the tour");
    await runPastStep(page, "home");
    await expectShown(page, "home");

    await playTab(page).press("k");
    await expect(tour(page)).toHaveAttribute("data-path-tour", "playing");
    await playThrough(page, "home");
    await expectShown(page, "turin");

    await stepLink(page, "turin").press("k");
    await expect(tour(page)).toHaveAttribute("data-path-tour", "paused");
  });

  test("a pause keeps what is left of the step", async ({ page }) => {
    await page.goto("/path");
    await hydrated(page);
    await playThrough(page, "home", 2000);
    await playTab(page).click();
    await page.clock.runFor(30_000);
    await playTab(page).click();
    await page.clock.runFor(1500);
    await expectShown(page, "home");
    await page.clock.runFor(1000);
    await expectShown(page, "turin");
  });

  test("a hidden tab pauses the tour, and it stays paused on return", async ({
    page,
  }) => {
    await page.goto("/path");
    await hydrated(page);

    const setVisibility = (state: "hidden" | "visible") =>
      page.evaluate((next) => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => next,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      }, state);

    await setVisibility("hidden");
    await expect(tour(page)).toHaveAttribute("data-path-tour", "paused");
    await setVisibility("visible");
    await runPastStep(page, "home");
    await expect(tour(page)).toHaveAttribute("data-path-tour", "paused");
    await expectShown(page, "home");
  });

  test("the caption line runs on the cue timings, and a pause holds it", async ({
    page,
  }) => {
    const { cues } = narrationFor("lille");
    const caption = page.locator("[data-path-caption]");
    const bar = page.locator("[data-path-narration]");
    await page.goto("/path#lille");
    await hydrated(page);

    await expect.poll(() => tourPhase(page)).toBe("dwelling");
    await expect(caption).toHaveText(cues[0].text);
    await expect(bar).toHaveAttribute("data-path-cue", "0");
    await expect(bar).toHaveAttribute("data-path-cue-running", "");
    expect(cues[0].prop).toBeUndefined();
    await expect(bar).not.toHaveAttribute("data-path-cue-prop");

    /* Just short of the next cue, the first holds; at it, the next shows,
       with its prop. */
    await page.clock.runFor(cues[1].startMs - 50);
    await expect(caption).toHaveText(cues[0].text);
    await page.clock.runFor(50);
    await expect(caption).toHaveText(cues[1].text);
    await expect(bar).toHaveAttribute("data-path-cue", "1");
    await expect(bar).toHaveAttribute("data-path-cue-prop", cues[1].prop!);

    /* Paused, the caption stays on its cue however long it waits. */
    await playTab(page).click();
    await expect(tour(page)).toHaveAttribute("data-path-tour", "paused");
    await expect(bar).not.toHaveAttribute("data-path-cue-running");
    await page.clock.runFor(dwellMs("lille"));
    await expect(caption).toHaveText(cues[1].text);
    await expectShown(page, "lille");

    /* Played again, it carries on from there to the next cue. */
    await playTab(page).click();
    await page.clock.runFor(cues[2].startMs - cues[1].startMs);
    await expect(caption).toHaveText(cues[2].text);
  });

  test("after its narration a step holds a beat with its last caption, then moves on", async ({
    page,
  }) => {
    const { cues, durationMs } = narrationFor("turin");
    const caption = page.locator("[data-path-caption]");
    const bar = page.locator("[data-path-narration]");
    await page.goto("/path#turin");
    await hydrated(page);
    await expect.poll(() => tourPhase(page)).toBe("dwelling");

    await page.clock.runFor(durationMs);
    await expect(caption).toHaveText(cues[cues.length - 1].text);
    await expect(bar).not.toHaveAttribute("data-path-cue-running");
    await expectShown(page, "turin");

    await page.clock.runFor(NARRATION_BEAT_MS);
    await expectShown(page, "switzerland");
    await expect(caption).toHaveText(narrationFor("switzerland").cues[0].text);
  });

  test("Back and Next tabs and the J and L keys push steps, and stop at the ends", async ({
    page,
  }) => {
    await page.goto("/path");
    await hydrated(page);
    const length = await historyLength(page);

    /* Playwright will not click what is marked unavailable; a key presses
       it as a visitor's would. */
    await expect(previousTab(page)).toHaveAttribute("aria-disabled", "true");
    await previousTab(page).press("Enter");
    await expectShown(page, "home");

    await nextTab(page).click();
    await expectShown(page, "turin");
    await nextTab(page).press("l");
    await expectShown(page, "switzerland");
    await stepLink(page, "switzerland").press("j");
    await expectShown(page, "turin");
    expect(await historyLength(page)).toBe(length + 3);

    await page.goto("/path#next");
    await hydrated(page);
    await expect(nextTab(page)).toHaveAttribute("aria-disabled", "true");
    await nextTab(page).press("Enter");
    await expectShown(page, "next");
    /* Unavailable, not disabled: it keeps focus. */
    await expect(nextTab(page)).toBeFocused();
  });

  test("the tour's keys work only from the list or the tabs, and leave a modified key alone", async ({
    page,
  }) => {
    await page.goto("/path");
    await hydrated(page);
    await stepLink(page, "home").press("Shift+K");
    await playTab(page).press("Control+l");
    await expect(tour(page)).toHaveAttribute("data-path-tour", "playing");
    await expectShown(page, "home");

    /* Elsewhere on the page a single letter is not the tour's (WCAG 2.1.4). */
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await page.locator("body").press("k");
    await page.locator("body").press("l");
    await expect(tour(page)).toHaveAttribute("data-path-tour", "playing");
    await expectShown(page, "home");

    await page.evaluate(() => {
      const field = document.createElement("input");
      field.id = "probe";
      document.body.append(field);
    });
    await page.locator("#probe").press("k");
    await expect(tour(page)).toHaveAttribute("data-path-tour", "playing");
  });

  test("the dwell shows as a printed line under the current step", async ({
    page,
  }) => {
    await page.goto("/path");
    await hydrated(page);
    const progress = page.locator("[data-path-tour-progress]");

    /* The stills stage settles home at once, so the dwell runs. */
    await expect.poll(() => tourPhase(page)).toBe("dwelling");
    await expect(
      page.locator(
        'li:has([data-path-step-link="home"]) [data-path-tour-progress]',
      ),
    ).toHaveCount(1);
    await expect(progress).toHaveCount(1);
  });

  test("a tour step moves the pawn without animating from a key, and animates otherwise", async ({
    page,
  }) => {
    await page.goto("/path");
    await hydrated(page);
    await playThrough(page, "home");
    await expectShown(page, "turin");
    await expect(overlay(page)).toHaveAttribute("data-path-input", "tour");
    const pawnTransition = () =>
      page
        .locator(".path-pawn")
        .evaluate((pawn) => getComputedStyle(pawn).transitionDuration);
    expect(await pawnTransition()).not.toMatch(/^0s(, 0s)*$/);

    await stepLink(page, "lille").focus();
    await page.keyboard.press("Enter");
    await expectShown(page, "lille");
    await expect(overlay(page)).toHaveAttribute("data-path-input", "keyboard");
    expect(await pawnTransition()).toMatch(/^0s(, 0s)*$/);
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("the tour moving on does not scroll the page", async ({ page }) => {
      await page.goto("/path");
      await hydrated(page);
      await playThrough(page, "home");
      await expectShown(page, "turin");
      await page.clock.runFor(500);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });
  });
});

test.describe("under reduced motion", () => {
  test.beforeEach(async ({ page }) => {
    await pauseTime(page);
  });

  test("the tour starts paused and plays nothing until asked", async ({
    page,
  }) => {
    await page.goto("/path");
    await hydrated(page);
    await expect(page).toHaveURL(/\/path$/);
    await expect(tour(page)).toHaveAttribute("data-path-tour", "paused");
    await runPastStep(page, "now");
    await expect(page).toHaveURL(/\/path$/);
    await expect(overlay(page)).toHaveAttribute("data-path-shown", "now");

    /* Asked, it plays on from the shown step, with no progress line. */
    await playTab(page).click();
    await expect(tour(page)).toHaveAttribute("data-path-tour", "playing");
    /* Reduced motion's board is built at once: the stage has settled. */
    await expect.poll(() => tourPhase(page)).toBe("dwelling");
    await expect(page.locator("[data-path-tour-progress]")).toHaveCount(0);
    await page.clock.runFor(dwellMs("now"));
    await expectShown(page, "next");
  });
});

test("the transport has names, keys and a group label", async ({ page }) => {
  await page.goto("/path");
  await hydrated(page);
  const group = page.getByRole("group", { name: "The tour" });
  await expect(group.getByRole("button")).toHaveCount(3);
  await expect(previousTab(page)).toHaveAccessibleName("Back a step");
  await expect(nextTab(page)).toHaveAccessibleName("Next step");
  for (const [tab, key] of [
    [previousTab(page), "J"],
    [playTab(page), "K"],
    [nextTab(page), "L"],
  ] as const) {
    await expect(tab).toHaveAttribute("aria-keyshortcuts", key);
  }
  /* Each name opens with its printed word (WCAG 2.5.3). */
  for (const tab of [previousTab(page), playTab(page), nextTab(page)]) {
    const printed = (await tab.innerText()).trim().toLowerCase();
    const name = (await tab.getAttribute("aria-label"))!.toLowerCase();
    expect(name.startsWith(printed), `${name} / ${printed}`).toBe(true);
  }
});

test("the overlay's card and tab rules are layered, and their hover needs a fine pointer", async ({
  page,
}) => {
  await page.goto("/path");
  const found = await page.evaluate(() => {
    const out: { selector: string; layered: boolean; media: string }[] = [];
    function walk(rules: CSSRuleList, layered: boolean, media: string) {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSLayerBlockRule) walk(rule.cssRules, true, media);
        else if (rule instanceof CSSMediaRule)
          walk(rule.cssRules, layered, `${media} ${rule.conditionText}`);
        else if (
          rule instanceof CSSStyleRule &&
          /\.path-(card|tab|pawn|tour-progress)/.test(rule.selectorText)
        ) {
          out.push({ selector: rule.selectorText, layered, media });
        }
      }
    }
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        walk(sheet.cssRules, false, "");
      } catch {
        /* A cross-origin sheet: not ours. */
      }
    }
    return out;
  });
  expect(found.length).toBeGreaterThan(0);
  for (const rule of found) expect(rule.layered, rule.selector).toBe(true);
  const hovers = found.filter((rule) => rule.selector.includes(":hover"));
  expect(hovers.length).toBeGreaterThan(0);
  for (const rule of hovers) {
    expect(rule.media, rule.selector).toMatch(
      /\(hover: hover\) and \(pointer: fine\)/,
    );
  }
});

test("the step list marks the pawn's step, a seen step and an unseen one", async ({
  page,
}) => {
  await page.goto("/path#lille");
  await hydrated(page);
  await stepLink(page, "turin").click();

  await expect(page.locator("[data-path-piece]")).toHaveAttribute(
    "data-path-piece",
    "turin",
  );
  const mark = (slug: PathStepSlug) =>
    page.locator(`li:has([data-path-step-link="${slug}"]) [data-path-mark]`);
  await expect(mark("turin")).toHaveAttribute("data-path-mark", "seen");
  await expect(mark("lille")).toHaveAttribute("data-path-mark", "seen");
  await expect(mark("home")).toHaveAttribute("data-path-mark", "unseen");
  await expect(stepLink(page, "lille")).toContainText("seen");
  await expect(stepLink(page, "home")).not.toContainText("seen");
});

/* The seam with the stage (`stage-status.tsx`), on the real board. */
test.describe("with the board drawing", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test.beforeEach(async ({ page }) => {
    await pauseTime(page);
  });

  /* The stage settles when the camera's push-in lands (v3); the tile's
     build carries on into the dwell and finishes well inside it. */
  test("the dwell starts when the camera has landed, and the build finishes inside it", async ({
    page,
  }) => {
    await page.goto("/path#turin");
    await hydrated(page);
    const stage = page.locator("[data-path-stage]");
    await expect(stage).toHaveAttribute("data-scene-mode", "webgl");
    await expect.poll(() => tourPhase(page)).toBe("waiting");

    /* The board loads its cards in real time; fake time then runs its
       frames, a little at a time, until the camera has landed. */
    let elapsed = 0;
    while (elapsed < SETTLE_MAX_WAIT_MS) {
      if ((await stage.getAttribute("data-stage-settled")) !== null) break;
      await page.clock.runFor(100);
      elapsed += 100;
    }
    expect(elapsed).toBeLessThan(SETTLE_MAX_WAIT_MS);
    await expect(stage).toHaveAttribute("data-camera-shot", "close-up");
    await expect.poll(() => tourPhase(page)).toBe("dwelling");

    await page.clock.runFor(dwellMs("turin") - 500);
    await expect(stage).toHaveAttribute("data-build-state", "built");
    await expectShown(page, "turin");
    await page.clock.runFor(1000);
    await expectShown(page, "switzerland");
  });

  test("a stage that never settles holds each step for the whole wait, then dwells", async ({
    page,
  }) => {
    /* Cards that never arrive: the tile stays loading, and never settles. */
    await page.route("**/path/{world,models}/**", () => {});
    await page.goto("/path#turin");
    await hydrated(page);
    const stage = page.locator("[data-path-stage]");
    await expect(stage).toHaveAttribute("data-build-state", "loading");

    await page.clock.runFor(SETTLE_MAX_WAIT_MS - 500);
    expect(await tourPhase(page)).toBe("waiting");
    await expect(page.locator("[data-path-tour-progress]")).toHaveCount(0);
    await expect(stage).not.toHaveAttribute("data-stage-settled", /.*/);

    await page.clock.runFor(500);
    await expect.poll(() => tourPhase(page)).toBe("dwelling");
    await expect(page.locator("[data-path-tour-progress]")).toHaveCount(1);
    await page.clock.runFor(dwellMs("turin"));
    await expectShown(page, "switzerland");

    await waitThenPlayThrough(page, "switzerland");
    await expectShown(page, "cuneo-2022");
  });
});
