"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  ENTERED_STORAGE_KEY,
  fragmentForStep,
  readStorage,
} from "@/lib/path-state";
import { useSelectedStep } from "@/lib/use-path-state";
import { DOOR_COPY } from "@/app/path/copy";

/** The door's off switch (GH-141, decision 14). It ships `false`, so `/` is
 *  unchanged until the owner turns it on. A code constant, not an env var:
 *  flipping it needs no Vercel configuration. */
export const PATH_DOOR_ENABLED = false;

/** Outside production only, this key set to `"1"` opens the door while the
 *  switch is off, so the specs can check the switched-on header without
 *  editing the constant. Production ignores it. */
export const PATH_DOOR_PREVIEW_STORAGE_KEY = "path:door-preview";

/* Inlined at build time; the key is still read in production, since a hook
   cannot be called conditionally, but nothing comes of it. */
const PREVIEW_ALLOWED = process.env.NODE_ENV !== "production";

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function useStoredFlag(key: string): boolean {
  return useSyncExternalStore(
    subscribeToStorage,
    () => readStorage(key) === "1",
    () => false,
  );
}

/** "Walk the path in 3D", or "Continue the path" once the visitor has entered
 *  `/path` (decision 6). It carries the current step across (decision 13):
 *  `/#lille` leads to `/path#lille`, a bare `/` to `/path#now`, and a side
 *  prop's fragment keeps the last step, as `/` itself does. A link
 *  only — nothing opens `/path` without a click. */
export function PathDoor() {
  const preview =
    useStoredFlag(PATH_DOOR_PREVIEW_STORAGE_KEY) && PREVIEW_ALLOWED;
  const entered = useStoredFlag(ENTERED_STORAGE_KEY);
  const { selected } = useSelectedStep();

  if (!PATH_DOOR_ENABLED && !preview) return null;

  return (
    <Link
      data-testid="path-door"
      href={`/path${fragmentForStep(selected)}`}
      className="text-accent decoration-border hover:decoration-accent touch-target font-display mt-2 inline-block text-lg font-semibold underline underline-offset-4 print:hidden"
    >
      {entered ? DOOR_COPY.returning : DOOR_COPY.firstVisit}
    </Link>
  );
}
