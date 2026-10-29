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
import { useSelectedStep } from "@/lib/use-path-state";
import { cn } from "@/lib/utils";

import { STAGE_COPY } from "./copy";
import { useSetLitLines } from "./overlay";

/* The scene stage on `/path` (GH-148): page interface around the scene, so it
   keeps the seven colour roles (ADR-0008). Before any 3D it shows the
   selected step's still, which is server HTML passed in as `children`; the
   runtime is imported after the overlay has painted, and only when the
   browser can run it (storyboard §7.4). */

type Mode = "pending" | "webgl" | "fallback";

/** The stage's text controls, shared with the voice's beside them. */
export const CONTROL_CLASS_NAME =
  "touch-target text-accent decoration-border hover:decoration-accent font-label text-xs tracking-[0.12em] uppercase underline underline-offset-4 disabled:text-faint disabled:no-underline aria-disabled:text-faint aria-disabled:no-underline aria-disabled:cursor-default";

const TURN_CLASS_NAME =
  "border-border text-faint hover:border-ink hover:text-ink transition-refined inline-flex size-9 items-center justify-center rounded-md border disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const IDLE: SceneSnapshot = { buildState: "idle", lit: [], shown: [], turn: 0 };

function stepNamed(slug: string) {
  return PATH_STEPS.find((step) => step.slug === slug)!;
}

export function SceneStage({ children }: { children: ReactNode }) {
  const { selected } = useSelectedStep();
  const step = stepNamed(selected);
  const setLitLines = useSetLitLines();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const [mode, setMode] = useState<Mode>("pending");
  const [reason, setReason] = useState<FallbackReason | null>(null);
  const [snapshot, setSnapshot] = useState<SceneSnapshot>(IDLE);
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
    const onMotionChange = () =>
      runtimeRef.current?.setReducedMotion(reducedMotion.matches);
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

  /* Selecting a step cuts to its scene and builds it, and nothing else does:
     the build never advances to another step on its own. */
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

  /* Esc skips a running build from anywhere, and moves no focus. Once there
     is nothing to skip, Esc in the scene returns focus to the selected step
     in the list (storyboard §7.7): only from the stage or from no focus at
     all, so Esc on the voice controls or anywhere else leaves focus there.
     Only while a scene is on the stage. */
  const stageRef = useRef<HTMLDivElement>(null);
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
    <div ref={stageRef} className="print:hidden">
      <div
        data-path-stage
        data-scene-mode={mode}
        data-build-state={buildState}
        data-scene-props={shown.length > 0 ? shown.join(" ") : undefined}
        data-fallback-reason={reason ?? sceneStills}
        className="relative h-[clamp(14rem,42vh,28rem)] w-full overflow-hidden"
      >
        {children}
        {/* The scene is an illustration of the text beside it, which carries
            every word, so it is hidden from the accessibility tree. A click
            on it skips the build; Skip and Esc do the same from the keyboard. */}
        <canvas
          ref={canvasRef}
          aria-hidden
          onClick={() => runtimeRef.current?.skip()}
          className={cn(
            "absolute inset-0 size-full",
            live ? "visible" : "invisible",
            buildState === "building" && "cursor-pointer",
          )}
        />
      </div>

      {/* One row of fixed height, whatever it holds, so the panel under it
          never moves when the controls arrive or the reason replaces them. */}
      <div className="flex h-11 items-center gap-6">
        {live && buildState !== "idle" ? (
          <>
            <button
              type="button"
              data-path-build-control
              aria-disabled={loading || undefined}
              className={CONTROL_CLASS_NAME}
              onClick={() => {
                if (loading) return;
                if (buildState === "building") runtimeRef.current?.skip();
                else runtimeRef.current?.replay();
              }}
            >
              {buildState === "building" ? STAGE_COPY.skip : STAGE_COPY.replay}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                aria-label={STAGE_COPY.turnLeft}
                title={STAGE_COPY.turnLeft}
                disabled={turn <= -TURN_LIMIT}
                aria-disabled={loading || undefined}
                className={TURN_CLASS_NAME}
                onClick={() => {
                  if (!loading) runtimeRef.current?.turn(-1);
                }}
              >
                <RotateCcw aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                aria-label={STAGE_COPY.turnRight}
                title={STAGE_COPY.turnRight}
                disabled={turn >= TURN_LIMIT}
                aria-disabled={loading || undefined}
                className={TURN_CLASS_NAME}
                onClick={() => {
                  if (!loading) runtimeRef.current?.turn(1);
                }}
              >
                <RotateCw aria-hidden className="size-4" />
              </button>
            </div>
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
