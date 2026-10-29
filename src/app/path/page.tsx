/*
THESIS: The 3D path, entered by choice: the same seven steps as `/`, walked one
scene at a time. The overlay paints first, over the step's still; the scene
then builds in its stage, and the tour plays the board by itself while the
voice tells each step.
OWN-WORLD: Warm Print printed on card stock (comp B) — the step list, the
caption bar, "Flat site" and the tour's die-cut tabs in two inks, serif
places and captions, mono dates, terracotta for the pawn, the links and the
way back.
STORY: Watch and hear the path play from home, or pick a step like a track
on a tape, and go to the flat site to read a step in full.
FIRST VIEWPORT: The name, "Flat site", the path in small and the board's
still — all HTML, painted before any 3D.
FORM: Masthead row, then the board filling the first screen, the step list
as a strip across its top and one bar under it: the caption line, the tour's
tabs, the Voice, Captions and Sound switches. On a phone: the board, the steps as a
strip, the bar.
*/

import type { Metadata } from "next";

import type { PathStepNode } from "@/components/flat-site/path-steps";
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

import { PATH_COPY } from "./copy";
import { PATH_OVERLAY_INSET } from "./inset";
import { OVERLAY_FIRST_PAINT_SCRIPT, OVERLAY_PANEL_CSS } from "./first-paint";
import {
  FlatSiteLink,
  MarkEntered,
  OverlayRoot,
  PathStepList,
} from "./overlay";
import { SceneStage } from "./scene-stage";
import { StageStatusProvider } from "./stage-status";
import { TourProvider, TourTransport } from "./tour";
import { NarrationBar } from "./voice";

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

/** A still is a wide close-up, the step's tile a little right of centre
 *  (`camera-rig.ts`). A wide stage shows it whole; a phone's or a tablet's
 *  taller stage is filled with it, cropped about that tile, rather than
 *  letterboxed. */
const STILL_CLASS_NAME =
  "size-full object-cover object-[56%_50%] lg:object-contain lg:object-center";

/* What the stage shows before the scene renders, and as the fallback: the
   step's still, one per mode. Server HTML for every step, shown by the same
   CSS as the panels, so a load of `/path#lille` paints Lille's before any
   JavaScript. Lazy, so only the shown step's still in the current mode
   downloads: Chromium does not fetch a lazy image that is `display: none`. */
function StageBackdrop({ step }: { step: PathStep }) {
  const stills = stillsFor(step);
  return (
    /* Showing stills, the backdrop stops short of the stage's foot, so the
       line saying why sits on bare paper under the art, not over it. */
    <div
      data-path-backdrop={step.slug}
      className="absolute inset-0 [[data-fallback-reason]_&]:bottom-8"
    >
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
            className={cn(STILL_CLASS_NAME, "dark:hidden")}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- as above. */}
          <img
            src={stills.dark}
            alt=""
            data-path-still="dark"
            loading="lazy"
            className={cn(STILL_CLASS_NAME, "hidden dark:block")}
          />
        </>
      ) : null}
    </div>
  );
}

/* Its own shell (ADR-0002): `RouteFrame` with this route's inset, so `main`
   and the one `contentinfo` stay paired. The overlay fills the first screen;
   the footer sits under it. Every step's text is in the HTML, for print and
   for a visit without JavaScript, though not on screen once the page is
   scripted: there the voice and the captions tell it. The 3D runtime is not
   imported here but by the stage, after the overlay paints (GH-148). */
export default function PathPage() {
  return (
    <RouteFrame measure={PATH_OVERLAY_INSET}>
      <MarkEntered />
      {/* In `components`, as AGENTS.md asks of hand-written rules: unlayered,
          they would beat every utility, `print:` ones included. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@layer components{${OVERLAY_PANEL_CSS}}`,
        }}
      />
      <StageStatusProvider>
        <TourProvider>
          <OverlayRoot
            className={cn(
              PATH_OVERLAY_INSET,
              "flex min-h-dvh flex-col pb-12 lg:pb-6",
            )}
          >
            <header className="border-ink flex items-center justify-between gap-6 border-b-2 py-2 md:py-3 lg:py-4">
              <div className="flex items-baseline gap-x-4">
                <h1 className="font-display text-lg font-semibold tracking-tight">
                  {RESUME_DATA.name}
                </h1>
                <p className="text-faint font-label hidden text-xs tracking-[0.12em] uppercase lg:block">
                  {RESUME_DATA.roleLabel}
                </p>
              </div>
              {/* "Flat site" is in the header at every width, so the way back
                  is never more than one click away (storyboard §7.4). */}
              <div className="font-label flex items-center gap-6 text-xs tracking-[0.12em] uppercase">
                <FlatSiteLink
                  className={cn(
                    FLAT_SITE_LINK_CLASS_NAME,
                    "path-card rounded-md px-3 py-1.5 no-underline",
                  )}
                />
                <ThemeToggle />
              </div>
            </header>
            {/* Here and nowhere else: a direct child of the overlay root, which
                it marks, after the header's "Flat site", which it rewrites,
                and before the panels, so it runs before they paint. */}
            <script
              dangerouslySetInnerHTML={{ __html: OVERLAY_FIRST_PAINT_SCRIPT }}
            />

            {/* The board is the hero (comp B): it fills the first screen,
                full width, with the step list as one printed strip across its
                top and the narration bar under it — the caption line, the
                tour's tabs and the switches (owner, v3: no text panel; the
                voice tells each step). The canvas spans only the board's own
                part, so it is drawn sharp within the GPU budget
                (`drawing-buffer.ts`).

                On a phone: the board first, full width; then the steps, the
                same strip three at a time; then the bar, packed close so its
                switches and the voice's label are on the first screen of a
                375×812 phone. Print shows none of these,
                only the selected step's text. */}
            <div
              data-path-world
              className="mt-2 flex flex-1 flex-col gap-y-2 md:mt-4 md:gap-y-5 lg:mt-6 lg:grid lg:min-h-[36rem] lg:basis-0 lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-y-4 print:mt-6 print:block"
            >
              {/* The tour's keys work with focus anywhere in here, or on the
                  tour's tabs. */}
              <nav
                aria-labelledby="path-heading"
                data-path-tour-keys
                className="relative z-10 print:hidden"
              >
                <h2 id="path-heading" className="sr-only">
                  {PATH_COPY.stepListHeading}
                </h2>
                <PathStepList
                  steps={PATH_STEPS.map((step) => ({
                    slug: step.slug,
                    place: step.place,
                    period: stepPeriod(step),
                    node: stepNode(step),
                  }))}
                />
              </nav>

              <SceneStage className="max-lg:order-first max-lg:-mx-6 md:max-lg:-mx-10 lg:min-h-0">
                {PATH_STEPS.map((step) => (
                  <StageBackdrop key={step.slug} step={step} />
                ))}
              </SceneStage>

              <NarrationBar
                transport={<TourTransport />}
                className="print:hidden"
              />

              {/* Every step's full text, as the flat site has it: on paper,
                  and on screen only without JavaScript (`globals.css`). Its
                  sections are not anchored: the fragment selects a step
                  rather than scrolling. */}
              <div
                data-path-text-panel
                className="path-card max-w-[46rem] px-6 py-6 md:px-8 print:max-w-none print:p-0"
              >
                {PATH_STEPS.map((step) => (
                  <div key={step.slug} data-path-panel={step.slug}>
                    <StepSection step={step} anchored={false} />
                  </div>
                ))}
              </div>
            </div>
          </OverlayRoot>
        </TourProvider>
      </StageStatusProvider>
    </RouteFrame>
  );
}
