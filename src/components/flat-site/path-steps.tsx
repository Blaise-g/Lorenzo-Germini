"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { KeyboardEvent, MouseEvent } from "react";

import type { PathStepSlug } from "@/data/path.types";
import { clearSeen, fragmentForStep, markSeen } from "@/lib/path-state";
import { useSeenSteps, useSelectedStep } from "@/lib/use-path-state";

/** What the path draws for a step: home is a square, a place a dot, and "?"
 *  an open ring, because it is not yet written. */
export type PathStepNode = "home" | "place" | "open";

/** Only what the path's labels and nodes need, so the steps' text is not
 *  shipped a second time in the client payload. */
export type PathStepMark = {
  slug: PathStepSlug;
  place: string;
  period?: string;
  node: PathStepNode;
};

/* One row per step. 48px, so each link's 44px hit area clears its neighbours'
   with room to spare, and the SVG beside the list can place its nodes by
   arithmetic rather than by measuring the text. */
const ROW_PX = 48;
const GUTTER_PX = 40;
const SPINE_X = GUTTER_PX / 2;

function nodeY(index: number) {
  return ROW_PX * index + ROW_PX / 2;
}

/** The line the steps sit on: it swings out to one side and then the other
 *  between each pair of steps, so it reads as a walked path, not a timeline
 *  rule. Each segment mirrors the last, so every one is the same length and
 *  step `i` sits at `i / (count - 1)` of the way along — which is where the
 *  piece's `offset-distance` puts it. */
function pathLine(count: number) {
  let line = `M ${SPINE_X} ${nodeY(0)}`;
  for (let index = 0; index < count - 1; index++) {
    const from = nodeY(index);
    const to = nodeY(index + 1);
    const swing = index % 2 === 0 ? GUTTER_PX - 4 : 4;
    line += ` C ${swing} ${from + 16}, ${swing} ${to - 16}, ${SPINE_X} ${to}`;
  }
  return line;
}

function StepNode({ node, index }: { node: PathStepNode; index: number }) {
  const y = nodeY(index);
  if (node === "home") {
    return (
      <rect
        x={SPINE_X - 5}
        y={y - 5}
        width={10}
        height={10}
        className="fill-accent"
      />
    );
  }
  if (node === "open") {
    return (
      <circle
        cx={SPINE_X}
        cy={y}
        r={5}
        strokeWidth={1.5}
        strokeDasharray="2 2"
        className="fill-ground stroke-accent"
      />
    );
  }
  return <circle cx={SPINE_X} cy={y} r={5} className="fill-ink" />;
}

function SeenTick() {
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="text-accent size-3 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 6.5 5 9l4.5-6" />
      </svg>
      <span className="sr-only">, seen</span>
    </>
  );
}

const subscribeToNothing = () => () => {};

/** True once hydrated: what only JavaScript adds — the piece and the
 *  selection — stays out of the server HTML, so the page without it is
 *  GH-144's, whole. */
function useHydrated() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

/* Down and Right move on along the path, Up and Left back. */
const ARROW_STEP: Record<string, 1 | -1> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
};

/** The step links on their drawn line, with the piece and the seen ticks.
 *  Every link is a plain anchor to its step's section: with JavaScript off it
 *  scrolls there, and with it on the browser still does the scrolling and the
 *  history push, and this leaf follows the fragment (GH-141, decision 13). The
 *  section is the step panel; this marks it selected. */
export function PathSteps({ steps }: { steps: readonly PathStepMark[] }) {
  const hydrated = useHydrated();
  const { selected, fromFragment } = useSelectedStep();
  const seen = useSeenSteps();
  const listRef = useRef<HTMLOListElement>(null);

  /* A step is seen once a fragment has chosen it: a click, Back or Forward,
     or a load of `/#lille`. The default step is shown, not chosen. */
  useEffect(() => {
    if (fromFragment) markSeen(fromFragment);
  }, [fromFragment]);

  /* Back and Forward change the fragment without the jump a link makes: the
     browser restores the entry's saved scroll, which in Chromium did not
     leave the step's section on screen. So the panel is brought there here,
     and only then. A followed link has already scrolled, and the fragment
     the hydrating render first reads was already there on load, where a
     reload keeps the visitor's own position. `html`'s `scroll-behavior`
     makes this a glide, or a jump under reduced motion. */
  const settled = useRef(false);
  const followedLink = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!settled.current) {
      settled.current = true;
      return;
    }
    if (followedLink.current) {
      followedLink.current = false;
      return;
    }
    if (fromFragment) document.getElementById(fromFragment)?.scrollIntoView();
  }, [fromFragment, hydrated]);

  function onStepClick(
    event: MouseEvent<HTMLAnchorElement>,
    slug: PathStepSlug,
  ) {
    /* A modified or non-primary click opens a tab or a window and leaves this
       page's fragment alone, so the next Back must still scroll. */
    if (
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }
    /* Following the current step's link changes no fragment. */
    if (slug !== fromFragment) followedLink.current = true;
  }

  /* Clearing removes the button that had focus; the selected step keeps it on
     the path rather than dropping it to the page. */
  function onClearSeen() {
    clearSeen();
    listRef.current
      ?.querySelector<HTMLAnchorElement>(`[data-path-step-link="${selected}"]`)
      ?.focus();
  }

  /* The selected step's section is the visible panel. The sections are server
     HTML, so the mark goes on as an attribute rather than a prop. */
  useEffect(() => {
    const section = document.getElementById(selected);
    section?.setAttribute("data-path-selected", "");
    return () => section?.removeAttribute("data-path-selected");
  }, [selected]);

  function onStepKeyDown(event: KeyboardEvent<HTMLAnchorElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
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

  const height = ROW_PX * steps.length;
  const line = pathLine(steps.length);
  const selectedIndex = steps.findIndex((step) => step.slug === selected);

  return (
    <div>
      <div className="relative flex">
        <svg
          aria-hidden="true"
          width={GUTTER_PX}
          height={height}
          viewBox={`0 0 ${GUTTER_PX} ${height}`}
          className="shrink-0 overflow-visible"
        >
          <path
            d={line}
            fill="none"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="stroke-border"
          />
          {steps.map((step, index) => (
            <StepNode key={step.slug} node={step.node} index={index} />
          ))}
        </svg>
        {/* The piece rides the drawn line itself, under 600ms; reduced motion
            cuts it there (storyboard §7.3). It mounts already in place, so a
            load of `/#lille` does not travel from the default step. */}
        {hydrated && selectedIndex >= 0 ? (
          <span
            aria-hidden="true"
            data-path-piece={selected}
            className="border-accent pointer-events-none absolute top-0 left-0 size-[18px] rounded-full border-2 transition-[offset-distance] duration-500 ease-out motion-reduce:transition-none"
            style={{
              offsetPath: `path("${line}")`,
              offsetDistance: `${(selectedIndex / (steps.length - 1)) * 100}%`,
              offsetRotate: "0deg",
            }}
          />
        ) : null}
        <ol ref={listRef} className="ml-3">
          {steps.map((step) => (
            <li
              key={step.slug}
              data-path-seen={seen.has(step.slug) ? "" : undefined}
              className="flex items-center"
              style={{ height: ROW_PX }}
            >
              <a
                href={fragmentForStep(step.slug)}
                data-path-step-link={step.slug}
                aria-current={
                  hydrated && step.slug === selected ? "location" : undefined
                }
                onClick={(event) => onStepClick(event, step.slug)}
                onKeyDown={onStepKeyDown}
                className="touch-target group aria-[current]:text-accent gap-x-2 underline-offset-4"
              >
                <span className="font-display group-hover:text-accent text-lg leading-none group-hover:underline">
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
                {seen.has(step.slug) ? <SeenTick /> : null}
              </a>
            </li>
          ))}
        </ol>
      </div>
      {/* The row is in the server HTML and keeps its height either way, so
          the control appearing moves nothing under it. A button, not a link:
          it changes storage, and it goes nowhere. */}
      <div
        className="flex h-11 items-center print:hidden"
        style={{ marginLeft: GUTTER_PX + 12 }}
      >
        {seen.size > 0 ? (
          <button
            type="button"
            onClick={onClearSeen}
            className="text-faint hover:text-accent touch-target font-label text-xs tracking-[0.12em] uppercase underline-offset-4 hover:underline"
          >
            Clear seen
          </button>
        ) : null}
      </div>
    </div>
  );
}
