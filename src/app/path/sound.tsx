"use client";

import { useEffect, useState } from "react";

import type { SceneEvent } from "@/components/path/scene/life";

import { VOICE_COPY } from "./copy";
import {
  BED_SECONDS,
  createSoundEngine,
  renderBed,
  scheduleSound,
  SOUND_SECONDS,
  type SoundEngine,
  type SoundName,
} from "./sound-engine";
import { Switch } from "./voice";

/* The Sound switch on `/path` (v3; the benchmark's §4(e)): the board's
   effects and its bed of wind and birds, beside Voice, which keeps its own
   switch. Off by default and on every visit, since a sound is only ever
   allowed to start from a press: the engine, its `AudioContext` and the bed
   are made in the switch's click, and before that nothing about sound
   exists on the page. Every sound is made in code, so nothing downloads
   then either. The bed ducks under the voice while it speaks. */

/** The engine while Sound is on. Module state, so the board, which emits
 *  its events outside React, reaches it through `playSound`. */
let engine: SoundEngine | undefined;

/** Plays what the board did, if Sound is on; nothing otherwise. */
export function playSound(event: SceneEvent) {
  engine?.play(event);
}

/** The voice's element is speaking: media events do not bubble, so they are
 *  caught on the way down. */
function voiceSpeaking(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLMediaElement)) return;
  if (!target.matches("[data-path-voice-audio]")) return;
  engine?.duck(!target.paused && !target.ended);
}

const VOICE_EVENTS = ["playing", "pause", "ended"] as const;

/** Counts each switching, so a start the switch has since turned off does
 *  not carry on once its context has resumed. */
let generation = 0;

async function start() {
  const mine = ++generation;
  const made = createSoundEngine();
  engine = made;
  /* Closed by a quick switch off before it resumed: nothing to do. */
  await made.resume().catch(() => undefined);
  if (mine !== generation) return;
  const voice = document.querySelector<HTMLMediaElement>(
    "[data-path-voice-audio]",
  );
  made.duck(!!voice && !voice.paused && !voice.ended);
  for (const type of VOICE_EVENTS) {
    document.addEventListener(type, voiceSpeaking, true);
  }
}

function stop() {
  generation += 1;
  for (const type of VOICE_EVENTS) {
    document.removeEventListener(type, voiceSpeaking, true);
  }
  void engine?.dispose();
  engine = undefined;
}

export function SoundSwitch() {
  const [on, setOn] = useState(false);
  useEffect(() => stop, []);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    installRenderHook();
  }, []);
  return (
    <Switch
      checked={on}
      onChange={(next) => {
        setOn(next);
        if (!next) return stop();
        /* A browser without Web Audio leaves the switch off. */
        start().catch(() => {
          stop();
          setOn(false);
        });
      }}
      data-path-sound-switch
    >
      {VOICE_COPY.soundSwitch}
    </Switch>
  );
}

/* ─── Checking the sounds without hearing them (dev only) ─── */

/** What an offline render of a sound measured. */
export type SoundRender = {
  seconds: number;
  /** Peak amplitude, 0 to 1. */
  peak: number;
  /** RMS level over the whole render. */
  rms: number;
  /** The last moment the level is above -60 dB, in seconds. */
  audibleUntil: number;
};

function measure(buffer: AudioBuffer): SoundRender {
  const data = buffer.getChannelData(0);
  let peak = 0;
  let sum = 0;
  let last = 0;
  const floor = 10 ** (-60 / 20);
  for (let i = 0; i < data.length; i++) {
    const level = Math.abs(data[i]);
    peak = Math.max(peak, level);
    sum += data[i] * data[i];
    if (level > floor) last = i;
  }
  return {
    seconds: buffer.duration,
    peak,
    rms: Math.sqrt(sum / data.length),
    audibleUntil: last / buffer.sampleRate,
  };
}

declare global {
  interface Window {
    __pathSound?: {
      render(name: SoundName, rate?: number): Promise<SoundRender>;
      bed(): Promise<SoundRender & { seam: number }>;
      /** The live bed's level, or null while Sound is off. */
      level(): number | null;
    };
  }
}

/** A hook on `window` for the suite: renders a sound, or the bed, on an
 *  `OfflineAudioContext`, which plays nothing aloud, and measures it. */
function installRenderHook() {
  const RATE = 22050;
  window.__pathSound = {
    async render(name, rate = 1) {
      const seconds = SOUND_SECONDS[name] + 0.1;
      const context = new OfflineAudioContext(
        1,
        Math.round(seconds * RATE),
        RATE,
      );
      scheduleSound(context, name, context.destination, 0, rate);
      return measure(await context.startRendering());
    },
    async bed() {
      const buffer = await renderBed(RATE);
      const data = buffer.getChannelData(0);
      /* The loop's seam: how far its last sample jumps to its first. */
      const seam = Math.abs(data[data.length - 1] - data[0]);
      return { ...measure(buffer), seconds: BED_SECONDS, seam };
    },
    level: () => engine?.bedLevel() ?? null,
  };
}
