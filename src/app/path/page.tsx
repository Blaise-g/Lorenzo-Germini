/*
THESIS: The 3D path, entered by choice: the same seven steps as `/`, walked one
scene at a time. The overlay paints first, over the step's still; the scene
then builds in its stage, and the tour plays the board by itself.
OWN-WORLD: Warm Print printed on card stock (comp B) — the step list, the text
panel, "Flat site" and the tour's die-cut tabs in two inks, serif places, mono
dates, terracotta for the pawn, the links and the way back.
STORY: Watch the path play from home, or pick a step like a track on a tape,
read what happened there, go back to the flat site at the same step.
FIRST VIEWPORT: The name, "Flat site", the path in small and the selected
step's text — all HTML, painted before any 3D.
FORM: Masthead row, then the board filling the first screen with the cards
lying on it — the step list and the tabs top-left, the text panel
bottom-right. On a phone: the board, the steps as a strip, the panel.
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
import {
  CAPTION_LIT_CSS,
  OVERLAY_FIRST_PAINT_SCRIPT,
  OVERLAY_PANEL_CSS,
} from "./first-paint";
import {
  FlatSiteLink,
  MarkEntered,
  OverlayRoot,
  PathStepList,
  RevealSelectedText,
} from "./overlay";
import { SceneStage } from "./scene-stage";
import { StageStatusProvider } from "./stage-status";
import { TourHoldPanel, TourProvider, TourTransport } from "./tour";
import { VoiceControls } from "./voice";
import type { VoiceManifest } from "./voice-manifest";
import voiceManifestJson from "../../../public/path/voice/manifest.json";

/* No markdown alternate and no sitemap entry: `/path` adds no content the flat
   site lacks, and `/` is the crawlable form (GH-141, implementation decision
   6). */
export const metadata: Metadata = {
  title: "The 3D path",
  description: `The path of ${RESUME_DATA.name}'s life, step by step: where he studied and worked, his roles and their results.`,
};

/* Written by `bun run generate:path-voice` beside the clips. The client gets
   each clip's URL and not its script, which is the panel's text already. */
const voiceManifest = voiceManifestJson as VoiceManifest;
const voiceClips = Object.fromEntries(
  Object.entries(voiceManifest.clips).map(([slug, clip]) => [slug, clip.src]),
);

/* The drawn path's node per step, as `/` draws it. */
function stepNode(step: PathStep): PathStepNode {
  if (step.sceneId === "home") return "home";
  return step.sceneId === "open" ? "open" : "place";
}

/* What the stage shows before the scene renders, and as the fallback: the
   step's still, one per mode. Server HTML for every step, shown by the same
   CSS as the panels, so a load of `/path#lille` paints Lille's before any
   JavaScript. Lazy, so only the shown step's still in the current mode
   downloads: Chromium does not fetch a lazy image that is `display: none`.
   Contained, so a phone's narrower stage shows the whole board. */
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
            className="size-full object-contain dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- as above. */}
          <img
            src={stills.dark}
            alt=""
            data-path-still="dark"
            loading="lazy"
            className="hidden size-full object-contain dark:block"
          />
        </>
      ) : null}
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
      <RevealSelectedText />
      {/* In `components`, as AGENTS.md asks of hand-written rules: unlayered,
          they would beat every utility, `print:` ones included. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@layer components{${OVERLAY_PANEL_CSS}${CAPTION_LIT_CSS}}`,
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
            <header className="border-ink flex items-center justify-between gap-6 border-b-2 py-3 lg:py-4">
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

            {/* The board is the hero (comp B). On a wide screen it fills the
                first screen and the printed cards lie on it: the step list and
                the tour's tabs down the left, the board's tabs under them, the
                text panel in the bottom-right corner. The camera keeps the
                board clear of the list and the selected tile clear of the
                panel too (`data-path-cover`). Long steps scroll
                inside the panel rather than push it off the screen: the
                longest runs past a whole screen.

                On a phone the cards cannot lie on a board 375px wide without
                hiding it, so they leave it (impeccable adapt: rethink, not
                scale). The board comes first, full width, with its tabs under
                it; then the steps as a strip that scrolls sideways, with the
                tour's tabs; then the panel, in the page's flow, which a pick
                scrolls into view. Print keeps only the selected step's text. */}
            <div
              data-path-world
              className="relative mt-4 flex flex-1 flex-col gap-y-5 lg:mt-6 lg:block lg:min-h-[36rem] print:mt-6 print:block"
            >
              <SceneStage className="max-lg:order-first max-lg:-mx-6 md:max-lg:-mx-10 lg:absolute lg:inset-0">
                {PATH_STEPS.map((step) => (
                  <StageBackdrop key={step.slug} step={step} />
                ))}
              </SceneStage>

              {/* The tour's keys work with focus anywhere in here. */}
              <div
                data-path-tour-keys
                data-path-cover="board"
                className="space-y-4 lg:absolute lg:top-0 lg:left-0 lg:w-[19rem] print:hidden"
              >
                <nav aria-labelledby="path-heading">
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
                <TourTransport />
              </div>

              {/* The text panel. Its sections are not anchored: the fragment
                  selects here rather than scrolling, and focus stays on the
                  step that was selected (storyboard §7.7). Pointing at it
                  or focusing in it holds the tour. The voice reads it, so
                  its controls are printed at its foot. */}
              <TourHoldPanel
                data-path-cover="step"
                footer={
                  <VoiceControls
                    clips={voiceClips}
                    providerName={voiceManifest.providerName}
                  />
                }
                className="lg:absolute lg:right-0 lg:bottom-0 lg:max-h-[min(30rem,55%)] lg:w-[22rem] xl:w-[27rem] print:static print:max-h-none print:w-auto"
              >
                {PATH_STEPS.map((step) => (
                  <div key={step.slug} data-path-panel={step.slug}>
                    <StepSection step={step} anchored={false} />
                  </div>
                ))}
              </TourHoldPanel>
            </div>
          </OverlayRoot>
        </TourProvider>
      </StageStatusProvider>
    </RouteFrame>
  );
}
