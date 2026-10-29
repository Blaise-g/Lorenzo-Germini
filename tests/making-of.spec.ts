/* "How this was made" at the foot of `/` (#152; storyboard §7.8). It holds the
   budgets and fallbacks, each built scene's inspirations and sources, what was
   generated and with what, that C2PA is stripped, and the voice label. The
   figures live in docs/path-measurements.md: decision 10's numbers rule keeps
   them off the page. */

import { expect, test } from "@playwright/test";

import { BUILT_SCENES, MAKING_OF, MAKING_OF_NAMES } from "@/data/making-of";
import { PATH_STEPS } from "@/data/path";

const section = '[data-flat-site-section="how-this-was-made"]';

test("is the last section on /", async ({ page }) => {
  await page.goto("/");
  const ids = await page
    .locator("[data-flat-site-section]")
    .evaluateAll((sections) =>
      sections.map((s) => s.getAttribute("data-flat-site-section")),
    );
  expect(ids.at(-1)).toBe("how-this-was-made");
  await expect(
    page.getByRole("heading", { level: 2, name: MAKING_OF.heading }),
  ).toBeVisible();
});

test("carries every part §7.8 lists", async ({ page }) => {
  await page.goto("/");
  const text = page.locator(section);
  await expect(text).toContainText(/budget/i);
  await expect(text).toContainText(/still images of each scene instead/);
  await expect(text).toContainText("C2PA");
  await expect(text).toContainText(/strip/i);
  await expect(text).toContainText("gpt-image");
  await expect(text).toContainText("Hunyuan3D");
  await expect(text).toContainText(/synthetic voice/i);
});

test("names each built scene with its inspirations and sources", async ({
  page,
}) => {
  await page.goto("/");
  for (const sceneId of BUILT_SCENES) {
    const step = PATH_STEPS.find((s) => s.sceneId === sceneId)!;
    for (const inspiration of step.illustration.inspirations) {
      await expect(page.locator(section), sceneId).toContainText(inspiration);
    }
  }
  const lille = MAKING_OF.scenes.items.find((s) => s.sceneId === "lille")!;
  expect(lille.sources.length).toBeGreaterThan(0);
  for (const source of lille.sources) {
    await expect(
      page.locator(section).getByRole("link", { name: source.label }),
    ).toHaveAttribute("href", source.href);
  }
});

/* Decision 10: no figures. With the names that carry a digit taken out, the
   section's text has none. */
test("states no figures", async ({ page }) => {
  await page.goto("/");
  let text = (await page.locator(section).textContent()) ?? "";
  for (const name of MAKING_OF_NAMES) text = text.replaceAll(name, "");
  expect(text).not.toMatch(/\d/);
});

/* The section says nothing on `/` loads 3D code: the three.js runtime is
   dynamically imported by `/path`'s stage only. */
test("/ loads no three.js", async ({ page }) => {
  const scripts: string[] = [];
  page.on("response", async (response) => {
    if (response.request().resourceType() === "script") {
      scripts.push(await response.text().catch(() => ""));
    }
  });
  await page.goto("/", { waitUntil: "networkidle" });
  expect(scripts.length).toBeGreaterThan(0);
  for (const body of scripts) expect(body).not.toContain("WebGLRenderer");
});
