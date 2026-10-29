/* Renders the 3D path's fallback stills from the board runtime itself (#148):
   for each step, the board settled on it — every tile built, as reduced
   motion shows it, and the pawn on the step's tile — from its camera, in
   light and dark.

   Runs against the dev server you already have, rather than booting its own
   as `generate:cv` does: Next's `.next/dev/lock` allows one per working
   directory, so a running one is reused. Start it first with `bun run dev`
   (same `PLAYWRIGHT_PORT`), then `bun run generate:path-stills`. */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";
import sharp from "sharp";

import { hasScene, stillsFor } from "../src/components/path/scene/build-plan";
import { PATH_STEPS } from "../src/data/path";
import { devServerUrl } from "../tests/support/dev-server";

/* The dev server's URL from the one place that reads `PLAYWRIGHT_PORT`, so
   this script, `bun run dev` and the test runner cannot disagree. */
const origin = devServerUrl;
/* Wide enough that the stage is about as wide as it gets at 1440. */
const viewport = { width: 1440, height: 900 };
/* §11's budget for a still. */
const MAX_BYTES = 150 * 1024;

const reachable = await fetch(`${origin}/llms.txt`).then(
  (response) => response.ok,
  () => false,
);
if (!reachable) {
  console.error(`No dev server at ${origin}. Start one with \`bun run dev\`.`);
  process.exit(1);
}

/* Under reduced motion the whole board stands, whichever step is shown. */
const everyProp = PATH_STEPS.flatMap((step) =>
  step.props.map((prop) => prop.id),
).join(" ");

const browser = await chromium.launch({ args: ["--mute-audio"] });
try {
  for (const theme of ["light", "dark"] as const) {
    const context = await browser.newContext({
      viewport,
      /* The live board draws at ratio 2 at least (ADR-0009); the still is
         shown only until it draws, or where it cannot, so it is captured at
         1.5 to keep a landing's bytes down. */
      deviceScaleFactor: 1.5,
      reducedMotion: "reduce",
    });
    await context.addInitScript((value) => {
      localStorage.setItem("theme", value);
    }, theme);
    const page = await context.newPage();

    for (const step of PATH_STEPS.filter(hasScene)) {
      const target = stillsFor(step)![theme];
      await page.goto(`${origin}/path#${step.slug}`);
      /* After the first, each goto only changes the fragment, so the page
         still carries the last step's end state: wait for the board to settle
         on this step, every prop standing, the last step's crossfade gone
         (reduced motion cuts with one), and for a frame rendered after. */
      await page.waitForFunction(
        ({ slug, props }) => {
          const stage = document.querySelector("[data-path-stage]");
          return (
            stage?.getAttribute("data-build-state") === "built" &&
            stage.getAttribute("data-scene-step") === slug &&
            stage.getAttribute("data-scene-props") === props &&
            !document.querySelector("[data-path-crossfade]")
          );
        },
        { slug: step.slug, props: everyProp },
        { timeout: 15_000 },
      );
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      /* An element's screenshot is what is on screen over it, and the
         board's tabs lie over the canvas. Hidden, not removed, so the board
         stays framed for them, as the still will be shown under them. */
      await page.addStyleTag({
        content:
          "[data-path-cover], nextjs-portal { visibility: hidden !important; }",
      });
      const png = await page.locator("[data-path-stage] canvas").screenshot();
      const webp = await sharp(png).webp({ quality: 78 }).toBuffer();
      if (webp.length > MAX_BYTES) {
        throw new Error(`${target} is ${webp.length} bytes, over ${MAX_BYTES}`);
      }
      const file = path.join(process.cwd(), "public", target);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, webp);
      console.log(`${target}  ${(webp.length / 1024).toFixed(1)} KB`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
