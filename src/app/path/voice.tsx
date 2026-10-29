"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { PathStepSlug } from "@/data/path.types";
import { DEFAULT_STEP, readStorage, stepFromFragment } from "@/lib/path-state";
import { useSelectedStep } from "@/lib/use-path-state";

import { VOICE_COPY } from "./copy";
import { CONTROL_CLASS_NAME } from "./scene-stage";
import { VOICE_CHANGE_EVENT, VOICE_STORAGE_KEY } from "./voice-manifest";

/* The voice on `/path` (GH-150; GH-141, decision 9; storyboard §7.6). Off by
   default: "Listen" plays the selected step's clip, and the Voice switch,
   remembered in local storage, plays the clip of each step selected after it
   is on. Nothing plays on load: a refresh or a shared link never starts a
   voice (decision 13), so the switch answers `hashchange` — a selection or a
   Back — and not the selected step itself, which hydration also changes. The
   audio element has no source until a clip is first played, so a visit that
   never listens fetches no audio. */

type Status = "idle" | "loading" | "playing" | "paused" | "blocked" | "failed";

/* What the primary control says, and the line under the label, per status. */
const PRIMARY_LABEL: Record<Status, string> = {
  idle: VOICE_COPY.listen,
  loading: VOICE_COPY.loading,
  playing: VOICE_COPY.pause,
  paused: VOICE_COPY.resume,
  blocked: VOICE_COPY.play,
  failed: VOICE_COPY.listen,
};

const MESSAGE: Partial<Record<Status, string>> = {
  blocked: VOICE_COPY.blocked,
  failed: VOICE_COPY.failed,
};

function subscribeToVoice(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(VOICE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(VOICE_CHANGE_EVENT, onChange);
  };
}

function useVoiceSwitch(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    subscribeToVoice,
    () => readStorage(VOICE_STORAGE_KEY) === "on",
    () => false,
  );
  const set = useCallback((next: boolean) => {
    try {
      if (next) window.localStorage.setItem(VOICE_STORAGE_KEY, "on");
      else window.localStorage.removeItem(VOICE_STORAGE_KEY);
    } catch {
      /* Unavailable storage: the switch lasts as long as nothing. */
    }
    window.dispatchEvent(new Event(VOICE_CHANGE_EVENT));
  }, []);
  return [on, set];
}

/** The step a `hashchange` selected, as `useSelectedStep` reads it: none for
 *  a fragment that names no step, which keeps the last selection. Mirrors
 *  `fragmentStep` in `use-path-state.ts`; a change there belongs here too. */
function selectedByFragment(): PathStepSlug | undefined {
  const { hash } = window.location;
  return hash === "" || hash === "#" ? DEFAULT_STEP : stepFromFragment(hash);
}

export function VoiceControls({
  clips,
  providerName,
}: {
  /** Each clip's URL, by step; a step without one has no narration yet. */
  clips: Partial<Record<PathStepSlug, string>>;
  providerName: string;
}) {
  const { selected } = useSelectedStep();
  const [voiceOn, setVoiceOn] = useVoiceSwitch();
  const audioRef = useRef<HTMLAudioElement>(null);
  /* The step whose clip is in the element, read by handlers that run before
     React re-renders. */
  const loadedRef = useRef<PathStepSlug | null>(null);
  const [loaded, setLoaded] = useState<PathStepSlug | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  const play = useCallback(
    (slug: PathStepSlug) => {
      const audio = audioRef.current;
      const src = clips[slug];
      if (!audio || !src) return;
      /* A clip that failed is fetched again rather than replayed as failed. */
      if (loadedRef.current !== slug || audio.error) {
        loadedRef.current = slug;
        setLoaded(slug);
        audio.src = src;
      }
      /* Until it plays, it is loading, and Stop can cancel it. */
      setStatus("loading");
      audio.play().then(
        () => setStatus("playing"),
        (error: unknown) => {
          const name = error instanceof DOMException ? error.name : "";
          /* A newer source or a pause interrupted it: nothing to report. */
          if (name === "AbortError") return;
          /* Autoplay held it back, as it can for a switch-started clip on a
             Back: the visitor's own press on Play is allowed. */
          setStatus(name === "NotAllowedError" ? "blocked" : "failed");
        },
      );
    },
    [clips],
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    /* Idle before the pause event arrives, so it leaves this alone. */
    setStatus("idle");
    audio.pause();
    audio.currentTime = 0;
  }, []);

  /* After hydration a selection is a `hashchange`, so it is the one place a
     clip is stopped and started. A clip belongs to its step: selecting
     another stops it, and with the switch on, starts the new step's. */
  useEffect(() => {
    function onHashChange() {
      const slug = selectedByFragment();
      if (!slug) return;
      if (loadedRef.current !== null && loadedRef.current !== slug) stop();
      if (voiceOn) play(slug);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [voiceOn, play, stop]);

  const hasClip = clips[selected] !== undefined;
  /* What the controls show for the selected step: another step's clip,
     stopped when it was deselected, is not this one's. */
  const shown: Status = loaded === selected ? status : "idle";
  const playing = shown === "playing";
  const message = MESSAGE[shown] ?? (hasClip ? "" : VOICE_COPY.noClip);

  return (
    <div data-path-voice data-voice-state={shown} className="print:hidden">
      <audio
        ref={audioRef}
        preload="none"
        data-path-voice-audio
        /* A pause of a playing clip lands here, whoever asked for it: Pause,
           the end of the clip, the system's media keys. Stop has already
           made it idle. */
        onPause={(event) => {
          const { ended } = event.currentTarget;
          setStatus((current) =>
            current === "playing" ? (ended ? "idle" : "paused") : current,
          );
        }}
        onError={() => setStatus("failed")}
      />
      <div className="flex h-11 items-center gap-6">
        <button
          type="button"
          data-path-voice-primary
          disabled={!hasClip || shown === "loading"}
          className={CONTROL_CLASS_NAME}
          onClick={() => {
            if (playing) audioRef.current?.pause();
            else play(selected);
          }}
        >
          {PRIMARY_LABEL[shown]}
        </button>
        <button
          type="button"
          data-path-voice-stop
          disabled={
            shown !== "loading" && shown !== "playing" && shown !== "paused"
          }
          className={CONTROL_CLASS_NAME}
          onClick={stop}
        >
          {VOICE_COPY.stop}
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={voiceOn}
          data-path-voice-switch
          className="group touch-target text-faint hover:text-ink font-label transition-refined ml-auto inline-flex items-center gap-2 text-xs tracking-[0.12em] uppercase"
          onClick={() => setVoiceOn(!voiceOn)}
        >
          <span
            aria-hidden
            className="border-border group-aria-checked:border-accent group-aria-checked:bg-accent relative inline-flex h-4 w-7 items-center rounded-full border transition-colors"
          >
            <span className="bg-faint group-aria-checked:bg-accent-foreground absolute left-0.5 size-2.5 rounded-full transition-transform group-aria-checked:translate-x-3" />
          </span>
          {VOICE_COPY.voiceSwitch}
        </button>
      </div>
      <p data-path-voice-label className="text-faint text-xs">
        {VOICE_COPY.label(providerName)}
      </p>
      {/* One line, held open, so a message arriving does not move the text
          panel under it. */}
      <p
        aria-live="polite"
        data-path-voice-message
        className="text-faint min-h-[1lh] text-xs"
      >
        {message}
      </p>
    </div>
  );
}
