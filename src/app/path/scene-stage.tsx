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
  type FallbackReason,
} from "@/components/path/scene/fallback";
import type {
  SceneRuntime,
  SceneSnapshot,
} from "@/components/path/scene/runtime";
import { PATH_STEPS } from "@/data/path";
import { useSelectedStep } from "@/lib/use-path-state";
import { cn } from "@/lib/utils";

import { useSetLitLines } from "./overlay";

/* The scene stage on `/path` (GH-148): page interface around the scene, so it
   keeps the seven colour roles (ADR-0008). Before any 3D it shows the
   selected step's still, which is server HTML passed in as `children`; the
   runtime is imported after the overlay has painted, and only when the
   browser can run it (storyboard §7.4). */

const COPY = {
  skip: "Skip",
  replay: "Replay",
  turnLeft: "Turn the scene left",
  turnRight: "Turn the scene right",
  showing: (place: string) => `Showing: ${place}`,
};

type Mode = "pending" | "webgl" | "fallback";

const CONTROL_CLASS_NAME =
  "touch-target text-accent decoration-border hover:decoration-accent font-label text-xs tracking-[0.12em] uppercase underline underline-offset-4 disabled:text-faint disabled:no-underline";

const TURN_CLASS_NAME =
  "border-border text-faint hover:border-ink hover:text-ink transition-refined inline-flex size-9 items-center justify-center rounded-md border disabled:pointer-events-none disabled:opacity-50";

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
  const [snapshot, setSnapshot] = useState<SceneSnapshot>({
    buildState: "idle",
    lit: [],
    shown: [],
    turn: 0,
  });
  const buildStateRef = useRef<BuildState>("idle");
  buildStateRef.current = snapshot.buildState;

  const fallBack = useCallback(
    (next: FallbackReason) => {
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
      setReason(next);
      setMode("fallback");
      setSnapshot({ buildState: "idle", lit: [], shown: [], turn: 0 });
      setLitLines([]);
    },
    [setLitLines],
  );

  /* Capabilities first, so a browser that gets the stills fetches no 3D
     code; then the runtime, in its own chunk. */
  useEffect(() => {
    let cancelled = false;
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
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches,
          onChange(next) {
            setSnapshot(next);
            setLitLines(next.lit);
          },
          onFallback: fallBack,
        });
        setMode("webgl");
      } catch {
        fallBack("context-failed");
      }
    }
    void start();
    return () => {
      cancelled = true;
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, [fallBack, setLitLines]);

  /* Selecting a step cuts to its scene and builds it, and nothing else does:
     the build never advances to another step on its own. */
  useEffect(() => {
    if (mode === "webgl") runtimeRef.current?.show(stepNamed(selected));
  }, [mode, selected]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => runtimeRef.current?.setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  /* Esc skips the build; once there is nothing to skip, it returns focus to
     the selected step in the list (storyboard §7.7). */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (buildStateRef.current === "building") {
        runtimeRef.current?.skip();
        return;
      }
      document
        .querySelector<HTMLElement>(`[data-path-step-link="${selected}"]`)
        ?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const withScene = hasScene(step);
  const live = mode === "webgl" && withScene;
  const { buildState, shown, turn } = snapshot;

  return (
    <div className="print:hidden">
      <div
        data-path-stage
        data-scene-mode={mode}
        data-build-state={buildState}
        data-scene-props={shown.length > 0 ? shown.join(" ") : undefined}
        data-fallback-reason={reason ?? undefined}
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
              className={CONTROL_CLASS_NAME}
              onClick={() =>
                buildState === "building"
                  ? runtimeRef.current?.skip()
                  : runtimeRef.current?.replay()
              }
            >
              {buildState === "building" ? COPY.skip : COPY.replay}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                aria-label={COPY.turnLeft}
                title={COPY.turnLeft}
                disabled={turn <= -TURN_LIMIT}
                className={TURN_CLASS_NAME}
                onClick={() => runtimeRef.current?.turn(-1)}
              >
                <RotateCcw aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                aria-label={COPY.turnRight}
                title={COPY.turnRight}
                disabled={turn >= TURN_LIMIT}
                className={TURN_CLASS_NAME}
                onClick={() => runtimeRef.current?.turn(1)}
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
      </div>

      {/* One polite announcement per scene shown (storyboard §7.4). */}
      <p aria-live="polite" className="sr-only">
        {mode !== "pending" && withScene ? COPY.showing(step.place) : ""}
      </p>
    </div>
  );
}
