"use client";

import * as React from "react";

import {
  BELOW_RAIL_MEDIA_QUERY,
  RouteStop,
  routeProgress,
  useActiveDestination,
  type HubDestination,
} from "@/components/sticky-rail";
import { cn } from "@/lib/utils";

/* The rail's road, for widths where the rail is not painted. Below `lg` the
   section row sits at the top of the page and scrolls away with it, which left
   a phone reader with no position at all once past the hero. This bar takes
   over from that row the moment it leaves the screen, and hands back when it
   returns, so the two are never on screen together and the top of the page
   keeps its quiet first view. */
function useAnchorRowHasScrolledAway() {
  const [scrolledAway, setScrolledAway] = React.useState(false);

  React.useEffect(() => {
    const anchor = document.querySelector("[data-route-bar-anchor]");
    if (!anchor) return;

    /* Away means above the viewport, not merely out of it: a row below the
       fold on a very short screen has not been read past yet. */
    const observer = new IntersectionObserver(([entry]) => {
      setScrolledAway(
        !entry.isIntersecting && entry.boundingClientRect.bottom <= 0,
      );
    });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  return scrolledAway;
}

export function MobileRouteBar({
  destinations,
}: {
  destinations: readonly HubDestination[];
}) {
  const activeId = useActiveDestination(destinations, BELOW_RAIL_MEDIA_QUERY);
  const { activeIndex, travelled } = routeProgress(destinations, activeId);
  const isShown = useAnchorRowHasScrolledAway();
  const activeLabel = destinations[activeIndex]?.label;

  return (
    <nav
      aria-label="Section progress"
      data-testid="mobile-route-bar"
      /* Hidden means out of the tab order and the accessibility tree too, not
         just off screen: `inert` while it is tucked above the viewport. */
      inert={!isShown}
      aria-hidden={!isShown}
      /* Enters and leaves through the same top edge it is anchored to, on
         `ease-out` at 200ms — it answers the reader's own scroll, so it has to
         feel immediate. A transition rather than keyframes, because scrolling
         back and forth retargets it mid-flight. Under reduced motion it only
         fades: nothing slides. */
      className={cn(
        "border-border bg-ground fixed inset-x-0 top-0 z-40 border-b transition-[translate,opacity] duration-200 ease-out lg:hidden print:hidden",
        isShown
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-full opacity-0 motion-reduce:translate-y-0",
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 md:px-10">
        {/* Keyed, so a new section mounts a new label and `@starting-style`
            fades it in: the name changes without the bar moving. */}
        <p
          key={activeLabel}
          className="text-accent font-label truncate text-xs tracking-[0.12em] uppercase transition-opacity duration-150 ease-out starting:opacity-0"
        >
          {activeLabel}
        </p>
        <div className="relative flex shrink-0">
          {/* The track runs centre-to-centre between the first and last stop,
              which sit half a target in from each end — 18px, or 22px from
              `sm` where a target is 44px wide. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-[18px] top-1/2 h-px -translate-y-1/2 sm:inset-x-[22px]"
          >
            <div className="bg-border absolute inset-0" />
            <div
              data-testid="mobile-road-travelled"
              className="bg-accent absolute inset-0 origin-left transition-transform duration-300 ease-in-out motion-reduce:transition-none"
              style={{ transform: `scaleX(${travelled})` }}
            />
          </div>
          {destinations.map(({ id, label }, index) => {
            const isActive = activeId === id;

            return (
              <a
                key={id}
                href={`#${id}`}
                aria-label={label}
                aria-current={isActive ? "location" : undefined}
                /* 36×44 on the narrowest phones, where five 44px targets
                   would leave the label under 60px; 44×44 from `sm`. Both
                   clear WCAG 2.2's 24px floor with room to spare. */
                className="relative h-11 w-9 sm:w-11"
              >
                <RouteStop
                  isActive={isActive}
                  isPassed={index <= activeIndex}
                  className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                />
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
