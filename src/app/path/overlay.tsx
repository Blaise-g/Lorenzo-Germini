"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { KeyboardEvent, ReactNode } from "react";

import type {
  PathStepMark,
  PathStepNode,
} from "@/components/flat-site/path-steps";
import type { PathStepSlug } from "@/data/path.types";
import {
  clearSeen,
  fragmentForStep,
  isReplacingStep,
  markEntered,
  markSeen,
} from "@/lib/path-state";
import { useSeenSteps, useSelectedStep } from "@/lib/use-path-state";

import { PATH_COPY } from "./copy";
import { TourProgress } from "./tour";

/* The overlay's client leaves. Before they hydrate, the first-paint script in
   `first-paint.ts` has already put the fragment's step on the overlay root and
   on "Flat site", so a load of `/path#lille` paints Lille. Hydration keeps
   those values (`suppressHydrationWarning`: the server cannot see the
   fragment), and from then on each leaf follows it through `useSelectedStep`,
   as `/`'s leaves do. */

/** Caption lines lit, by index, and the step whose lines they are. */
export type LitLines = { slug: PathStepSlug; lines: readonly number[] };

const LitLinesContext = createContext<(lit: LitLines) => void>(() => {});

/** For the scene stage: lights a step's caption lines, by index, as their
 *  props land (storyboard §7.4). */
export function useSetLitLines() {
  return useContext(LitLinesContext);
}

/** The overlay root, carrying the selected step as `data-path-shown`. CSS
 *  shows that step's panel from it, so selecting a step shows its text at
 *  once, with nothing to fetch (GH-141, decision 7). It carries the lit
 *  caption lines too, as `data-path-lit`: the captions are the panel's own
 *  lines, server HTML, so they are lit from here rather than re-rendered. */
export function OverlayRoot({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const { selected } = useSelectedStep();
  const [lit, setLit] = useState<LitLines>({ slug: selected, lines: [] });
  /* Lines lit for one step never light another's: on a Back or a fragment,
     the new panel shows a render before its scene's build resets them. */
  const lines = lit.slug === selected ? lit.lines : [];
  const rootRef = useRef<HTMLDivElement>(null);

  /* What changed the step last, as `data-path-input`: a key, a pointer or
     the tour. A change from the keyboard is not animated — the panel and the
     pawn cut — because a key is pressed far more often than it is watched.
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
      data-path-lit={lines.length > 0 ? lines.join(" ") : undefined}
      suppressHydrationWarning
      className={className}
    >
      <LitLinesContext value={setLit}>{children}</LitLinesContext>
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

/** Below `lg` the text panel sits under the step list and the stage, out of
 *  the first screen on a phone. Selecting a step — a click, a key, Back or
 *  Forward, all of which change the fragment — brings the panel's text into
 *  view when none of it is, so the text appears as it is selected (GH-141,
 *  decision 7). It scrolls and nothing else: focus stays on the step that
 *  was selected. `html`'s `scroll-behavior` makes it a glide, or a jump
 *  under reduced motion. A load is not a selection, so it does not scroll,
 *  and nor does a step the tour moves on to. */
export function RevealSelectedText() {
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 64rem)");
    let frame = 0;
    function onHashChange() {
      /* The tour moving on is not the visitor's selection: scrolling the
         page under them on every step would take the list out of reach. */
      if (wide.matches || isReplacingStep()) return;
      cancelAnimationFrame(frame);
      /* After the selected panel has rendered, so its height is its own. */
      frame = requestAnimationFrame(() => {
        const panel = document.querySelector("[data-path-text-panel]");
        if (!panel) return;
        const { top, bottom } = panel.getBoundingClientRect();
        if (top < window.innerHeight * 0.85 && bottom > 0) return;
        panel.scrollIntoView({ block: "nearest" });
      });
    }
    window.addEventListener("hashchange", onHashChange);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);
  return null;
}

/* `/path`'s step list, printed on the overlay's card stock: the same steps
   and the same links as `/`'s `PathSteps`, which stays the flat site's, with
   the board's marks — the pawn on the current step, a tick for a seen one, a
   hollow circle for one not seen yet — and the tour's progress under the
   current row. Rows are 48px, so each link's hit area clears its neighbours'
   and the drawn line can place its nodes by arithmetic. */
const ROW_PX = 48;
const GUTTER_PX = 28;
const SPINE_X = GUTTER_PX / 2;

function nodeY(index: number) {
  return ROW_PX * index + ROW_PX / 2;
}

/** The walked line the nodes sit on, swinging to one side and then the
 *  other between steps. Every segment mirrors the last, so step `i` sits at
 *  `i / (count - 1)` of its length, where the pawn's `offset-distance` puts
 *  it. */
function spinePath(count: number) {
  let line = `M ${SPINE_X} ${nodeY(0)}`;
  for (let index = 0; index < count - 1; index++) {
    const from = nodeY(index);
    const to = nodeY(index + 1);
    const swing = index % 2 === 0 ? GUTTER_PX - 3 : 3;
    line += ` C ${swing} ${from + 16}, ${swing} ${to - 16}, ${SPINE_X} ${to}`;
  }
  return line;
}

function SpineNode({ node, index }: { node: PathStepNode; index: number }) {
  const y = nodeY(index);
  if (node === "home") {
    return (
      <rect
        x={SPINE_X - 4.5}
        y={y - 4.5}
        width={9}
        height={9}
        className="fill-accent"
      />
    );
  }
  if (node === "open") {
    return (
      <circle
        cx={SPINE_X}
        cy={y}
        r={4.5}
        strokeWidth={1.25}
        strokeDasharray="2 2"
        className="fill-ground stroke-accent"
      />
    );
  }
  return <circle cx={SPINE_X} cy={y} r={4} className="fill-ink" />;
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

const subscribeToNothing = () => () => {};

/** True once hydrated: the pawn and the current step are JavaScript's, so
 *  they stay out of the server HTML. */
function useHydrated() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
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
 *  the history entry and the tour, the stage and the panels follow the
 *  fragment. */
export function PathStepList({ steps }: { steps: readonly PathStepMark[] }) {
  const hydrated = useHydrated();
  const { selected, fromFragment } = useSelectedStep();
  const seen = useSeenSteps();
  const listRef = useRef<HTMLOListElement>(null);

  /* A step is seen once a fragment has chosen it: a pick, Back or Forward, a
     load of `/path#lille`, or the tour landing on it. The default step is
     shown, not chosen. */
  useEffect(() => {
    if (fromFragment) markSeen(fromFragment);
  }, [fromFragment]);

  /* On a phone the list is a strip that scrolls sideways: the selected step
     is brought into it, the strip alone scrolling, never the page. */
  useEffect(() => {
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const row = list.querySelector<HTMLElement>(
      `li:has([data-path-step-link="${selected}"])`,
    );
    if (!row) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    list.scrollTo({
      left: row.offsetLeft - (list.clientWidth - row.offsetWidth) / 2,
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

  const height = ROW_PX * steps.length;
  const line = spinePath(steps.length);
  const selectedIndex = steps.findIndex((step) => step.slug === selected);

  return (
    <div className="path-card px-1 lg:px-4 lg:pt-3 lg:pb-1">
      <div className="relative">
        <svg
          aria-hidden
          width={GUTTER_PX}
          height={height}
          viewBox={`0 0 ${GUTTER_PX} ${height}`}
          className="absolute top-0 left-0 overflow-visible max-lg:hidden"
        >
          <path
            d={line}
            fill="none"
            strokeWidth={1.25}
            strokeLinecap="round"
            className="stroke-border"
          />
          {steps.map((step, index) => (
            <SpineNode key={step.slug} node={step.node} index={index} />
          ))}
        </svg>
        {/* The pawn rides the drawn line from step to step. It mounts in
            place, so a load of `/path#lille` does not travel there. */}
        {hydrated && selectedIndex >= 0 ? (
          <span
            aria-hidden
            data-path-piece={selected}
            className="path-pawn max-lg:hidden"
            style={{
              offsetPath: `path("${line}")`,
              offsetDistance: `${(selectedIndex / (steps.length - 1)) * 100}%`,
            }}
          >
            <Pawn />
          </span>
        ) : null}
        <ol ref={listRef} className="path-step-strip">
          {steps.map((step) => {
            const current = hydrated && step.slug === selected;
            const isSeen = seen.has(step.slug);
            return (
              <li
                key={step.slug}
                data-path-seen={isSeen ? "" : undefined}
                className="relative flex items-center max-lg:shrink-0 max-lg:px-3"
                style={{ height: ROW_PX }}
              >
                <a
                  href={fragmentForStep(step.slug)}
                  data-path-step-link={step.slug}
                  aria-current={current ? "location" : undefined}
                  onKeyDown={onStepKeyDown}
                  className="path-step-link touch-target group flex-1 gap-x-2.5"
                >
                  <span className="font-display group-aria-[current]:text-accent text-lg leading-none">
                    {step.place}
                  </span>
                  {step.period ? (
                    <span
                      data-path-date
                      className="text-faint font-mono text-xs tabular-nums"
                    >
                      {step.period}
                    </span>
                  ) : null}
                  <span className="ml-auto flex items-center">
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
      {/* In the server HTML and of fixed height either way, so the control
          arriving moves nothing. A button: it changes storage and goes
          nowhere. */}
      <div className="border-border flex h-11 items-center justify-end border-t border-dashed max-lg:px-3 print:hidden">
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
