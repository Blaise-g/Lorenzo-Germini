"use client";

import { RotateCcw, RotateCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  hasScene,
  TURN_LIMIT,
  type BuildState,
} from "@/components/path/scene/build-plan";
import { probeCapabilities } from "@/components/path/scene/capabilities";
import type { StageFrame, StageRect } from "@/components/path/scene/frame";
import {
  decideFallback,
  FALLBACK_REASON_LINES,
  SCENE_FALLBACK_LINES,
  type FallbackReason,
} from "@/components/path/scene/fallback";
import type {
  SceneRuntime,
  SceneSnapshot,
} from "@/components/path/scene/runtime";
import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";
import { pushStep } from "@/lib/path-state";
import { useSelectedStep } from "@/lib/use-path-state";
import { cn } from "@/lib/utils";

import { STAGE_COPY } from "./copy";
import { useSetLitLines } from "./overlay";
import { useSetStageStatus } from "./stage-status";

/* The board's stage on `/path` (GH-148): page interface around the 3D board,
   so it keeps the seven colour roles (ADR-0008). Before any 3D it shows the
   selected step's still, which is server HTML passed in as `children`; the
   runtime is imported after the overlay has painted, and only when the
   browser can run it (storyboard §7.4). It follows the selected step, and
   tells the tour when that step has settled: the pawn landed and the tile
   built, or at once when there is nothing to wait for. */

type Mode = "pending" | "webgl" | "fallback";

/** The voice's text controls, printed in the accent like a link. */
export const CONTROL_CLASS_NAME =
  "touch-target text-accent decoration-border hover:decoration-accent font-label text-xs tracking-[0.12em] uppercase underline underline-offset-4 disabled:text-faint disabled:no-underline aria-disabled:text-faint aria-disabled:no-underline aria-disabled:cursor-default";

/** The board's own controls are tabs cut from the same card as the tour's. */
const TAB_CLASS_NAME = "path-tab press transition-refined";

/** Room left between a card laid over the stage and the board. */
const FRAME_GAP_PX = 24;

/** The cards laid over the stage, as the board must keep clear of them. A
 *  card marked `data-path-cover="board"` — the step list, the board's tabs —
 *  no tile goes under; one marked `"step"` — the text panel — the selected
 *  tile does not go under. A card in the page's flow, as on a phone, covers
 *  nothing. */
function measureFrame(stage: HTMLElement): StageFrame {
  const box = stage.getBoundingClientRect();
  const frame = {
    safe: { left: 0, top: 0, right: box.width, bottom: box.height },
    clear: [] as StageRect[],
    avoid: [] as StageRect[],
  };
  for (const card of document.querySelectorAll<HTMLElement>(
    "[data-path-cover]",
  )) {
    const style = getComputedStyle(card);
    if (style.position !== "absolute" || style.display === "none") continue;
    const rect = card.getBoundingClientRect();
    const covered = {
      left: rect.left - box.left - FRAME_GAP_PX,
      top: rect.top - box.top - FRAME_GAP_PX,
      right: rect.right - box.left + FRAME_GAP_PX,
      bottom: rect.bottom - box.top + FRAME_GAP_PX,
    };
    (card.dataset.pathCover === "step" ? frame.avoid : frame.clear).push(
      covered,
    );
  }
  return frame;
}

const IDLE: SceneSnapshot = { buildState: "idle", lit: [], shown: [], turn: 0 };

function stepNamed(slug: string) {
  return PATH_STEPS.find((step) => step.slug === slug)!;
}

export function SceneStage({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { selected } = useSelectedStep();
  const step = stepNamed(selected);
  const setLitLines = useSetLitLines();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const stageBoxRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("pending");
  const [reason, setReason] = useState<FallbackReason | null>(null);
  const [snapshot, setSnapshot] = useState<SceneSnapshot>(IDLE);
  const [reducedMotion, setReducedMotion] = useState(false);
  const setStageStatus = useSetStageStatus();
  /* The step the runtime was last told to show, so its lit lines are
     attributed to it and not to whatever step the overlay shows next. */
  const shownSlugRef = useRef<PathStepSlug>(selected);
  const selectedRef = useRef<PathStepSlug>(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const fallBack = useCallback(
    (next: FallbackReason) => {
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
      setReason(next);
      setMode("fallback");
      setSnapshot(IDLE);
      setLitLines({ slug: shownSlugRef.current, lines: [] });
    },
    [setLitLines],
  );

  const show = useCallback((slug: PathStepSlug) => {
    shownSlugRef.current = slug;
    runtimeRef.current?.show(stepNamed(slug));
  }, []);

  /* Capabilities first, so a browser that gets the stills fetches no 3D
     code; then the runtime, in its own chunk. A new runtime shows the
     selected step at once, so one made again (Fast Refresh) is never blank. */
  useEffect(() => {
    let cancelled = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(reducedMotion.matches);
    const onMotionChange = () => {
      setReducedMotion(reducedMotion.matches);
      runtimeRef.current?.setReducedMotion(reducedMotion.matches);
    };
    reducedMotion.addEventListener("change", onMotionChange);

    async function start() {
      const signals = probeCapabilities();
      const early = decideFallback(signals);
      if (early) return fallBack(early);
      const { createSceneRuntime } =
        await import("@/components/path/scene/runtime");
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      try {
        runtimeRef.current = createSceneRuntime({
          canvas,
          signals,
          reducedMotion: reducedMotion.matches,
          onChange(next) {
            setSnapshot(next);
            setLitLines({ slug: shownSlugRef.current, lines: next.lit });
          },
          onFallback: fallBack,
        });
      } catch {
        return fallBack("context-failed");
      }
      setMode("webgl");
      if (stageBoxRef.current) {
        runtimeRef.current.setFrame(measureFrame(stageBoxRef.current));
      }
      show(selectedRef.current);
    }
    void start();
    return () => {
      cancelled = true;
      reducedMotion.removeEventListener("change", onMotionChange);
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
      setMode("pending");
      setSnapshot(IDLE);
    };
  }, [fallBack, setLitLines, show]);

  /* Selecting a step moves the pawn to its tile and builds it. The stage
     never advances to another step itself: the tour does that. */
  useEffect(() => {
    show(selected);
  }, [selected, show]);

  const withScene = hasScene(step);
  /* A scene that could not load or build shows its stills; the stage keeps
     running for the next one. */
  const sceneStills =
    mode === "webgl" && snapshot.stills?.slug === selected
      ? snapshot.stills.reason
      : undefined;
  const live = mode === "webgl" && withScene && !sceneStills;

  /* The tour's cue (`stage-status.tsx`): settled once the pawn has landed
     on the selected step and its tile is built, and at once when the stage
     shows stills or the visitor asked for reduced motion. */
  const settled =
    mode === "fallback" ||
    !withScene ||
    Boolean(sceneStills) ||
    reducedMotion ||
    (live && snapshot.step === selected && snapshot.buildState === "built");
  useEffect(() => {
    setStageStatus({ slug: selected, settled });
  }, [selected, settled, setStageStatus]);

  /* Esc skips a running build from anywhere, and moves no focus. Once there
     is nothing to skip, Esc in the scene returns focus to the selected step
     in the list (storyboard §7.7): only from the stage or from no focus at
     all, so Esc on the voice controls or anywhere else leaves focus there.
     Only while a scene is on the stage. */
  const stageRef = useRef<HTMLDivElement>(null);

  /* The board keeps clear of the cards laid over it, measured again as the
     stage changes size. */
  useEffect(() => {
    const box = stageBoxRef.current;
    if (mode !== "webgl" || !box) return;
    const observer = new ResizeObserver(() => {
      runtimeRef.current?.setFrame(measureFrame(box));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [mode]);

  /* A click on a tile, or on a card standing on it, selects its step, as
     its row in the list does; the list is the keyboard's way to it. A click
     on the tile being built, or off the tiles, skips the build. */
  const [pointing, setPointing] = useState(false);
  const pointFrame = useRef(0);
  function tileAt(event: React.PointerEvent | React.MouseEvent) {
    const box = event.currentTarget.getBoundingClientRect();
    return (
      runtimeRef.current?.pick(
        event.clientX - box.left,
        event.clientY - box.top,
      ) ?? null
    );
  }

  useEffect(() => {
    if (!live) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (runtimeRef.current?.skip()) return;
      const focused = document.activeElement;
      const inScene =
        !focused ||
        focused === document.body ||
        stageRef.current?.contains(focused);
      if (!inScene) return;
      document
        .querySelector<HTMLElement>(`[data-path-step-link="${selected}"]`)
        ?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [live, selected]);

  /* While the runtime loads, a step with a scene is `loading`. */
  const buildState: BuildState =
    mode === "pending" && withScene ? "loading" : snapshot.buildState;
  const { shown, turn } = snapshot;
  /* While a scene's assets load there is nothing to replay or turn. The
     controls stay, marked unavailable rather than `disabled`, so one that
     has focus when a Back lands on a loading scene keeps it. */
  const loading = buildState === "loading";

  return (
    <div ref={stageRef} className={cn("print:hidden", className)}>
      <div
        ref={stageBoxRef}
        data-path-stage
        data-scene-mode={mode}
        data-build-state={buildState}
        data-scene-props={shown.length > 0 ? shown.join(" ") : undefined}
        data-scene-step={snapshot.step}
        data-stage-settled={settled ? "" : undefined}
        data-fallback-reason={reason ?? sceneStills}
        className="relative h-[clamp(15rem,72vw,26rem)] w-full overflow-hidden lg:h-full"
      >
        {children}
        {/* The scene is an illustration of the text beside it, which carries
            every word, so it is hidden from the accessibility tree. A click
            on a tile selects its step; elsewhere it skips the build, as Skip
            and Esc do from the keyboard. */}
        <canvas
          ref={canvasRef}
          aria-hidden
          onClick={(event) => {
            const slug = tileAt(event);
            if (slug && slug !== selected) pushStep(slug);
            else runtimeRef.current?.skip();
          }}
          onPointerMove={(event) => {
            if (event.pointerType !== "mouse") return;
            const { clientX, clientY, currentTarget } = event;
            cancelAnimationFrame(pointFrame.current);
            pointFrame.current = requestAnimationFrame(() => {
              const box = currentTarget.getBoundingClientRect();
              const slug = runtimeRef.current?.pick(
                clientX - box.left,
                clientY - box.top,
              );
              setPointing(Boolean(slug && slug !== selected));
            });
          }}
          onPointerLeave={() => {
            cancelAnimationFrame(pointFrame.current);
            setPointing(false);
          }}
          className={cn(
            "absolute inset-0 size-full",
            live ? "visible" : "invisible",
            (pointing || buildState === "building") && "cursor-pointer",
          )}
        />
      </div>

      {/* One row of fixed height, whatever it holds, so nothing under it
          moves when the controls arrive or the reason replaces them. Tabs
          cut from the tour's card: the board's own controls. */}
      <div
        data-path-board-controls
        data-path-cover="board"
        className="mt-3 flex min-h-11 items-center gap-3 max-lg:px-6 md:max-lg:px-10 lg:absolute lg:bottom-0 lg:left-0 lg:mt-0 lg:max-w-[19rem]"
      >
        {live && buildState !== "idle" ? (
          <>
            <button
              type="button"
              data-path-build-control
              aria-disabled={loading || undefined}
              className={TAB_CLASS_NAME}
              onClick={() => {
                if (loading) return;
                if (buildState === "building") runtimeRef.current?.skip();
                else runtimeRef.current?.replay();
              }}
            >
              <span className="path-tab-face">
                {buildState === "building"
                  ? STAGE_COPY.skip
                  : STAGE_COPY.replay}
              </span>
            </button>
            <button
              type="button"
              aria-label={STAGE_COPY.turnLeft}
              title={STAGE_COPY.turnLeft}
              aria-disabled={turn <= -TURN_LIMIT || loading || undefined}
              data-shape="square"
              className={TAB_CLASS_NAME}
              onClick={() => {
                if (!loading) runtimeRef.current?.turn(-1);
              }}
            >
              <RotateCcw aria-hidden className="path-tab-face size-4" />
            </button>
            <button
              type="button"
              aria-label={STAGE_COPY.turnRight}
              title={STAGE_COPY.turnRight}
              aria-disabled={turn >= TURN_LIMIT || loading || undefined}
              data-shape="square"
              className={TAB_CLASS_NAME}
              onClick={() => {
                if (!loading) runtimeRef.current?.turn(1);
              }}
            >
              <RotateCw aria-hidden className="path-tab-face size-4" />
            </button>
          </>
        ) : null}
        {mode === "fallback" && reason && withScene ? (
          <p data-path-fallback-reason className="text-faint text-xs">
            {FALLBACK_REASON_LINES[reason]}
          </p>
        ) : null}
        {sceneStills && withScene ? (
          <p data-path-fallback-reason className="text-faint text-xs">
            {SCENE_FALLBACK_LINES[sceneStills](step.place)}
          </p>
        ) : null}
      </div>

      {/* One polite announcement per scene shown (storyboard §7.4). */}
      <p aria-live="polite" className="sr-only">
        {mode !== "pending" && withScene ? STAGE_COPY.showing(step.place) : ""}
      </p>
    </div>
  );
}
