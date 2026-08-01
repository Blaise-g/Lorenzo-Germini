"use client";

import * as React from "react";

export type ScrollSubscriptionOptions = {
  /**
   * Also read on `resize`. For a threshold expressed as a fraction of
   * `innerHeight`, which moves without the page scrolling at all.
   */
  alsoOnResize?: boolean;
  /**
   * Subscribe only while this media query matches, re-evaluated on change, so a
   * reading that feeds UI which is not painted at some widths costs nothing
   * there. Left to the caller: it is a property of the consumer, not of scroll.
   */
  whileMatching?: string;
};

/**
 * Calls `read` at most once per animation frame while the window scrolls, and
 * once immediately on subscribe so the first reading does not wait for an event.
 *
 * The listener is registered `{ passive: true }`: without it the browser has to
 * wait for the handler to return before it can scroll, which is the flag that
 * actually causes touch jank. `read` is held in a ref, so a caller may pass a
 * fresh closure every render without tearing the subscription down.
 */
export function useScrollSubscription(
  read: () => void,
  { alsoOnResize = false, whileMatching }: ScrollSubscriptionOptions = {},
) {
  const readRef = React.useRef(read);
  /* Layout effect, not a plain one: the ref has to hold the current closure
     before a frame scheduled by the paint after this render could run against
     the stale one. */
  React.useLayoutEffect(() => {
    readRef.current = read;
  });

  React.useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        readRef.current();
      });
    };

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("scroll", schedule);
      if (alsoOnResize) window.removeEventListener("resize", schedule);
    };

    const start = () => {
      window.addEventListener("scroll", schedule, { passive: true });
      if (alsoOnResize) {
        window.addEventListener("resize", schedule, { passive: true });
      }
      readRef.current();
    };

    if (!whileMatching) {
      start();
      return stop;
    }

    const gate = window.matchMedia(whileMatching);
    const resubscribeForGate = () => {
      stop();
      if (gate.matches) start();
    };

    resubscribeForGate();
    gate.addEventListener("change", resubscribeForGate);

    return () => {
      stop();
      gate.removeEventListener("change", resubscribeForGate);
    };
  }, [alsoOnResize, whileMatching]);
}
