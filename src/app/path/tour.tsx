"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";
import { pushStep, replaceStep, stepFromFragment } from "@/lib/path-state";
import { useSelectedStep } from "@/lib/use-path-state";
import { cn } from "@/lib/utils";

import { TOUR_COPY } from "./copy";
import { useStageStatus } from "./stage-status";
import {
  dwellMs,
  FIRST_STEP,
  LAST_STEP,
  startClock,
  stepAfter,
  stepBefore,
  timingReducer,
  type StepClock,
  type Timing,
} from "./tour-clock";

/* The tour on `/path`: the board plays itself, step by step, and the visitor
   can skip to any step like a tape. It drives the selection, the one thing
   the stage, the panels and the voice already follow, and nothing else.

   - Playing: at each step it waits for the stage to report the step settled
     (`stage-status.tsx`), at most `SETTLE_MAX_WAIT_MS`, then dwells for the
     panel's reading time (`tour-clock.ts`), then replaces the history entry
     with the next step, so Back skips the auto-steps. It stops at the last.
   - Picking a step — the list, Back, Forward, Previous, Next — pushes as
     before, and the tour carries on from there, after the end too.
   - Paused: one click on the middle tab or the K key (WCAG 2.2.2), and on the
     tab going hidden, where it stays when the tab returns. Under reduced
     motion it starts paused and plays nothing until asked.
   - Held: while the pointer is over the text panel or focus is in it, and
     while the voice is still reading the step, the clock stops without
     pausing, so nothing moves on under someone reading or listening.

   Keys, with focus in the step list or on the tabs and no modifier: K plays
   or pauses, J goes to the previous step, L to the next. */

export type TourStatus = "playing" | "paused" | "ended";

type Hold = "pointer" | "focus";

type TourContextValue = {
  status: TourStatus;
  /** The selected step's clock, and whether it is running. */
  clock: StepClock;
  running: boolean;
  togglePlay: () => void;
  previous: () => void;
  next: () => void;
  setHold: (hold: Hold, on: boolean) => void;
  setNarrating: (slug: PathStepSlug | null) => void;
};

const TourContext = createContext<TourContextValue | null>(null);

function useTour(): TourContextValue {
  const tour = useContext(TourContext);
  if (!tour) throw new Error("The tour's leaves need a TourProvider");
  return tour;
}

/** For the voice: tells the tour which step it is reading aloud, so the tour
 *  does not move on in the middle of a sentence. Outside a tour, it does
 *  nothing. */
export function useSetNarrating() {
  return useContext(TourContext)?.setNarrating ?? noop;
}

function noop() {}

const stepsBySlug = new Map(PATH_STEPS.map((step) => [step.slug, step]));
const stepNamed = (slug: PathStepSlug) => stepsBySlug.get(slug)!;
const dwellFor = (slug: PathStepSlug) => dwellMs(stepNamed(slug));

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the visitor allows motion. False on the server and through
 *  hydration, so the tour hydrates paused and plays from the next render. */
function useMotionAllowed() {
  return useSyncExternalStore(
    subscribeToMotion,
    () => !window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** The tour's keys work only with focus in the step list or on the tabs —
 *  `data-path-tour-keys` — so a single-letter key typed anywhere else on the
 *  page is never taken from it (WCAG 2.1.4). */
function inKeyScope(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("[data-path-tour-keys]") !== null
  );
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { selected } = useSelectedStep();
  const stage = useStageStatus();
  const motionAllowed = useMotionAllowed();
  /* Play or pause as the visitor or a hidden tab last chose; until then the
     tour plays where motion is allowed and waits where it is not. */
  const [chosen, setChosen] = useState<"playing" | "paused" | null>(null);
  const [holds, setHolds] = useState<Record<Hold, boolean>>({
    pointer: false,
    focus: false,
  });
  const [narrating, setNarrating] = useState<PathStepSlug | null>(null);

  /* Each step gets a new clock, whatever selected it (`timingReducer`). Until
     the new step's clock has started, this render shows a fresh one and
     nothing acts on it. */
  const [timing, dispatch] = useReducer(
    timingReducer,
    selected,
    (slug): Timing => ({ slug, clock: startClock(dwellFor(slug)) }),
  );
  const timed = timing.slug === selected;
  const clock = timed ? timing.clock : startClock(dwellFor(selected));
  useLayoutEffect(() => {
    dispatch({ type: "start", slug: selected, dwell: dwellFor(selected) });
  }, [selected]);

  /* The stage settling this step starts its dwell; once dwelling, a later or
     repeated report changes nothing. The stage reports on every change of
     step, from what it shows then, so a report naming this step is this
     visit's: back on a step built before, it reports it unsettled until it
     has built it again. */
  useEffect(() => {
    if (stage.slug === selected && stage.settled) {
      dispatch({ type: "settle", slug: selected });
    }
  }, [stage, selected, timing.slug]);

  const playing =
    (chosen ?? (motionAllowed ? "playing" : "paused")) === "playing";
  /* The last step, played to its end and no longer being read aloud. Picking
     any step starts a new clock, so the tour plays on from there. */
  const finished =
    clock.phase === "done" && narrating !== selected && selected === LAST_STEP;
  const status: TourStatus = !playing
    ? "paused"
    : finished
      ? "ended"
      : "playing";
  const running = status === "playing" && !holds.pointer && !holds.focus;
  const atEnd = clock.phase === "done" && selected === LAST_STEP;
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  /* On entering, the tour plays from the fragment's step. The first-paint
     script has already put a bare `/path` on the first step's fragment; a
     client-side arrival, which runs no inline script, gets it here. */
  useLayoutEffect(() => {
    if (window.matchMedia(REDUCED_MOTION).matches) return;
    if (!stepFromFragment(window.location.hash)) replaceStep(FIRST_STEP);
  }, []);

  /* The clock runs only while the tour plays and nothing holds it. Stopping
     it keeps what is left of the phase, so a pause or a hold resumes where it
     was. The identity checks leave alone a clock that a new step or a settle
     has already replaced. */
  useEffect(() => {
    if (!running || !timed || clock.phase === "done") return;
    const started = performance.now();
    const timer = window.setTimeout(() => {
      dispatch({ type: "elapse", from: clock, ms: clock.remaining });
    }, clock.remaining);
    return () => {
      window.clearTimeout(timer);
      const elapsed = performance.now() - started;
      dispatch({ type: "elapse", from: clock, ms: elapsed });
    };
  }, [running, timed, clock]);

  /* A finished step moves on, once the voice has finished reading it, and
     not while the visitor is reading the panel. */
  useEffect(() => {
    if (!running || !timed || clock.phase !== "done") return;
    if (narrating === selected) return;
    const after = stepAfter(selected);
    if (after) replaceStep(after);
  }, [clock.phase, running, timed, narrating, selected]);

  /* A hidden tab pauses the tour, and it stays paused when the tab returns:
     the visitor comes back to the step they left, not three steps on. */
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== "hidden") return;
      if (statusRef.current === "playing") setChosen("paused");
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const togglePlay = useCallback(() => {
    if (status === "playing") return setChosen("paused");
    /* From the end — reached, or reached while paused — it plays again from
       the start, a step the visitor chose. */
    if (status === "ended" || atEnd) pushStep(FIRST_STEP);
    setChosen("playing");
  }, [status, atEnd]);

  const previous = useCallback(() => {
    const before = stepBefore(selected);
    if (before) pushStep(before);
  }, [selected]);

  const next = useCallback(() => {
    const after = stepAfter(selected);
    if (after) pushStep(after);
  }, [selected]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (!inKeyScope(event.target)) return;
      const action = { k: togglePlay, j: previous, l: next }[
        event.key.toLowerCase()
      ];
      if (!action) return;
      event.preventDefault();
      action();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [togglePlay, previous, next]);

  const setHold = useCallback((hold: Hold, on: boolean) => {
    setHolds((current) =>
      current[hold] === on ? current : { ...current, [hold]: on },
    );
  }, []);

  const value = useMemo(
    () => ({
      status,
      clock,
      running,
      togglePlay,
      previous,
      next,
      setHold,
      setNarrating,
    }),
    [status, clock, running, togglePlay, previous, next, setHold],
  );

  return <TourContext value={value}>{children}</TourContext>;
}

const PLAY_LABEL: Record<TourStatus, string> = {
  playing: TOUR_COPY.pause,
  paused: TOUR_COPY.play,
  ended: TOUR_COPY.restart,
};

const PLAY_NAME: Record<TourStatus, string> = {
  playing: TOUR_COPY.pauseName,
  paused: TOUR_COPY.playName,
  ended: TOUR_COPY.restartName,
};

/** Previous, play or pause, and next, as die-cut card tabs, with the tour's
 *  announcement. Previous and Next stay focusable at the ends, marked
 *  unavailable rather than `disabled`, so focus is not dropped to the page. */
export function TourTransport({ className }: { className?: string }) {
  const { status, clock, previous, next, togglePlay } = useTour();
  const { selected } = useSelectedStep();
  const atStart = selected === FIRST_STEP;
  const atEnd = selected === LAST_STEP;

  /* One polite line per step played, distinct from the stage's "Showing". */
  const announcement =
    status === "playing"
      ? TOUR_COPY.nowPlaying(stepNamed(selected).place)
      : status === "ended"
        ? TOUR_COPY.ended
        : "";

  return (
    <div
      data-path-tour={status}
      data-path-tour-phase={clock.phase}
      role="group"
      aria-label={TOUR_COPY.transport}
      className={cn("print:hidden", className)}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-path-tour-previous
          data-shape="back"
          aria-label={TOUR_COPY.previousName}
          aria-keyshortcuts="J"
          title={TOUR_COPY.previousTitle}
          aria-disabled={atStart || undefined}
          className="path-tab press transition-refined"
          onClick={previous}
        >
          <span className="path-tab-face">{TOUR_COPY.previous}</span>
        </button>
        <button
          type="button"
          data-path-tour-play
          data-shape="primary"
          aria-label={PLAY_NAME[status]}
          aria-keyshortcuts="K"
          title={TOUR_COPY.playTitle}
          className="path-tab press transition-refined"
          onClick={togglePlay}
        >
          <span className="path-tab-face">{PLAY_LABEL[status]}</span>
        </button>
        <button
          type="button"
          data-path-tour-next
          data-shape="on"
          aria-label={TOUR_COPY.nextName}
          aria-keyshortcuts="L"
          title={TOUR_COPY.nextTitle}
          aria-disabled={atEnd || undefined}
          className="path-tab press transition-refined"
          onClick={next}
        >
          <span className="path-tab-face">{TOUR_COPY.next}</span>
        </button>
      </div>
      <p className="text-faint font-label mt-3 hidden text-[0.6875rem] tracking-[0.12em] uppercase pointer-fine:block">
        {TOUR_COPY.keys}
      </p>
      <p aria-live="polite" data-path-tour-announcement className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/** The selected step's dwell, as a printed line that runs out under its row:
 *  how long until the tour moves on. Only while dwelling, and never under
 *  reduced motion, where the tour shows no progress at all. Linear, because
 *  it is a measure of time. */
export function TourProgress() {
  const { clock, running } = useTour();
  const lineRef = useRef<HTMLSpanElement>(null);
  const motionAllowed = useMotionAllowed();
  const dwelling = clock.phase === "dwelling" && motionAllowed;

  useEffect(() => {
    const line = lineRef.current;
    if (!line || !dwelling) return;
    const from = 1 - clock.remaining / clock.dwell;
    const animation = line.animate(
      [{ transform: `scaleX(${from})` }, { transform: "scaleX(1)" }],
      { duration: clock.remaining, easing: "linear", fill: "both" },
    );
    if (!running) animation.pause();
    return () => animation.cancel();
  }, [clock, dwelling, running]);

  if (!dwelling) return null;
  return (
    <span
      aria-hidden
      data-path-tour-progress
      className="path-tour-progress print:hidden"
    >
      <span ref={lineRef} className="path-tour-progress-line" />
    </span>
  );
}

/** The text panel, holding the tour while the pointer is over it or focus is
 *  in it. Only a mouse or a pen hovers; a finger's tap is not reading. */
export function TourHoldPanel({ children }: { children: ReactNode }) {
  const { setHold } = useTour();
  return (
    <div
      data-path-text-panel
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setHold("pointer", true);
      }}
      onPointerLeave={() => setHold("pointer", false)}
      onFocus={() => setHold("focus", true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setHold("focus", false);
        }
      }}
      className="path-card max-w-[46rem] px-6 py-6 md:px-8"
    >
      {children}
    </div>
  );
}
