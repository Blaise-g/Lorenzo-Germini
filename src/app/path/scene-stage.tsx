"use client";

import { Repeat, RotateCcw, RotateCw, SkipForward } from "lucide-react";
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
import { isReplacingStep, pushStep } from "@/lib/path-state";
import { useSelectedStep } from "@/lib/use-path-state";
import { cn } from "@/lib/utils";

import { STAGE_COPY } from "./copy";
import { narrationFor } from "./narration";
import { useSetLitLines } from "./overlay";
import { playSound } from "./sound";
import { useNarrationCue, useSetStageStatus } from "./stage-status";

declare global {
  interface Window {
    __pathScene?: Pick<SceneRuntime, "locate" | "moment">;
  }
}
import { useTourStatus } from "./tour";

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
const FRAME_GAP_PX = 12;

/** The cards laid over the stage, `data-path-cover`, as the board must keep
 *  clear of them: no tile goes under one, nor the pawn's hop. Only the
 *  board's own tabs lie on it; the step list and the panel stand beside
 *  it. */
function measureFrame(stage: HTMLElement): StageFrame {
  const box = stage.getBoundingClientRect();
  const frame = {
    safe: { left: 0, top: 0, right: box.width, bottom: box.height },
    clear: [] as StageRect[],
  };
  for (const card of document.querySelectorAll<HTMLElement>(
    "[data-path-cover]",
  )) {
    const style = getComputedStyle(card);
    if (style.position !== "absolute" || style.display === "none") continue;
    const rect = card.getBoundingClientRect();
    frame.clear.push({
      left: rect.left - box.left - FRAME_GAP_PX,
      top: rect.top - box.top - FRAME_GAP_PX,
      right: rect.right - box.left + FRAME_GAP_PX,
      bottom: rect.bottom - box.top + FRAME_GAP_PX,
    });
  }
  return frame;
}

const IDLE: SceneSnapshot = {
  buildState: "idle",
  lit: [],
  shown: [],
  turn: 0,
  settled: false,
  shot: "idle",
};

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

  /* Whether the last change of step was the tour advancing by itself, which
     the board walks, rather than a pick, which it flies to: told apart
     inside the `hashchange` the change dispatches, the one place
     `isReplacingStep` answers. */
  const advancedRef = useRef(false);
  useEffect(() => {
    const onHashChange = () => {
      advancedRef.current = isReplacingStep();
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const show = useCallback((slug: PathStepSlug) => {
    shownSlugRef.current = slug;
    runtimeRef.current?.show(stepNamed(slug), {
      advance: advancedRef.current,
      narrationMs: narrationFor(slug).durationMs,
    });
    advancedRef.current = false;
  }, []);

  /* The board's camera follows the tour: its close-up drifts while the
     tour plays, freezes when it is paused, and pulls back to the whole
     board when it has ended. */
  const tourStatus = useTourStatus();
  const tourStatusRef = useRef(tourStatus);
  useEffect(() => {
    tourStatusRef.current = tourStatus;
    runtimeRef.current?.setTourState(tourStatus);
  }, [tourStatus]);

  /* The narration's beats (v3): as each cue starts playing, the prop it
     is about moves, with the voice on or off, since both follow the same
     clock. Once a cue: a pause and resume does not play it again. */
  const cue = useNarrationCue();
  const cuedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!cue) {
      cuedRef.current = null;
      return;
    }
    const key = `${cue.slug}:${cue.index}`;
    if (!cue.running || cuedRef.current === key) return;
    cuedRef.current = key;
    runtimeRef.current?.cue({
      slug: cue.slug,
      prop: cue.prop,
      index: cue.index,
    });
  }, [cue]);

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
          onEvent: playSound,
        });
      } catch {
        return fallBack("context-failed");
      }
      setMode("webgl");
      if (process.env.NODE_ENV !== "production") {
        /* For the suite and the clips: where a piece is, and a moment on
           demand. */
        const runtime = runtimeRef.current;
        window.__pathScene = {
          locate: (piece) => runtime.locate(piece),
          moment: (name) => runtime.moment(name),
        };
      }
      runtimeRef.current.setTourState(tourStatusRef.current);
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
      if (process.env.NODE_ENV !== "production") delete window.__pathScene;
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

  /* The tour's cue (`stage-status.tsx`): settled once the camera has
     landed on the selected step's close-up with the pawn on its tile, its
     build rising into the dwell (v3; the benchmark's §4(a)), and at once
     when the stage shows stills or the visitor asked for reduced motion. */
  const settled =
    mode === "fallback" ||
    !withScene ||
    Boolean(sceneStills) ||
    reducedMotion ||
    (live && snapshot.step === selected && snapshot.settled);
  useEffect(() => {
    setStageStatus({ slug: selected, settled });
  }, [selected, settled, setStageStatus]);

  /* Esc skips a running build from anywhere, and moves no focus. Once there
     is nothing to skip, Esc in the scene returns focus to the selected step
     in the list (storyboard §7.7): only from the stage or from no focus at
     all, so Esc on the voice controls or anywhere else leaves focus there.
     Only while a scene is on the stage. */
  const stageRef = useRef<HTMLDivElement>(null);

  /* The board is framed again as the stage changes size. */
  useEffect(() => {
    const box = stageBoxRef.current;
    if (mode !== "webgl" || !box) return;
    const observer = new ResizeObserver(() => {
      runtimeRef.current?.setFrame(measureFrame(box));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [mode]);

  /* The board's tabs arrive with the scene and leave with it, and Skip and
     Replay are not one width: the board makes room for them as they come
     and change, and takes their corner back once they have gone. */
  const measureCovers = useCallback((tabs: HTMLElement | null) => {
    if (!tabs) return;
    const reframe = () => {
      const box = stageBoxRef.current;
      if (box) runtimeRef.current?.setFrame(measureFrame(box));
    };
    /* Observing reports the tabs' size at once, so this frames them too. */
    const observer = new ResizeObserver(reframe);
    observer.observe(tabs);
    return () => {
      observer.disconnect();
      /* After the tabs have left the page, which they have not yet. */
      requestAnimationFrame(reframe);
    };
  }, []);

  /* A click on a tile, or on a card standing on it, selects its step, as
     its row in the list does; the list is the keyboard's way to it. A click
     on the tile being built, or off the tiles, skips the build. */
  /* What a fine pointer is over: another step's tile, or a piece that
     answers a click. */
  const [pointing, setPointing] = useState<"step" | "piece" | null>(null);
  const pointFrame = useRef(0);
  function tileAt(target: Element, clientX: number, clientY: number) {
    const box = target.getBoundingClientRect();
    return (
      runtimeRef.current?.pick(clientX - box.left, clientY - box.top) ?? null
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
  const reasonLine = !withScene
    ? null
    : sceneStills
      ? SCENE_FALLBACK_LINES[sceneStills](step.place)
      : mode === "fallback" && reason
        ? FALLBACK_REASON_LINES[reason]
        : null;

  return (
    <div ref={stageRef} className={cn("relative print:hidden", className)}>
      <div
        ref={stageBoxRef}
        data-path-stage
        data-scene-mode={mode}
        data-build-state={buildState}
        data-scene-props={shown.length > 0 ? shown.join(" ") : undefined}
        data-scene-step={snapshot.step}
        data-stage-settled={settled ? "" : undefined}
        data-camera-shot={mode === "webgl" ? snapshot.shot : undefined}
        data-scene-beat={mode === "webgl" ? snapshot.beat : undefined}
        data-scene-reaction={mode === "webgl" ? snapshot.reaction : undefined}
        data-scene-moment={mode === "webgl" ? snapshot.moment : undefined}
        data-fallback-reason={reason ?? sceneStills}
        className="relative h-[clamp(20rem,48svh,34rem)] w-full overflow-hidden lg:h-full"
      >
        {children}
        {/* The scene is an illustration of the text beside it, which carries
            every word, so it is hidden from the accessibility tree. A click
            on a tile selects its step; elsewhere it skips the build, as Skip
            and Esc do from the keyboard. */}
        <canvas
          ref={canvasRef}
          aria-hidden
          data-path-pointing={pointing ?? undefined}
          onClick={(event) => {
            const { currentTarget, clientX, clientY } = event;
            const slug = tileAt(currentTarget, clientX, clientY);
            if (slug && slug !== selected) return pushStep(slug);
            /* A piece on the shown tile, or the marker, answers the click;
               the step stays. */
            const box = currentTarget.getBoundingClientRect();
            const answered =
              buildState !== "building" &&
              runtimeRef.current?.react(clientX - box.left, clientY - box.top);
            if (!answered) runtimeRef.current?.skip();
          }}
          onPointerMove={(event) => {
            if (event.pointerType !== "mouse") return;
            const { clientX, clientY, currentTarget } = event;
            cancelAnimationFrame(pointFrame.current);
            pointFrame.current = requestAnimationFrame(() => {
              const slug = tileAt(currentTarget, clientX, clientY);
              const elsewhere = Boolean(slug && slug !== selected);
              const box = currentTarget.getBoundingClientRect();
              /* A piece that answers a click lights faintly under it. */
              const answers =
                !elsewhere &&
                buildState !== "building" &&
                Boolean(
                  runtimeRef.current?.hover(
                    clientX - box.left,
                    clientY - box.top,
                  ),
                );
              if (elsewhere || buildState === "building") {
                runtimeRef.current?.hover(null);
              }
              setPointing(elsewhere ? "step" : answers ? "piece" : null);
            });
          }}
          onPointerLeave={() => {
            cancelAnimationFrame(pointFrame.current);
            runtimeRef.current?.hover(null);
            setPointing(null);
          }}
          className={cn(
            "absolute inset-0 size-full",
            live ? "visible" : "invisible",
            (pointing || buildState === "building") && "cursor-pointer",
          )}
        />
      </div>

      {/* The board's own controls: tabs cut from the tour's card, laid in
          a corner of the board's frame, where the board keeps clear of them:
          the bottom-left on a wide screen; the bottom-right on a phone, as
          icons. A phone's board is as wide as the screen and no corner of it
          is free, so the tabs take a band of the stage under the board: the
          stage's spare height, which a board that wide does not use. As
          icons the band is as light as it can be.
          Laid over the stage rather than in a row of their own, so nothing
          moves when they arrive. */}
      {live && buildState !== "idle" ? (
        <div
          ref={measureCovers}
          data-path-board-controls
          data-path-cover
          className="absolute right-6 bottom-3 flex items-center gap-2 md:right-10 lg:right-auto lg:bottom-0 lg:left-0"
        >
          <button
            type="button"
            data-path-build-control
            aria-disabled={loading || undefined}
            className={cn(TAB_CLASS_NAME, "max-lg:min-w-11 max-lg:px-0")}
            onClick={() => {
              if (loading) return;
              if (buildState === "building") runtimeRef.current?.skip();
              else {
                /* The replay rests the tile's pieces: the cue playing now
                   may play its beat again. */
                cuedRef.current = null;
                runtimeRef.current?.replay();
              }
            }}
          >
            {/* Its word on a wide screen; on a phone, its sign, so the
                three tabs fit in the board's corner beside Lille. */}
            <span className="path-tab-face max-lg:sr-only">
              {buildState === "building" ? STAGE_COPY.skip : STAGE_COPY.replay}
            </span>
            {buildState === "building" ? (
              <SkipForward
                aria-hidden
                className="path-tab-face size-4 lg:hidden"
              />
            ) : (
              <Repeat aria-hidden className="path-tab-face size-4 lg:hidden" />
            )}
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
        </div>
      ) : null}
      {/* Why the stage shows stills, printed small in its bottom-left
          corner, over the still's bare paper. */}
      {reasonLine ? (
        <p
          data-path-fallback-reason
          className="text-faint absolute bottom-2 left-6 text-xs md:left-10 lg:left-0"
        >
          {reasonLine}
        </p>
      ) : null}

      {/* One polite announcement per scene shown (storyboard §7.4). */}
      <p aria-live="polite" className="sr-only">
        {mode !== "pending" && withScene ? STAGE_COPY.showing(step.place) : ""}
      </p>
    </div>
  );
}
