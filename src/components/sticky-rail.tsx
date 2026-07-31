"use client";

import * as React from "react";

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

  React.useEffect(() => {
    const sections = destinations.flatMap(({ id }) => {
      const section = document.getElementById(id);
      return section ? [section] : [];
    });
    if (sections.length === 0) return;

    const chooseActiveSection = () => {
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
    };

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        chooseActiveSection();
      });
    };

    /* Scroll-driven rather than an IntersectionObserver: the observer fires only
       on threshold crossings, so it could fall silent before the page settled at
       the foot and never report the final position. */
    const rail = window.matchMedia(RAIL_MEDIA_QUERY);
    const stopTracking = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
    const trackWhileRailIsPainted = () => {
      stopTracking();
      if (!rail.matches) return;
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      chooseActiveSection();
    };

    trackWhileRailIsPainted();
    rail.addEventListener("change", trackWhileRailIsPainted);

    return () => {
      stopTracking();
      rail.removeEventListener("change", trackWhileRailIsPainted);
    };
  }, [destinations]);

  return activeId;
}

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
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "touch-target hover:text-accent border-l py-1.5 pl-3 underline-offset-4 transition-colors hover:underline",
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
        className="touch-target text-accent decoration-border hover:decoration-accent mt-3 border-l border-l-transparent py-1.5 pl-3 underline underline-offset-4"
      >
        CV →
      </a>
    </nav>
  );
}
