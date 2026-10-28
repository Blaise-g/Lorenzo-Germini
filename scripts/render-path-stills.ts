/* Renders the 3D path's fallback stills from the scene runtime itself (#148):
   each step with a scene, at its end state, from its fixed camera, in light
   and dark. Grey-box renders until #149's pipeline paints over them.

   Runs against the dev server you already have, rather than booting its own
   as `generate:cv` does: Next's `.next/dev/lock` allows one per working
   directory, so a running one is reused. Start it first with `bun run dev`
   (same `PLAYWRIGHT_PORT`), then `bun run generate:path-stills`. */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";
import sharp from "sharp";

import {
  buildPlan,
  hasScene,
  stillsFor,
} from "../src/components/path/scene/build-plan";
import { PATH_STEPS } from "../src/data/path";

const origin = `http://localhost:${process.env.PLAYWRIGHT_PORT ?? "3200"}`;
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

const browser = await chromium.launch({ args: ["--mute-audio"] });
try {
  for (const theme of ["light", "dark"] as const) {
    const context = await browser.newContext({
      viewport,
      /* The runtime caps its pixel ratio at 1.5, so a still captured at 1.5
         has every pixel the live scene would, and none upsampled. */
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
         still carries the last step's end state: wait for this step's props,
         all of them, and for a frame rendered after they were posed. */
      const plan = buildPlan(step);
      const props = [
        ...plan.standing,
        ...plan.building.map((prop) => prop.id),
      ].sort();
      await page.waitForFunction(
        (expected) => {
          const stage = document.querySelector("[data-path-stage]");
          const shown = (stage?.getAttribute("data-scene-props") ?? "")
            .split(" ")
            .sort()
            .join(" ");
          return (
            stage?.getAttribute("data-build-state") === "built" &&
            shown === expected
          );
        },
        props.join(" "),
        { timeout: 15_000 },
      );
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
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
