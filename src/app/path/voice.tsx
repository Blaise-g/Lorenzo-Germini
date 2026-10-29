"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { fragmentForStep, readStorage } from "@/lib/path-state";
import { useSelectedStep } from "@/lib/use-path-state";
import { cn } from "@/lib/utils";

import { VOICE_COPY } from "./copy";
import { narrationFor, VOICE_PROVIDER_NAME } from "./narration";
import { useHydrated } from "./overlay";
import { SoundSwitch } from "./sound";
import { useNarrationCue } from "./stage-status";
import { useNarrationPlayhead } from "./tour";
import {
  CAPTIONS_CHANGE_EVENT,
  CAPTIONS_STORAGE_KEY,
  VOICE_CHANGE_EVENT,
  VOICE_STORAGE_KEY,
} from "./voice-manifest";

/* The narration on `/path` (GH-150; v3): the voice, the caption line under
   the board, and their switches. The tour's clock leads; the voice follows
   it. While the tour plays a step's narration, the caption line shows the
   cue it is on and, with the Voice switch on, the step's clip plays from the
   same point, so pausing, skipping or switching the voice on part-way keeps
   the two together.

   Nothing plays on load, and nothing before the visitor has pressed, clicked,
   tapped or typed on the page in this visit (decision 13): a refresh, a
   shared link or a remembered switch must not start a voice on a page nobody
   has touched. Until then the tour runs on captions, and the first press —
   Play, the Voice switch, anything — lets the voice join at the current
   step. The audio element has no source until a clip first plays, so a visit
   that never listens fetches no audio.

   The captions are on by default whenever the voice cannot be heard — off,
   not yet allowed, or held back by the browser — so the tour is never both
   silent and textless unless the visitor chose it. A choice either way is
   remembered. */

type VoiceState = "off" | "waiting" | "playing" | "paused" | "blocked";

/** A clip and the voice drifting further apart than this, the clip is moved
 *  back onto the tour's clock: about a syllable. */
const MAX_DRIFT_MS = 250;

function subscribeTo(event: string) {
  return (onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(event, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(event, onChange);
    };
  };
}

const subscribeToVoice = subscribeTo(VOICE_CHANGE_EVENT);
const subscribeToCaptions = subscribeTo(CAPTIONS_CHANGE_EVENT);

function store(key: string, event: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* Unavailable storage: the switch lasts as long as nothing. */
  }
  window.dispatchEvent(new Event(event));
}

function useVoiceSwitch(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    subscribeToVoice,
    () => readStorage(VOICE_STORAGE_KEY) === "on",
    () => false,
  );
  const set = useCallback(
    (next: boolean) =>
      store(VOICE_STORAGE_KEY, VOICE_CHANGE_EVENT, next ? "on" : null),
    [],
  );
  return [on, set];
}

/** The visitor's Captions choice, or null before they have made one. */
function useCaptionsChoice(): [boolean | null, (on: boolean) => void] {
  const stored = useSyncExternalStore(
    subscribeToCaptions,
    () => readStorage(CAPTIONS_STORAGE_KEY),
    () => null,
  );
  const set = useCallback(
    (next: boolean) =>
      store(CAPTIONS_STORAGE_KEY, CAPTIONS_CHANGE_EVENT, next ? "on" : "off"),
    [],
  );
  return [stored === "on" ? true : stored === "off" ? false : null, set];
}

/** Whether the visitor has clicked, tapped or typed on the page in this
 *  visit. Counted here rather than read from `navigator.userActivation`,
 *  which an automated navigation can already have set. Module state, so a
 *  client-side return to `/path` keeps it.
 *
 *  Counted once a press is over — its click, or its key's release — and a
 *  task after that, once the press's own handlers have run, so a first press
 *  on Pause or on the Voice switch pauses the voice before it could start.
 *  A key the browser does not count as activation (a modifier alone, or
 *  Escape) does not count here either, or `play()` would be refused. The
 *  browser's activation outlasts the wait. */
let pressedInVisit = false;

const NOT_ACTIVATING_KEYS = new Set([
  "Alt",
  "AltGraph",
  "CapsLock",
  "Control",
  "Escape",
  "Fn",
  "Meta",
  "Shift",
]);

function usePressed(onPress: () => void): boolean {
  const [pressed, setPressed] = useState(pressedInVisit);
  const onPressRef = useRef(onPress);
  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);
  useEffect(() => {
    let timer = 0;
    function press(event: Event) {
      if (
        event instanceof KeyboardEvent &&
        NOT_ACTIVATING_KEYS.has(event.key)
      ) {
        return;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        pressedInVisit = true;
        setPressed(true);
        onPressRef.current();
      });
    }
    window.addEventListener("click", press, true);
    window.addEventListener("keyup", press, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("click", press, true);
      window.removeEventListener("keyup", press, true);
    };
  }, []);
  return pressed;
}

export function Switch({
  checked,
  onChange,
  children,
  ...data
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  children: ReactNode;
} & Record<`data-${string}`, string | boolean>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      {...data}
      className="group touch-target text-faint hover:text-ink font-label transition-refined inline-flex items-center gap-2 text-xs tracking-[0.12em] uppercase"
      onClick={() => onChange(!checked)}
    >
      <span
        aria-hidden
        className="border-border group-aria-checked:border-accent group-aria-checked:bg-accent relative inline-flex h-4 w-7 items-center rounded-full border transition-colors"
      >
        <span className="bg-faint group-aria-checked:bg-accent-foreground absolute left-0.5 size-2.5 rounded-full transition-transform group-aria-checked:translate-x-3" />
      </span>
      {children}
    </button>
  );
}

/** The caption line, the tour's transport (`transport`), and the Voice and
 *  Captions switches, as one bar under the board. */
export function NarrationBar({
  transport,
  className,
}: {
  transport: ReactNode;
  className?: string;
}) {
  const { selected } = useSelectedStep();
  const cue = useNarrationCue();
  const playhead = useNarrationPlayhead();
  const [voiceOn, setVoiceOn] = useVoiceSwitch();
  const [captionsChoice, setCaptions] = useCaptionsChoice();
  /* Held back by the browser, or a clip that did not load: the voice waits
     for the next press, and the captions stand in. */
  const [blocked, setBlocked] = useState(false);
  const pressed = usePressed(useCallback(() => setBlocked(false), []));
  const hydrated = useHydrated();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const narration = narrationFor(selected);
  const src = narration.clip.src;
  const audible = voiceOn && pressed && !blocked && src !== undefined;
  const narrating = cue?.running ?? false;

  /* The clip plays while the tour narrates the step, from where the tour
     is. Anything else — a pause, a new step, the narration's end, the voice
     switched off — stops it where it is. */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audible || !narrating || !src) {
      audio.pause();
      return;
    }
    /* A clip that failed is fetched again rather than replayed as failed. */
    if (audio.getAttribute("src") !== src) audio.src = src;
    else if (audio.error) audio.load();
    audio.currentTime = playhead() / 1000;
    audio.play().catch((error: unknown) => {
      /* A newer source or a pause interrupted it: nothing to report. */
      if (error instanceof DOMException && error.name === "AbortError") return;
      setBlocked(true);
    });
  }, [audible, narrating, src, selected, playhead]);

  useEffect(() => () => audioRef.current?.pause(), []);

  const captionsOn = captionsChoice ?? !audible;
  const state: VoiceState = !voiceOn
    ? "off"
    : blocked
      ? "blocked"
      : !pressed
        ? "waiting"
        : playing
          ? "playing"
          : "paused";
  const message =
    state === "waiting"
      ? VOICE_COPY.waiting
      : state === "blocked"
        ? VOICE_COPY.blocked
        : "";
  const caption =
    hydrated && captionsOn && cue
      ? narrationFor(cue.slug).cues[cue.index].text
      : "";

  return (
    /* The cue, as attributes too: what the board reads from
       `useNarrationCue`, where a spec or a reader of the DOM can see it. */
    <div
      data-path-narration
      data-path-cue={cue?.index}
      data-path-cue-prop={cue?.prop ?? undefined}
      data-path-cue-running={cue?.running ? "" : undefined}
      data-path-captions={captionsOn ? "on" : "off"}
      className={cn(
        "path-card flex flex-col gap-y-3 px-5 py-4 md:px-6 xl:flex-row xl:items-center xl:gap-x-6",
        className,
      )}
    >
      <audio
        ref={audioRef}
        preload="none"
        data-path-voice-audio
        onPlaying={(event) => {
          setPlaying(true);
          /* Loading took time the tour's clock did not wait for: catch up. */
          const audio = event.currentTarget;
          const behind = playhead() - audio.currentTime * 1000;
          if (Math.abs(behind) > MAX_DRIFT_MS) {
            audio.currentTime = playhead() / 1000;
          }
        }}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setBlocked(true);
        }}
      />
      <div className="min-w-0 flex-1">
        {/* Two lines held open, so a longer cue does not move the board. */}
        <p
          data-path-caption
          className="path-caption font-display text-ink text-base leading-snug text-pretty lg:text-lg"
        >
          {caption}
        </p>
        {/* The step's full text, on the flat site. Printed only once
            hydrated, when the selected step is known: the server cannot see
            the fragment, and without JavaScript the text is on the page
            anyway. Its space is held either way. */}
        <a
          href={hydrated ? `/${fragmentForStep(selected)}` : undefined}
          data-path-read-step
          className={cn(
            "path-quiet-control text-faint font-label mt-1 inline-block text-[0.6875rem] tracking-[0.12em] uppercase underline-offset-4",
            !hydrated && "invisible",
          )}
        >
          {VOICE_COPY.readStep}
        </a>
      </div>
      {/* Under the caption, side by side where they fit; in the caption's
          row from `xl`, where it keeps two lines' width. */}
      <div className="flex flex-wrap items-start gap-x-8 gap-y-3 xl:contents">
        <div data-path-tour-keys className="shrink-0">
          {transport}
        </div>
        <div
          data-path-voice
          data-voice-state={state}
          className="flex shrink-0 flex-col xl:w-56"
        >
          {/* Three switches overrun the column's width from \`xl\`: Sound
              wraps under the other two there. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <Switch
              checked={voiceOn}
              onChange={setVoiceOn}
              data-path-voice-switch
            >
              {VOICE_COPY.voiceSwitch}
            </Switch>
            <Switch
              checked={captionsOn}
              onChange={setCaptions}
              data-path-captions-switch
            >
              {VOICE_COPY.captionsSwitch}
            </Switch>
            <SoundSwitch />
          </div>
          <p data-path-voice-label className="text-faint text-xs">
            {VOICE_COPY.label(VOICE_PROVIDER_NAME)}
          </p>
          {/* One line, held open, so a message arriving moves nothing. */}
          <p
            aria-live="polite"
            data-path-voice-message
            className="text-faint min-h-[1lh] text-xs"
          >
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
