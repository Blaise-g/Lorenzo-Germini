"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import type { PathStepSlug } from "@/data/path.types";
import {
  DEFAULT_STEP,
  parseSeen,
  readStorage,
  SEEN_CHANGE_EVENT,
  SEEN_STORAGE_KEY,
  stepFromFragment,
} from "@/lib/path-state";

/* The client half of the path-state contract in `path-state.ts`: the hooks
   that follow the fragment and the seen ticks. Shared by `/` and `/path`. */

function subscribeToFragment(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/* `null` for an empty fragment, so it can be told from one that names no
   step: `/` is the default step, `/#quadrell` keeps the last one. */
function fragmentStep(): PathStepSlug | null | undefined {
  const { hash } = window.location;
  return hash === "" || hash === "#" ? null : stepFromFragment(hash);
}

/** The selected step, and the step the fragment names if it names one. Back
 *  and Forward land here through `hashchange`, so Back to a bare `/` is the
 *  default step again. A fragment that names no step — a side prop's — keeps
 *  the last selection. The server and the hydrating render see an empty
 *  fragment, so hydration matches. */
export function useSelectedStep(): {
  selected: PathStepSlug;
  fromFragment: PathStepSlug | undefined;
} {
  const step = useSyncExternalStore(
    subscribeToFragment,
    fragmentStep,
    () => null,
  );
  const [last, setLast] = useState<PathStepSlug>(DEFAULT_STEP);
  const current = step === null ? DEFAULT_STEP : step;
  if (current && current !== last) setLast(current);
  return { selected: current ?? last, fromFragment: step ?? undefined };
}

function subscribeToSeen(onChange: () => void) {
  /* `storage` carries another tab's change, the custom event this tab's. */
  window.addEventListener("storage", onChange);
  window.addEventListener(SEEN_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SEEN_CHANGE_EVENT, onChange);
  };
}

/** The seen steps. The snapshot is the raw stored string, which compares
 *  stably between renders; the set is parsed from it. Empty on the server and
 *  through hydration. */
export function useSeenSteps(): ReadonlySet<PathStepSlug> {
  const raw = useSyncExternalStore(
    subscribeToSeen,
    () => readStorage(SEEN_STORAGE_KEY),
    () => null,
  );
  return useMemo(() => parseSeen(raw), [raw]);
}
