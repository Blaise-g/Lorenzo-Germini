"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useScrollSubscription } from "@/lib/use-scroll-subscription";
import { cn } from "@/lib/utils";

/* Absolute, so unlike the rail's activation line it does not move on `resize`
   and the subscription needs no companion event. */
const REVEAL_THRESHOLD_PX = 300;

export function BackToTop() {
  const [isVisible, setIsVisible] = React.useState(false);
  /* Mirrors `isVisible` so the ~60 frames a second that resolve to the state the
     button is already in cost no dispatch — only the two crossings do. */
  const isVisibleRef = React.useRef(false);

  /* No media-query gate, unlike the rail's: this renders at every width. */
  useScrollSubscription(() => {
    const next = window.scrollY > REVEAL_THRESHOLD_PX;
    if (next === isVisibleRef.current) return;
    isVisibleRef.current = next;
    setIsVisible(next);
  });

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={scrollToTop}
      className={cn(
        "hover:border-accent rounded-full shadow-lg print:hidden",
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
  );
}
