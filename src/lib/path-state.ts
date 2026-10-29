import type { PathStepSlug } from "@/data/path.types";

/* The step-state contract shared by `/` and `/path` (GH-141, implementation
   decision 4): which step a fragment names, the history push, and the two
   local-storage keys. Fragments are read on the client only — never
   `searchParams` or a dynamic segment, which Cache Components would count as
   runtime reads (decision 13). No React here, so a server module may import
   the keys; the hooks that read this state are in `use-path-state.ts`. */

/* A record rather than a list, so a slug added to `PathStepSlug` and missing
   here fails to compile instead of never selecting from its fragment. */
const STEP_SLUGS: Record<PathStepSlug, true> = {
  home: true,
  turin: true,
  switzerland: true,
  "cuneo-2022": true,
  lille: true,
  now: true,
  next: true,
};

/** The steps the visitor has selected, as a JSON array of slugs. Shared by
 *  both routes, so a tick earned on one shows on the other. */
export const SEEN_STORAGE_KEY = "path:seen";

/** Set once the visitor has entered `/path`; the door reads it to say
 *  "Continue the path" (decision 6). */
export const ENTERED_STORAGE_KEY = "path:entered";

/** The step selected when the fragment is empty: now (storyboard §7.2). It is
 *  shown, not chosen, so it earns no seen tick. */
export const DEFAULT_STEP: PathStepSlug = "now";

export const SEEN_CHANGE_EVENT = "path:seen-change";

export function isStepSlug(value: string): value is PathStepSlug {
  return Object.hasOwn(STEP_SLUGS, value);
}

/** The step a fragment names (`#lille`, or `lille`), or `undefined` for any
 *  other fragment — a side prop's, a malformed one, or none. */
export function stepFromFragment(fragment: string): PathStepSlug | undefined {
  let slug: string;
  try {
    slug = decodeURIComponent(fragment.replace(/^#/, ""));
  } catch {
    /* `/#%` is a URL anyone can type; it names no step. */
    return undefined;
  }
  return isStepSlug(slug) ? slug : undefined;
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

let replacing = false;

/** Replace the current history entry with `#slug`, for a step the visitor did
 *  not pick: `/path`'s tour advances this way, so Back skips its auto-steps
 *  rather than walking through each one. Dispatches a `hashchange` as
 *  `pushStep` does; listeners that run inside it can tell it from a pick with
 *  `isReplacingStep`. */
export function replaceStep(slug: PathStepSlug) {
  const fragment = fragmentForStep(slug);
  if (window.location.hash === fragment) return;
  const oldURL = window.location.href;
  window.history.replaceState(window.history.state, "", fragment);
  replacing = true;
  try {
    window.dispatchEvent(
      new HashChangeEvent("hashchange", {
        oldURL,
        newURL: window.location.href,
      }),
    );
  } finally {
    replacing = false;
  }
}

/** True only inside the `hashchange` that `replaceStep` dispatches. */
export function isReplacingStep(): boolean {
  return replacing;
}

/* Storage can throw — disabled, full, or a private window — and a tick is
   never worth an error, so every access degrades to "nothing seen". */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Sets `key`, or removes it for null. Unavailable storage: the value
 *  lasts as long as nothing. */
export function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* Nothing to keep it in. */
  }
}

export function parseSeen(raw: string | null): ReadonlySet<PathStepSlug> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter(
        (value): value is PathStepSlug =>
          typeof value === "string" && isStepSlug(value),
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

export function hasEntered(): boolean {
  return readStorage(ENTERED_STORAGE_KEY) === "1";
}

export function markEntered() {
  writeStorage(ENTERED_STORAGE_KEY, "1");
}
