/* Scenes on `/path` (#148): the runtime loads after the overlay paints, the
   selected step builds, Skip and Replay, reduced motion, light and dark, and
   the stills when the browser cannot run it. The contract is #141 — decisions
   8, 11, 12 and 13, implementation decisions 6–8 and the testing decisions'
   Build, Fallback and Weight bullets — with storyboard §7.4, §7.5 and §7.7 of
   docs/research/experience-rethink.md. The pure halves are in
   `path-scene-contract.spec.ts`. */

import { expect, test, type Page } from "@playwright/test";

import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";
import { FALLBACK_REASON_LINES } from "@/components/path/scene/fallback";

import { setTheme, themeToggle } from "./support/theme";

/* Turbopack names a module's chunk after its path, so three.js and the scene
   runtime are recognisable by URL in dev. */
const threeChunk = /three_build_three/;
const sceneChunk =
  /three_build_three|components_path_scene_(?!build|fallback|capabilities)/;

const stage = (page: Page) => page.locator("[data-path-stage]");
const overlay = (page: Page) => page.locator("[data-path-overlay]");
const buildControl = (page: Page) => page.locator("[data-path-build-control]");
const stepLink = (page: Page, slug: PathStepSlug) =>
  page.locator(`[data-path-step-link="${slug}"]`);

const stepNamed = (slug: PathStepSlug) =>
  PATH_STEPS.find((step) => step.slug === slug)!;

/** The caption lines a step's props light, as the overlay root lists them. */
function captionLines(slug: PathStepSlug) {
  return [...new Set(stepNamed(slug).props.map((p) => p.captionLine))]
    .sort((a, b) => a - b)
    .join(" ");
}

/** Every value the stage's build state takes, in order, from the first
 *  paint: a build that skipped a state, or ran when it should not, shows up
 *  here where a single poll could miss it. */
async function recordBuildStates(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __buildStates: string[] }).__buildStates = seen;
    new MutationObserver(() => {
      const state = document
        .querySelector("[data-path-stage]")
        ?.getAttribute("data-build-state");
      if (state && seen.at(-1) !== state) seen.push(state);
    }).observe(document, {
      subtree: true,
      attributes: true,
      childList: true,
      attributeFilter: ["data-build-state"],
    });
  });
}

const buildStates = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __buildStates: string[] }).__buildStates,
  );

test.describe("loading", () => {
  test("/path paints its overlay before it requests any 3D", async ({
    page,
  }) => {
    await page.goto("/path");
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "webgl");
    const timings = await page.evaluate(() => ({
      paint:
        performance
          .getEntriesByType("paint")
          .find((entry) => entry.name === "first-contentful-paint")
          ?.startTime ?? Infinity,
      three: performance
        .getEntriesByType("resource")
        .filter((entry) => /three_build_three/.test(entry.name))
        .map((entry) => entry.startTime),
    }));
    expect(timings.three.length).toBeGreaterThan(0);
    for (const start of timings.three) {
      expect(start).toBeGreaterThan(timings.paint);
    }
  });

  test("/ requests no 3D chunk", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));
    await page.goto("/", { waitUntil: "networkidle" });
    expect(requested.filter((url) => sceneChunk.test(url))).toEqual([]);
  });

  test("the path tokens resolve in the page, where the scene reads them", async ({
    page,
  }) => {
    await page.goto("/path");
    const tokens = await page.evaluate(() =>
      ["ground", "tile", "prop", "accent", "outline", "fog"].map((role) =>
        getComputedStyle(document.documentElement)
          .getPropertyValue(`--path-${role}`)
          .trim(),
      ),
    );
    for (const value of tokens) expect(value).not.toBe("");
  });
});

test.describe("the build", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("home's step builds in about 2–3 s, lighting its captions as props land", async ({
    page,
  }) => {
    await recordBuildStates(page);
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    const started = Date.now();
    /* Part-way, the first prop has landed and lit its line. */
    await expect(stage(page)).toHaveAttribute("data-scene-props", /plateau/);
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 5000,
    });
    const took = Date.now() - started;
    expect(took).toBeGreaterThan(1500);
    expect(took).toBeLessThan(4000);
    expect(await buildStates(page)).toEqual(["idle", "building", "built"]);
    await expect(overlay(page)).toHaveAttribute(
      "data-path-lit",
      captionLines("home"),
    );
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      "plateau bisalta school",
    );

    /* The lit line is the panel's own line, drawn in ink. */
    const line = page.locator('[data-path-panel="home"] [data-path-line="0"]');
    const ink = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--color-ink)";
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    await expect
      .poll(() => line.evaluate((element) => getComputedStyle(element).color))
      .toBe(ink);
  });

  test("steps 4 and 6 add their props to the earlier ones", async ({
    page,
  }) => {
    await page.goto("/path#cuneo-2022");
    /* Step 1's props stand before step 4's own have landed. */
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      /^plateau bisalta school/,
    );
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 5000,
    });
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      "plateau bisalta school schoolroom mvp-window",
    );
    await expect(overlay(page)).toHaveAttribute(
      "data-path-lit",
      captionLines("cuneo-2022"),
    );

    await stepLink(page, "now").click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 5000,
    });
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      "plateau bisalta school schoolroom mvp-window startup-desk office",
    );
    await expect(overlay(page)).toHaveAttribute(
      "data-path-lit",
      captionLines("now"),
    );
  });

  test("Skip by click reaches the end; Replay rebuilds; nothing then moves on", async ({
    page,
  }) => {
    await page.goto("/path#home");
    await expect(buildControl(page)).toHaveText("Skip");
    await buildControl(page).click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      "plateau bisalta school",
    );
    await expect(overlay(page)).toHaveAttribute(
      "data-path-lit",
      captionLines("home"),
    );

    await expect(buildControl(page)).toHaveText("Replay");
    await buildControl(page).click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    await expect(overlay(page)).not.toHaveAttribute("data-path-lit", /./);
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 5000,
    });

    /* The end is still: no loop back into a build, no step advance. */
    await page.waitForTimeout(1500);
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    expect(new URL(page.url()).hash).toBe("#home");
  });

  test("a click on the scene skips the build", async ({ page }) => {
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    await page.locator("[data-path-stage] canvas").click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 500,
    });
  });

  test("Esc skips the build, and a second Esc returns focus to the step list", async ({
    page,
  }) => {
    await page.goto("/path#home");
    await expect(stage(page)).toHaveAttribute("data-build-state", "building");
    await page.keyboard.press("Escape");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built", {
      timeout: 500,
    });
    await expect(stepLink(page, "home")).not.toBeFocused();
    await page.keyboard.press("Escape");
    await expect(stepLink(page, "home")).toBeFocused();
  });

  test("the two 45° buttons turn the scene once each way", async ({ page }) => {
    await page.goto("/path#home");
    const left = page.getByRole("button", { name: "Turn the scene left" });
    const right = page.getByRole("button", { name: "Turn the scene right" });
    await left.click();
    await expect(left).toBeDisabled();
    await right.click();
    await expect(left).toBeEnabled();
    await right.click();
    await expect(right).toBeDisabled();
  });

  /* Light and dark follow the site's class (storyboard §7.9), live: the
     scene's ground is the fog token, which is the page's ground in each mode. */
  test("the scene follows the site's theme toggle", async ({ page }) => {
    await setTheme(page, "light");
    await page.goto("/path#home");
    await buildControl(page).click();
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");

    const cornerBrightness = async () => {
      const box = (await page
        .locator("[data-path-stage] canvas")
        .boundingBox())!;
      const png = await page.screenshot({
        clip: { x: box.x + 2, y: box.y + 2, width: 2, height: 2 },
      });
      const { default: sharp } = await import("sharp");
      const { data } = await sharp(png)
        .raw()
        .toBuffer({ resolveWithObject: true });
      return Math.max(data[0], data[1], data[2]);
    };

    expect(await cornerBrightness()).toBeGreaterThan(192);
    await themeToggle(page).click();
    await expect.poll(cornerBrightness).toBeLessThan(64);
    await themeToggle(page).click();
    await expect.poll(cornerBrightness).toBeGreaterThan(192);
  });
});

test.describe("reduced motion", () => {
  /* The suite's default context emulates reduced motion. */
  test("shows the end state at once, without a build", async ({ page }) => {
    await recordBuildStates(page);
    await page.goto("/path#cuneo-2022");
    await expect(stage(page)).toHaveAttribute("data-build-state", "built");
    expect(await buildStates(page)).toEqual(["idle", "built"]);
    await expect(stage(page)).toHaveAttribute(
      "data-scene-props",
      "plateau bisalta school schoolroom mvp-window",
    );
    await expect(overlay(page)).toHaveAttribute(
      "data-path-lit",
      captionLines("cuneo-2022"),
    );
    await expect(buildControl(page)).toHaveText("Replay");
  });
});

test.describe("a step whose scene is not built yet", () => {
  test("shows its text and says so, with no controls", async ({ page }) => {
    await page.goto("/path#turin");
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "webgl");
    await expect(stage(page)).toHaveAttribute("data-build-state", "idle");
    await expect(page.locator('[data-path-backdrop="turin"]')).toContainText(
      "not built yet",
    );
    await expect(buildControl(page)).toHaveCount(0);
  });
});

test.describe("the fallback", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
    });
  });

  test("with getContext refusing, /path shows the stills and why, and loads no 3D", async ({
    page,
  }) => {
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));
    await page.goto("/path#cuneo-2022");
    await expect(stage(page)).toHaveAttribute("data-scene-mode", "fallback");
    await expect(stage(page)).toHaveAttribute(
      "data-fallback-reason",
      "context-failed",
    );
    await expect(page.locator("[data-path-fallback-reason]")).toHaveText(
      FALLBACK_REASON_LINES["context-failed"],
    );
    const still = page.locator(
      '[data-path-backdrop="cuneo-2022"] [data-path-still="light"]',
    );
    await expect(still).toBeVisible();
    await expect
      .poll(() => still.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await expect(page.locator("[data-path-stage] canvas")).toBeHidden();
    await expect(buildControl(page)).toHaveCount(0);
    expect(requested.filter((url) => threeChunk.test(url))).toEqual([]);
  });
});
