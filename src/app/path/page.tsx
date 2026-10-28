/*
THESIS: The 3D path, entered by choice: the same seven steps as `/`, walked one
scene at a time. The overlay paints first, over the step's still; the scene
then builds in its stage.
OWN-WORLD: Warm Print around a full-width stage — serif places, mono dates,
terracotta for the piece, the links and the way back.
STORY: Pick a step, read what happened there, go back to the flat site at the
same step.
FIRST VIEWPORT: The name, "Flat site", the path in small and the selected
step's text — all HTML, painted before any 3D.
FORM: Masthead row, then the step list beside the stage and, under it, the
step's text panel.
*/

import type { Metadata } from "next";

import {
  PathSteps,
  type PathStepNode,
} from "@/components/flat-site/path-steps";
import { stepPeriod } from "@/lib/path-step-labels";
import {
  FLAT_SITE_LINK_CLASS_NAME,
  StepSection,
} from "@/components/flat-site/step-section";
import { RouteFrame } from "@/components/route-frame";
import { ThemeToggle } from "@/components/theme-toggle";
import { PATH_STEPS } from "@/data/path";
import type { PathStep } from "@/data/path.types";
import { RESUME_DATA } from "@/data/resume-data";
import { cn } from "@/lib/utils";

import { stillsFor } from "@/components/path/scene/build-plan";

import { STAGE_COPY } from "./copy";
import { PATH_OVERLAY_INSET } from "./inset";
import {
  CAPTION_LIT_CSS,
  OVERLAY_FIRST_PAINT_SCRIPT,
  OVERLAY_PANEL_CSS,
} from "./first-paint";
import { FlatSiteLink, MarkEntered, OverlayRoot } from "./overlay";
import { SceneStage } from "./scene-stage";

/* No markdown alternate and no sitemap entry: `/path` adds no content the flat
   site lacks, and `/` is the crawlable form (GH-141, implementation decision
   6). */
export const metadata: Metadata = {
  title: "The 3D path",
  description: `The path of ${RESUME_DATA.name}'s life, step by step: where he studied and worked, his roles and their results.`,
};

/* The drawn path's node per step, as `/` draws it. */
function stepNode(step: PathStep): PathStepNode {
  if (step.sceneId === "home") return "home";
  return step.sceneId === "open" ? "open" : "place";
}

/* What the stage shows before the scene renders, and as the fallback: the
   step's still, one per mode, or a line for a step whose scene is not built
   yet. Server HTML for every step, shown by the same CSS as the panels, so a
   load of `/path#lille` paints Lille's before any JavaScript. Lazy, so only
   the shown step's still in the current mode downloads: Chromium does not
   fetch a lazy image that is `display: none`. */
function StageBackdrop({ step }: { step: PathStep }) {
  const stills = stillsFor(step);
  return (
    <div data-path-backdrop={step.slug} className="absolute inset-0">
      {stills ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size
              backdrop under the canvas; the optimiser would only re-encode a
              WebP already cut to size. */}
          <img
            src={stills.light}
            alt=""
            data-path-still="light"
            loading="lazy"
            className="size-full object-cover dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- as above. */}
          <img
            src={stills.dark}
            alt=""
            data-path-still="dark"
            loading="lazy"
            className="hidden size-full object-cover dark:block"
          />
        </>
      ) : (
        <p className="text-faint font-label flex size-full items-center justify-center text-xs tracking-[0.12em] uppercase">
          {STAGE_COPY.notBuilt}
        </p>
      )}
    </div>
  );
}

/* Its own shell (ADR-0002): `RouteFrame` with this route's inset, so `main`
   and the one `contentinfo` stay paired. The overlay fills the first screen;
   the footer sits under it. Every step's text is in the HTML; the 3D runtime
   is not imported here but by the stage, after the overlay paints (GH-148). */
export default function PathPage() {
  return (
    <RouteFrame measure={PATH_OVERLAY_INSET}>
      <MarkEntered />
      <style
        dangerouslySetInnerHTML={{
          __html: OVERLAY_PANEL_CSS + CAPTION_LIT_CSS,
        }}
      />
      <OverlayRoot
        className={cn(PATH_OVERLAY_INSET, "flex min-h-dvh flex-col pb-12")}
      >
        <header className="border-ink flex items-center justify-between gap-6 border-b-2 py-3 lg:py-4">
          <div className="flex items-baseline gap-x-4">
            <h1 className="font-display text-lg font-semibold tracking-tight">
              {RESUME_DATA.name}
            </h1>
            <p className="text-faint font-label hidden text-xs tracking-[0.12em] uppercase lg:block">
              {RESUME_DATA.roleLabel}
            </p>
          </div>
          {/* "Flat site" is in the header at every width, so the way back is
              never more than one click away (storyboard §7.4). */}
          <div className="font-label flex items-center gap-6 text-xs tracking-[0.12em] uppercase">
            <FlatSiteLink className={FLAT_SITE_LINK_CLASS_NAME} />
            <ThemeToggle />
          </div>
        </header>
        {/* Here and nowhere else: a direct child of the overlay root, which
            it marks, after the header's "Flat site", which it rewrites, and
            before the panels, so it runs before they paint. */}
        <script
          dangerouslySetInnerHTML={{ __html: OVERLAY_FIRST_PAINT_SCRIPT }}
        />

        <div className="mt-8 grid flex-1 content-start gap-x-16 gap-y-10 lg:mt-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <nav aria-labelledby="path-heading">
            <h2 id="path-heading" className="sr-only">
              The path
            </h2>
            <PathSteps
              steps={PATH_STEPS.map((step) => ({
                slug: step.slug,
                place: step.place,
                period: stepPeriod(step),
                node: stepNode(step),
              }))}
            />
          </nav>

          <div className="min-w-0 space-y-6">
            <SceneStage>
              {PATH_STEPS.map((step) => (
                <StageBackdrop key={step.slug} step={step} />
              ))}
            </SceneStage>

            {/* The text panel. Its sections are not anchored: the fragment
                selects here rather than scrolling, and focus stays on the step
                that was selected (storyboard §7.7). */}
            <div data-path-text-panel>
              {PATH_STEPS.map((step) => (
                <div key={step.slug} data-path-panel={step.slug}>
                  <StepSection step={step} anchored={false} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </OverlayRoot>
    </RouteFrame>
  );
}
