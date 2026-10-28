import { useState, useSyncExternalStore } from "react";

import type { PathStepSlug } from "@/data/path.types";

/* The step-state contract shared by `/` and `/path` (GH-141, implementation
   decision 4): which step a fragment names, the history push, and the two
   local-storage keys. Fragments are read on the client only — never
   `searchParams` or a dynamic segment, which Cache Components would count as
   runtime reads (decision 13). No `"use client"`: a server module may import
   the constants, and the hooks only run inside client components. */

const STEP_SLUGS: readonly PathStepSlug[] = [
  "home",
  "turin",
  "switzerland",
  "cuneo-2022",
  "lille",
  "now",
  "next",
];

/** The steps the visitor has selected, as a JSON array of slugs. Shared by
 *  both routes, so a tick earned on one shows on the other. */
export const SEEN_STORAGE_KEY = "path:seen";

/** Set once the visitor has entered `/path`; the door reads it to say
 *  "Continue the path" (decision 6). */
export const ENTERED_STORAGE_KEY = "path:entered";

/** The step selected when the fragment names none: now (storyboard §7.2). It
 *  is shown, not chosen, so it earns no seen tick. */
export const DEFAULT_STEP: PathStepSlug = "now";

const SEEN_CHANGE_EVENT = "path:seen-change";

/** The step a fragment names (`#lille`, or `lille`), or `undefined` for any
 *  other fragment — a side prop's, or none. */
export function stepFromFragment(fragment: string): PathStepSlug | undefined {
  const slug = decodeURIComponent(fragment.replace(/^#/, ""));
  return STEP_SLUGS.find((step) => step === slug);
}

export function fragmentForStep(slug: PathStepSlug): `#${PathStepSlug}` {
  return `#${slug}`;
}

/** Push `#slug` onto history without scrolling, for a route whose steps are
 *  not anchors. `pushState` fires no `hashchange`, so one is dispatched for
 *  `useSelectedStep`. A route whose step links are anchors (`/`) lets the
 *  browser push instead, which also works with JavaScript off. */
export function pushStep(slug: PathStepSlug) {
  const fragment = fragmentForStep(slug);
  if (window.location.hash === fragment) return;
  const oldURL = window.location.href;
  window.history.pushState(null, "", fragment);
  window.dispatchEvent(
    new HashChangeEvent("hashchange", { oldURL, newURL: window.location.href }),
  );
}

function subscribeToFragment(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** The selected step, and the step the fragment names if it names one. Back
 *  and Forward land here through `hashchange`. A fragment that names no step
 *  keeps the last selection rather than snapping back to the default. The
 *  server and the first client render see no fragment, so hydration matches. */
export function useSelectedStep(): {
  selected: PathStepSlug;
  fromFragment: PathStepSlug | undefined;
} {
  const fromFragment = useSyncExternalStore(
    subscribeToFragment,
    () => stepFromFragment(window.location.hash),
    () => undefined,
  );
  const [last, setLast] = useState<PathStepSlug>(DEFAULT_STEP);
  if (fromFragment && fromFragment !== last) setLast(fromFragment);
  return { selected: fromFragment ?? last, fromFragment };
}

/* Storage can throw — disabled, full, or a private window — and a tick is
   never worth an error, so every access degrades to "nothing seen". */
function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* Unavailable storage: the tick lasts as long as nothing. */
  }
}

function parseSeen(raw: string | null): ReadonlySet<PathStepSlug> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.flatMap((value) =>
        typeof value === "string" ? (stepFromFragment(value) ?? []) : [],
      ),
    );
  } catch {
    return new Set();
  }
}

export function readSeen(): ReadonlySet<PathStepSlug> {
  return parseSeen(readStorage(SEEN_STORAGE_KEY));
}

function writeSeen(seen: ReadonlySet<PathStepSlug>) {
  writeStorage(
    SEEN_STORAGE_KEY,
    seen.size > 0 ? JSON.stringify([...seen]) : null,
  );
  window.dispatchEvent(new Event(SEEN_CHANGE_EVENT));
}

export function markSeen(slug: PathStepSlug) {
  const seen = readSeen();
  if (seen.has(slug)) return;
  writeSeen(new Set([...seen, slug]));
}

export function clearSeen() {
  writeSeen(new Set());
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
 *  stably between renders; the set is parsed from it. Empty on the server. */
export function useSeenSteps(): ReadonlySet<PathStepSlug> {
  const raw = useSyncExternalStore(
    subscribeToSeen,
    () => readStorage(SEEN_STORAGE_KEY),
    () => null,
  );
  const [parsed, setParsed] = useState(() => ({ raw, seen: parseSeen(raw) }));
  if (parsed.raw !== raw) setParsed({ raw, seen: parseSeen(raw) });
  return parsed.seen;
}

export function hasEntered(): boolean {
  return readStorage(ENTERED_STORAGE_KEY) === "1";
}

export function markEntered() {
  writeStorage(ENTERED_STORAGE_KEY, "1");
}
