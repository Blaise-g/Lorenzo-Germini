"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useScrollSubscription } from "@/lib/use-scroll-subscription";
import { cn } from "@/lib/utils";

/* Absolute, so unlike the rail's activation line it does not move on `resize`
   and the subscription needs no companion event. */
const REVEAL_THRESHOLD_PX = 300;

/* `xl`, not `lg`, and measured rather than picked: this button only sits over
   nothing where the widest shell's measure leaves margin for it, and the hub's
   is `max-w-5xl` — 1024px, so at a 1024px viewport it fills the screen and the
   button lands on the body text at every scroll position between the two
   reserved paddings. At 1280 the hub's content edge is 168px clear of it.
   Below that the button is not painted at all (#89): it used to keep off the
   text by way of a 56px right gutter reserved on every shell inset at every
   height, which cost each phone paragraph 15% of its measure for a control that
   only shortens a scroll. */
const MARGIN_MEDIA_QUERY = "(min-width: 80rem)";

export function BackToTop() {
  const [isVisible, setIsVisible] = React.useState(false);
  /* Mirrors `isVisible` so the ~60 frames a second that resolve to the state the
     button is already in cost no dispatch — only the two crossings do. */
  const isVisibleRef = React.useRef(false);

  /* Gated like the rail's, and for the same reason: below `xl` this button is
     `display: none`, so a reading that feeds it buys nothing there. */
  useScrollSubscription(
    () => {
      const next = window.scrollY > REVEAL_THRESHOLD_PX;
      if (next === isVisibleRef.current) return;
      isVisibleRef.current = next;
      setIsVisible(next);
    },
    { whileMatching: MARGIN_MEDIA_QUERY },
  );

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* The wrapper owns placement and the width gate; the button owns only its
     reveal. That split is what keeps the animated `translate-y-2` off the
     element being positioned, which is how the deleted cluster had it too.
     (An earlier comment here claimed the wrapper was needed because `hidden`
     and `buttonVariants`' `inline-flex` are same-layer utilities whose order in
     the stylesheet decides. That is not the constraint: `cn` is `twMerge`, which
     resolves the display group before any CSS is consulted — checked, it drops
     `inline-flex` and keeps `hidden xl:inline-flex`.) */
  return (
    <div className="fixed right-4 bottom-4 z-50 hidden xl:block print:hidden">
      <Button
        variant="outline"
        size="icon"
        onClick={scrollToTop}
        className={cn(
          "hover:border-accent rounded-full shadow-lg",
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-95 opacity-0",
        )}
        aria-label="Back to top"
        aria-hidden={!isVisible}
        tabIndex={isVisible ? 0 : -1}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
}
