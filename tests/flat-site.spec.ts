/* The flat site at `/` (#144): the path in plain HTML, first paint for
   everyone. Its contract comes from #141 — decisions 3, 7, 10 and 12, and
   implementation decision 5 — and from #144's acceptance criteria. The data
   rules themselves (the four numbers, "projected", the illustration labels)
   are checked on the data module in `path-steps.spec.ts`; this spec checks
   that the page carries that data whole and adds nothing to it. */

import { expect, test, type Page } from "@playwright/test";

import { PATH_SIDE_PROPS, PATH_STEPS } from "@/data/path";
import type { PathStep } from "@/data/path.types";

import {
  BACK_TO_TOP_MIN_WIDTH,
  backToTopButton,
  revealBackToTop,
} from "./support/back-to-top";

/** Every string the data module gives a step, which the page may render. */
function stepStrings(step: PathStep): string[] {
  return [
    step.place,
    ...step.lines,
    ...step.roles.flatMap((role) => [
      role.title,
      role.organisation,
      role.location,
    ]),
    ...step.links.map((link) => link.label),
    step.illustration.label,
    ...step.illustration.inspirations,
  ];
}

/** A section's source text with its dates taken out: `textContent`, not
 *  `innerText`, so the uppercase labels compare in the case they were
 *  written in. */
function textWithoutDates(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const copy = element.cloneNode(true) as Element;
    for (const date of copy.querySelectorAll("[data-path-date]")) {
      date.remove();
    }
    return copy.textContent ?? "";
  });
}

/** `text` with every value cut out, longest first so a short one ("Cuneo")
 *  cannot break a longer one that contains it, and the separators the markup
 *  puts between them dropped. */
function without(text: string, values: readonly string[]) {
  const longestFirst = [...values].sort((a, b) => b.length - a.length);
  return longestFirst
    .reduce((rest, value) => rest.split(value).join(""), text)
    .replace(/[\s·–]/g, "");
}

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("every step's text is in the page", async ({ page }) => {
    await page.goto("/");

    for (const step of PATH_STEPS) {
      const section = page.locator(`section#${step.slug}`);
      await expect(section, step.slug).toBeVisible();
      for (const line of step.lines) {
        await expect(section, `${step.slug}: ${line}`).toContainText(line);
      }
      /* Decision 7's proof is role and dates as well as results, read off
         each role's own row: the school also sits in its degree's line, so a
         section-wide search could not tell a row that lost it. A degree's
         title is that line, so its row may leave the title out. */
      const rows = section.locator("li");
      await expect(rows).toHaveCount(step.roles.length);
      for (const [index, role] of step.roles.entries()) {
        const row = rows.nth(index);
        const values = [
          role.organisation,
          role.location,
          `${role.start} – ${role.end}`,
        ];
        if (!step.lines.includes(`${role.title}, ${role.organisation}.`)) {
          values.push(role.title);
        }
        for (const value of values) {
          await expect(row, `${step.slug}: ${value}`).toContainText(value);
        }
      }
    }
    for (const prop of PATH_SIDE_PROPS) {
      const section = page.locator(`section#${prop.slug}`);
      await expect(section, prop.slug).toContainText(prop.title);
      for (const line of prop.lines) {
        await expect(section, `${prop.slug}: ${line}`).toContainText(line);
      }
    }
  });

  test("every step link scrolls to its section", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const path = page.getByRole("navigation", { name: "The path" });

    /* Last to first, so each jump moves the page in the direction a stale
       scroll position would not already satisfy. */
    for (const step of [...PATH_STEPS].reverse()) {
      await path.locator(`a[href="#${step.slug}"]`).click();

      await expect(page).toHaveURL(new RegExp(`#${step.slug}$`));
      await expect(page.locator(`section#${step.slug}`)).toBeInViewport();
    }
    await expect(path.locator('a[href^="#"]')).toHaveCount(
      PATH_STEPS.length + PATH_SIDE_PROPS.length,
    );
  });
});

test("/ loads no 3D code and plays no sound", async ({ page }) => {
  const offending: string[] = [];
  const scripts: Promise<string>[] = [];
  page.on("response", (response) => {
    const request = response.request();
    const url = request.url();
    if (
      request.resourceType() === "media" ||
      /\.(mp3|m4a|aac|ogg|opus|wav|flac|glb|gltf|ktx2|hdr)(\?|$)/i.test(url) ||
      /three|meshopt|draco|basis/i.test(new URL(url).pathname)
    ) {
      offending.push(url);
    }
    if (request.resourceType() === "script") {
      scripts.push(response.text().catch(() => ""));
    }
  });

  await page.goto("/", { waitUntil: "networkidle" });

  expect(offending).toEqual([]);
  await expect(page.locator("audio, video, canvas")).toHaveCount(0);
  /* The bundles themselves, since a 3D runtime can arrive under a hashed
     chunk name. `WebGLRenderer` is three.js's, and `webgl2` is the context any
     renderer has to ask for. */
  const bundles = (await Promise.all(scripts)).join("\n");
  expect(bundles.length).toBeGreaterThan(0);
  expect(bundles).not.toMatch(/WebGLRenderer|["']webgl2["']/);
});

test("each blend is labelled as an illustration on its step", async ({
  page,
}) => {
  await page.goto("/");

  for (const step of PATH_STEPS) {
    const label = page.locator(`section#${step.slug} [data-path-illustration]`);
    await expect(label, step.slug).toContainText(step.illustration.label);
    await expect(label, step.slug).toContainText(/^Illustration: /);
  }
});

/* Decision 10: the only numbers on the path are the four the data module
   allows, and the data spec holds the module to them. So once a section's
   dates and every string the module gave it are taken out, what remains is
   markup's own words — and the only ones allowed are the "Drawn from" label.
   The rule binds the path's own text: dates are dates, and the writing
   teaser below the path is the essay's copy, which #144 does not change. */
test("the path adds no words, and so no numbers, to its data", async ({
  page,
}) => {
  await page.goto("/");

  for (const step of PATH_STEPS) {
    const residue = without(
      await textWithoutDates(page, `section#${step.slug}`),
      stepStrings(step),
    );
    expect(residue, step.slug).toBe("Drawnfrom");
  }

  for (const prop of PATH_SIDE_PROPS) {
    const residue = without(
      await textWithoutDates(page, `section#${prop.slug}`),
      [prop.title, ...prop.lines, prop.link.label],
    );
    expect(residue, prop.slug).toBe("");
  }
});

/* `SectionAnchorRow` and `BackToTop` outlive the hub that first rendered
   them (#141, implementation decision 3). */
test("/cv still renders its section anchor row and its back-to-top control", async ({
  page,
}) => {
  await page.setViewportSize({ width: BACK_TO_TOP_MIN_WIDTH, height: 800 });
  await page.goto("/cv");

  const anchors = page.getByRole("navigation", { name: "On this page" });
  await expect(anchors).toBeVisible();
  const links = await anchors.getByRole("link").all();
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    const target = (await link.getAttribute("href"))!;
    expect(target).toMatch(/^#/);
    await expect(page.locator(target)).toHaveCount(1);
  }

  await revealBackToTop(page);
  await expect(backToTopButton(page)).toBeVisible();
});
