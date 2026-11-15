"use client";

import { useSyncExternalStore } from "react";

/* Hoisted to module scope: an inline subscribe re-subscribes on every
   render, and there is nothing to subscribe to. */
const subscribeToNothing = () => () => {};

/** False on the server and through hydration, true once React drives the
 *  client: what only JavaScript adds stays out of the server HTML, so the
 *  page without it is whole. `useSyncExternalStore` rather than a
 *  mount-effect `setState`: the same one extra render, but it reads a value
 *  that lives outside React instead of tripping
 *  `react-hooks/set-state-in-effect`. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}
