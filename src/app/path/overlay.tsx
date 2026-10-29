"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

import type {
  PathStepMark,
  PathStepNode,
} from "@/components/flat-site/path-steps";
import {
  clearSeen,
  fragmentForStep,
  isReplacingStep,
  markEntered,
  markSeen,
} from "@/lib/path-state";
import { useHydrated } from "@/lib/use-hydrated";
import { useSeenSteps, useSelectedStep } from "@/lib/use-path-state";

import { PATH_COPY } from "./copy";
import { TourProgress } from "./tour";

/* The overlay's client leaves. Before they hydrate, the first-paint script in
   `first-paint.ts` has already put the fragment's step on the overlay root and
   on "Flat site", so a load of `/path#lille` paints Lille. Hydration keeps
   those values (`suppressHydrationWarning`: the server cannot see the
   fragment), and from then on each leaf follows it through `useSelectedStep`,
   as `/`'s leaves do. */

/** The overlay root, carrying the selected step as `data-path-shown`. CSS
 *  shows that step's still and, on paper or without JavaScript, its text
 *  from it, with nothing to fetch (GH-141, decision 7). `data-path-scripted`
 *  marks a page with JavaScript running, which takes the text off the
 *  screen: the first-paint script sets it before paint, and hydration keeps
 *  it. */
export function OverlayRoot({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const { selected } = useSelectedStep();
  const hydrated = useHydrated();
  const rootRef = useRef<HTMLDivElement>(null);

  /* What changed the step last, as `data-path-input`: a key, a pointer or
     the tour. A change from the keyboard is not animated — the pawn cuts —
     because a key is pressed far more often than it is watched.
     Written straight onto the element, ahead of the render the change
     causes, so the cut applies to that render. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mark = (input: string) => () =>
      root.setAttribute("data-path-input", input);
    const onKeyDown = mark("keyboard");
    const onPointerDown = mark("pointer");
    function onHashChange() {
      if (isReplacingStep()) root!.setAttribute("data-path-input", "tour");
    }
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("hashchange", onHashChange, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("hashchange", onHashChange, true);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-path-overlay
      data-path-shown={selected}
      data-path-scripted={hydrated ? "" : undefined}
      suppressHydrationWarning
      className={className}
    >
      {children}
    </div>
  );
}

/** The way back, carrying the selected step: from `/path#lille` it goes to
 *  `/#lille` (GH-141, decision 13). A plain anchor rather than `Link`: the
 *  flat site reads its fragment on load, and a full load is what puts it
 *  there. */
export function FlatSiteLink({ className }: { className: string }) {
  const { selected } = useSelectedStep();
  return (
    <a
      href={`/${fragmentForStep(selected)}`}
      data-path-flat-site-link
      suppressHydrationWarning
      className={className}
    >
      {PATH_COPY.flatSite}
    </a>
  );
}

/** Being here is the choice the door remembers: it reads the flag to say
 *  "Continue the path" (GH-141, decision 6). Set on mount, so only a visit to
 *  `/path` sets it. */
export function MarkEntered() {
  useEffect(() => {
    markEntered();
  }, []);
  return null;
}

/* `/path`'s step list, printed on the overlay's card stock: the same steps
   and the same links as `/`'s `PathSteps`, which stays the flat site's, with
   the board's marks — the pawn on the current step, a tick for a seen one, a
   hollow circle for one not seen yet — and the tour's progress under the
   current step. One strip at every width, the steps side by side along a
   drawn line like tracks on a tape: on a wide screen all seven across the
   top of the board, on a phone three at a time, scrolling sideways with the
   current one in the middle. */

/** The node a step's line passes through, as `/` draws it. */
function NodeMark({ node }: { node: PathStepNode }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="path-step-node size-3">
      {node === "home" ? (
        <rect x={1.5} y={1.5} width={9} height={9} className="fill-accent" />
      ) : node === "open" ? (
        <circle
          cx={6}
          cy={6}
          r={4.5}
          strokeWidth={1.25}
          strokeDasharray="2 2"
          className="fill-ground stroke-accent"
        />
      ) : (
        <circle cx={6} cy={6} r={4} className="fill-ink" />
      )}
    </svg>
  );
}

/** The pawn: a folded paper cone in the accent ink, its crease in the
 *  paper's colour, standing on its node. */
function Pawn() {
  return (
    <svg aria-hidden viewBox="0 0 16 22" className="size-full overflow-visible">
      <path
        d="M8 2.5 13.5 18.5Q8 20.4 2.5 18.5Z"
        className="fill-accent stroke-ground"
        strokeWidth={1.5}
        strokeLinejoin="round"
        paintOrder="stroke"
      />
      <path
        d="M8 2.5 9.4 19.3"
        className="stroke-ground"
        strokeWidth={1}
        strokeLinecap="round"
      />
      <circle
        cx={8}
        cy={2.6}
        r={2}
        className="fill-accent stroke-ground"
        strokeWidth={1.25}
        paintOrder="stroke"
      />
    </svg>
  );
}

function StatusMark({ seen }: { seen: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 14 14"
      data-path-mark={seen ? "seen" : "unseen"}
      className="size-3.5 shrink-0"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {seen ? (
        <path
          d="M2.5 7.5 5.6 10.5 11.5 3.5"
          strokeWidth={1.75}
          className="stroke-accent"
        />
      ) : (
        <circle
          cx={7}
          cy={7}
          r={4.75}
          strokeWidth={1.25}
          className="stroke-border"
        />
      )}
    </svg>
  );
}

function hasModifier(event: KeyboardEvent) {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

/* Down and Right move on along the path, Up and Left back. */
const ARROW_STEP: Record<string, 1 | -1> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
};

/** Each link is a plain anchor to its step's fragment, so the browser pushes
 *  the history entry and the tour, the stage and the narration follow the
 *  fragment. */
export function PathStepList({ steps }: { steps: readonly PathStepMark[] }) {
  const hydrated = useHydrated();
  const { selected, fromFragment } = useSelectedStep();
  const seen = useSeenSteps();
  const stripRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  /* A step is seen once a fragment has chosen it: a pick, Back or Forward, a
     load of `/path#lille`, or the tour landing on it. The default step is
     shown, not chosen. */
  useEffect(() => {
    if (fromFragment) markSeen(fromFragment);
  }, [fromFragment]);

  /* Where the strip scrolls, the selected step is brought to its middle,
     the strip alone scrolling, never the page. */
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || strip.scrollWidth <= strip.clientWidth) return;
    const row = strip.querySelector<HTMLElement>(
      `li:has([data-path-step-link="${selected}"])`,
    );
    if (!row) return;
    const box = strip.getBoundingClientRect();
    const at = row.getBoundingClientRect();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    strip.scrollTo({
      left: strip.scrollLeft + at.left - box.left - (box.width - at.width) / 2,
      behavior: reduce.matches ? "instant" : "smooth",
    });
  }, [selected]);

  function onStepKeyDown(event: KeyboardEvent<HTMLAnchorElement>) {
    if (hasModifier(event)) return;
    /* Enter already follows a link; Space would scroll the page instead. */
    if (event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
      return;
    }
    /* Arrows move focus, not the selection: selecting pushes history, and an
       arrow held down would bury Back under one entry per step. */
    const direction = ARROW_STEP[event.key];
    if (!direction) return;
    event.preventDefault();
    const links = [
      ...(listRef.current?.querySelectorAll<HTMLAnchorElement>(
        "[data-path-step-link]",
      ) ?? []),
    ];
    links[links.indexOf(event.currentTarget) + direction]?.focus();
  }

  /* Clearing removes the button that had focus; the selected step keeps it
     on the path rather than dropping it to the page. */
  function onClearSeen() {
    clearSeen();
    listRef.current
      ?.querySelector<HTMLAnchorElement>(`[data-path-step-link="${selected}"]`)
      ?.focus();
  }

  const selectedIndex = steps.findIndex((step) => step.slug === selected);

  return (
    <div className="path-card flex flex-col lg:flex-row">
      <div ref={stripRef} className="path-step-strip min-w-0 flex-1">
        <div
          className="path-step-track"
          style={{ "--path-steps": steps.length } as CSSProperties}
        >
          <div className="relative">
            <span aria-hidden className="path-step-line" />
            {/* The pawn walks the drawn line from step to step. It mounts in
                place, so a load of `/path#lille` does not travel there. */}
            {hydrated && selectedIndex >= 0 ? (
              <span
                aria-hidden
                data-path-piece={selected}
                className="path-pawn"
                style={{
                  left: `${((selectedIndex + 0.5) / steps.length) * 100}%`,
                }}
              >
                <Pawn />
              </span>
            ) : null}
            <ol ref={listRef} className="path-step-row">
              {steps.map((step) => {
                const current = hydrated && step.slug === selected;
                const isSeen = seen.has(step.slug);
                return (
                  <li
                    key={step.slug}
                    data-path-seen={isSeen ? "" : undefined}
                    className="relative"
                  >
                    <a
                      href={fragmentForStep(step.slug)}
                      data-path-step-link={step.slug}
                      aria-current={current ? "location" : undefined}
                      onKeyDown={onStepKeyDown}
                      className="path-step-link touch-target group"
                    >
                      <NodeMark node={step.node} />
                      <span className="font-display group-aria-[current]:text-accent text-base leading-none lg:text-lg">
                        {step.place}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {step.period ? (
                          <span
                            data-path-date
                            className="text-faint font-mono text-xs tabular-nums"
                          >
                            {step.period}
                          </span>
                        ) : null}
                        <StatusMark seen={isSeen} />
                      </span>
                      {isSeen ? (
                        <span className="sr-only">{PATH_COPY.seen}</span>
                      ) : null}
                    </a>
                    {current ? <TourProgress /> : null}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
      {/* In the server HTML and of fixed size either way, so the control
          arriving moves nothing. A button: it changes storage and goes
          nowhere. */}
      <div className="border-border flex h-11 shrink-0 items-center justify-end border-t border-dashed px-3 lg:h-auto lg:w-28 lg:justify-center lg:border-t-0 lg:border-l lg:px-2 print:hidden">
        {seen.size > 0 ? (
          <button
            type="button"
            onClick={onClearSeen}
            className="path-quiet-control text-faint touch-target font-label text-[0.6875rem] tracking-[0.12em] uppercase underline-offset-4"
          >
            {PATH_COPY.clearSeen}
          </button>
        ) : null}
      </div>
    </div>
  );
}
