"use client";

import * as React from "react";

import { useScrollSubscription } from "@/lib/use-scroll-subscription";
import { cn } from "@/lib/utils";

export type HubDestination = {
  id: string;
  label: string;
};

/** A section becomes current once its top passes this fraction of the viewport. */
const ACTIVATION_LINE_RATIO = 0.28;

/* `scrollHeight` is integer-rounded while `scrollY` and `innerHeight` go
   fractional at non-100% zoom or DPR, so "at the foot" needs slack wider than
   that rounding gap. Too tight and the branch below silently stops firing at
   zoom levels no test covers, taking the last destination with it. */
const DOCUMENT_FOOT_TOLERANCE_PX = 4;

/* Matches the `hidden lg:block` on the rail's `<aside>` in hub-shell: below
   `lg` the rail is not painted, so there is nothing to orient. */
const RAIL_MEDIA_QUERY = "(min-width: 64rem)";

function isAtDocumentFoot() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  return (
    maxScroll > 0 && window.scrollY >= maxScroll - DOCUMENT_FOOT_TOLERANCE_PX
  );
}

function useActiveDestination(destinations: readonly HubDestination[]) {
  const [activeId, setActiveId] = React.useState(destinations[0]?.id);
  /* Mirrors `activeId` so a frame that resolves to the same section skips the
     dispatch: a render rewrites `className` on every anchor, dirtying layout and
     turning the next frame's `scrollHeight` read into a forced reflow. */
  const activeIdRef = React.useRef(activeId);

  /* Resolved once per `destinations` rather than per frame. */
  const sectionsRef = React.useRef<HTMLElement[]>([]);

  const chooseActiveSection = React.useCallback(() => {
    const sections = sectionsRef.current;
    if (sections.length === 0) return;

    const activationLine = window.innerHeight * ACTIVATION_LINE_RATIO;
    const passed = sections.filter(
      (section) => section.getBoundingClientRect().top <= activationLine,
    );

    /* A short final section never reaches the activation line at maximum
       scroll — measured at 1440×800, `#systems` is 87px tall and stops 368px
       down the viewport against a 224px line — which left the last
       destination unreachable rather than merely hard to hit: clicking its own
       rail link did not mark it. The foot of the document anchors to it. */
    const next = isAtDocumentFoot()
      ? sections[sections.length - 1]
      : (passed.at(-1) ?? sections[0]);

    if (next.id === activeIdRef.current) return;
    activeIdRef.current = next.id;
    setActiveId(next.id);
  }, []);

  /* Re-resolving also re-reads: the subscription itself only resubscribes on its
     own options, so without this a new `destinations` would leave the marked
     destination stale until the next scroll. */
  React.useEffect(() => {
    sectionsRef.current = destinations.flatMap(({ id }) => {
      const section = document.getElementById(id);
      return section ? [section] : [];
    });
    chooseActiveSection();
  }, [chooseActiveSection, destinations]);

  /* Scroll-driven rather than an IntersectionObserver: the observer fires only
     on threshold crossings, so it could fall silent before the page settled at
     the foot and never report the final position. `resize` because the
     activation line is a fraction of `innerHeight`. */
  useScrollSubscription(chooseActiveSection, {
    alsoOnResize: true,
    whileMatching: RAIL_MEDIA_QUERY,
  });

  return activeId;
}

/** Deliberately without `touch-target`, for the same reason as the footer's
 *  colophon links: the rail's rows sit on a 28px pitch, so a centred 44px
 *  overlay reaches 8px into each neighbour — measured at 1024, six links deep.
 *  Widening the pitch to 44px instead would add 96px to a rail that already has
 *  to keep `CV →` inside an 800px viewport.
 *  It costs nothing to give up: the rail is `hidden lg:block`, and each row is a
 *  220×28px target — well past WCAG 2.2 SC 2.5.8's 24×24 — while the 44px
 *  expansion exists for thumbs at 375, where this nav does not render at all.
 *  The floor is still stated explicitly, because `py-1.5` on 12px type is the
 *  only thing holding it. */
const railLinkClass =
  "inline-flex min-h-6 items-center border-l py-1.5 pl-3 underline-offset-4";

export function StickyRailNavigation({
  destinations,
}: {
  destinations: readonly HubDestination[];
}) {
  const activeId = useActiveDestination(destinations);

  return (
    <nav
      aria-label="Page sections"
      className="border-border flex flex-col border-t pt-4 font-mono text-xs tracking-[0.12em] uppercase"
    >
      {destinations.map(({ id, label }) => {
        const isActive = activeId === id;

        return (
          <a
            key={id}
            href={`#${id}`}
            /* `location`, not `true`: this marks a position within the page,
               which is the token's exact meaning. `true` is the generic
               fallback and tells a screen reader less. */
            aria-current={isActive ? "location" : undefined}
            className={cn(
              railLinkClass,
              "hover:text-accent transition-colors hover:underline",
              isActive
                ? "border-l-accent text-accent"
                : "text-faint border-l-transparent",
            )}
          >
            {label}
          </a>
        );
      })}
      <a
        href="/cv"
        className={cn(
          railLinkClass,
          "text-accent decoration-border hover:decoration-accent mt-3 border-l-transparent underline",
        )}
      >
        CV →
      </a>
    </nav>
  );
}
