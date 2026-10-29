import type { SceneEvent } from "@/components/path/scene/life";

/* The board's sound (v3; the benchmark's §4(e)): six one-shots and a bed of
   wind and birds, all made in code with plain Web Audio, so there is no
   file to fetch and nothing downloads before the Sound switch is on, or
   after. Each sound is a small graph of oscillators, noise and filters
   scheduled on any `BaseAudioContext`: the page plays them on a live
   context, and a spec renders them on an `OfflineAudioContext` to check
   their length and level without playing anything aloud. No React here. */

export type SoundName = SceneEvent;

/** Every sound, and how long its tail rings, in seconds: what an offline
 *  render of it needs. */
export const SOUND_SECONDS: Readonly<Record<SoundName, number>> = {
  hop: 0.08,
  land: 0.4,
  rise: 0.75,
  "beat-high": 0.7,
  "beat-low": 0.7,
  skip: 0.8,
  end: 2.4,
};

/** The bed's loop, in seconds (§4(e)). */
export const BED_SECONDS = 20;
/** The bed's level under no voice, against the effects at 1. */
export const BED_LEVEL = 0.32;
/** How far the bed ducks under the voice, and how fast (§4(e)). */
export const DUCK_DB = -9;
export const DUCK_SECONDS = 0.15;
/** Hops vary their pitch this much either way, so repeated hops do not
 *  sound mechanical (§4(e)). */
export const HOP_PITCH_SPREAD = 0.03;

/** The two pitches of a prop's beat: a soft mallet on G5 and on C5. */
export const BEAT_HZ = { "beat-high": 784, "beat-low": 523.25 } as const;
/** The end chord: C major, spread over two octaves. */
export const END_CHORD_HZ = [261.63, 329.63, 392, 523.25] as const;

export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

/** A hop's playback rate from a random number in [0, 1): within ±3%. */
export function hopRate(random: number): number {
  return 1 + (random * 2 - 1) * HOP_PITCH_SPREAD;
}

/** A buffer of white noise, `seconds` long, from a seeded generator, so a
 *  render is the same every time. */
function noise(context: BaseAudioContext, seconds: number, seed = 1) {
  const length = Math.max(1, Math.round(seconds * context.sampleRate));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let state = seed;
  for (let i = 0; i < length; i++) {
    state = (state * 16807) % 2147483647;
    data[i] = (state / 2147483647) * 2 - 1;
  }
  return buffer;
}

/** A gain that rises to `peak` in `attack` s, then decays exponentially to
 *  silence by `end` s, from `at`. */
function envelope(
  context: BaseAudioContext,
  at: number,
  peak: number,
  attack: number,
  end: number,
) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + end);
  return gain;
}

function tone(
  context: BaseAudioContext,
  out: AudioNode,
  at: number,
  hz: number,
  peak: number,
  end: number,
  type: OscillatorType = "sine",
) {
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(hz, at);
  const gain = envelope(context, at, peak, 0.004, end);
  oscillator.connect(gain).connect(out);
  oscillator.start(at);
  oscillator.stop(at + end + 0.02);
  return oscillator;
}

function noiseBurst(
  context: BaseAudioContext,
  at: number,
  seconds: number,
  seed: number,
) {
  const source = context.createBufferSource();
  source.buffer = noise(context, seconds, seed);
  source.start(at);
  return source;
}

/** A soft mallet: a fundamental and a marimba's quieter fourth partial,
 *  the upper one dying first. */
function mallet(
  context: BaseAudioContext,
  out: AudioNode,
  at: number,
  hz: number,
  peak: number,
  ring: number,
) {
  tone(context, out, at, hz, peak, ring);
  tone(context, out, at, hz * 3.93, peak * 0.18, ring * 0.3);
}

/** Schedules `name` on `context` at `at` s into `out`, its pitch scaled by
 *  `rate`. */
export function scheduleSound(
  context: BaseAudioContext,
  name: SoundName,
  out: AudioNode,
  at: number,
  rate = 1,
) {
  switch (name) {
    case "hop": {
      /* A wood tick: a short knock of band-passed noise over a pitched
         click. */
      const knock = noiseBurst(context, at, 0.05, 11);
      const band = context.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 1900 * rate;
      band.Q.value = 6;
      knock
        .connect(band)
        .connect(envelope(context, at, 0.5, 0.002, 0.05))
        .connect(out);
      tone(context, out, at, 880 * rate, 0.22, 0.07, "triangle");
      break;
    }
    case "land": {
      /* A soft card thump: a low sine falling in pitch, with a muffled
         slap. */
      const body = context.createOscillator();
      body.frequency.setValueAtTime(130, at);
      body.frequency.exponentialRampToValueAtTime(58, at + 0.16);
      body.connect(envelope(context, at, 0.55, 0.006, 0.34)).connect(out);
      body.start(at);
      body.stop(at + 0.4);
      const slap = noiseBurst(context, at, 0.12, 23);
      const low = context.createBiquadFilter();
      low.type = "lowpass";
      low.frequency.value = 700;
      slap
        .connect(low)
        .connect(envelope(context, at, 0.3, 0.003, 0.11))
        .connect(out);
      break;
    }
    case "rise": {
      /* Paper and wood sliding: noise swept up through a band, swelling
         and fading, set down with a small knock. */
      const slide = noiseBurst(context, at, 0.7, 37);
      const band = context.createBiquadFilter();
      band.type = "bandpass";
      band.Q.value = 2.2;
      band.frequency.setValueAtTime(380, at);
      band.frequency.exponentialRampToValueAtTime(1700, at + 0.55);
      const swell = context.createGain();
      swell.gain.setValueAtTime(0.0001, at);
      swell.gain.exponentialRampToValueAtTime(0.32, at + 0.32);
      swell.gain.exponentialRampToValueAtTime(0.0001, at + 0.62);
      slide.connect(band).connect(swell).connect(out);
      tone(context, out, at + 0.56, 196, 0.22, 0.14, "triangle");
      break;
    }
    case "beat-high":
    case "beat-low":
      mallet(context, out, at, BEAT_HZ[name] * rate, 0.32, 0.62);
      break;
    case "skip": {
      /* A whoosh: noise through a band that sweeps up and back down, in a
         bell-shaped swell. */
      const air = noiseBurst(context, at, 0.8, 53);
      const band = context.createBiquadFilter();
      band.type = "bandpass";
      band.Q.value = 1.4;
      band.frequency.setValueAtTime(320, at);
      band.frequency.exponentialRampToValueAtTime(2400, at + 0.36);
      band.frequency.exponentialRampToValueAtTime(600, at + 0.75);
      const swell = context.createGain();
      swell.gain.setValueAtTime(0.0001, at);
      swell.gain.exponentialRampToValueAtTime(0.4, at + 0.3);
      swell.gain.exponentialRampToValueAtTime(0.0001, at + 0.76);
      air.connect(band).connect(swell).connect(out);
      break;
    }
    case "end":
      /* The end chord: four mallets, struck a hair apart, ringing long. */
      END_CHORD_HZ.forEach((hz, i) =>
        mallet(context, out, at + i * 0.045, hz, 0.16, 2.3 - i * 0.1),
      );
      break;
  }
}

/** The bed: a 20 s loop of wind and birds, rendered once, offline, when
 *  the Sound switch first goes on. Wind is noise under a low-pass that
 *  breathes twice a loop, so its seam is in step; birds are short chirps,
 *  rising and falling, at places fixed by a seed. Its last second is
 *  crossfaded into its first, so the loop has no seam. */
export async function renderBed(
  sampleRate = 22050,
  Offline: typeof OfflineAudioContext = OfflineAudioContext,
): Promise<AudioBuffer> {
  const FADE = 1;
  const seconds = BED_SECONDS + FADE;
  const context = new Offline(1, Math.round(seconds * sampleRate), sampleRate);
  const out = context.createGain();
  out.gain.value = 1;
  out.connect(context.destination);

  const wind = context.createBufferSource();
  wind.buffer = noise(context, seconds, 71);
  const low = context.createBiquadFilter();
  low.type = "lowpass";
  low.Q.value = 0.7;
  low.frequency.value = 420;
  const gust = context.createGain();
  gust.gain.value = 0.16;
  const lfo = context.createOscillator();
  lfo.frequency.value = 2 / BED_SECONDS;
  const depth = context.createGain();
  depth.gain.value = 0.08;
  lfo.connect(depth).connect(gust.gain);
  const sweep = context.createGain();
  sweep.gain.value = 160;
  lfo.connect(sweep).connect(low.frequency);
  wind.connect(low).connect(gust).connect(out);
  wind.start(0);
  lfo.start(0);

  let state = 97;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  for (let call = 0; call < 9; call++) {
    const start = 0.6 + random() * (BED_SECONDS - 2);
    const notes = 2 + Math.floor(random() * 4);
    const base = 2600 + random() * 1800;
    for (let note = 0; note < notes; note++) {
      const at = start + note * (0.09 + random() * 0.05);
      const chirp = context.createOscillator();
      chirp.frequency.setValueAtTime(base * (0.9 + random() * 0.2), at);
      chirp.frequency.exponentialRampToValueAtTime(
        base * (1.25 + random() * 0.3),
        at + 0.05,
      );
      chirp.frequency.exponentialRampToValueAtTime(base * 0.85, at + 0.09);
      chirp.connect(envelope(context, at, 0.05, 0.008, 0.09)).connect(out);
      chirp.start(at);
      chirp.stop(at + 0.11);
    }
  }

  const rendered = await context.startRendering();
  const loop = Math.round(BED_SECONDS * sampleRate);
  const fade = Math.round(FADE * sampleRate);
  const data = rendered.getChannelData(0);
  const looped = new Float32Array(loop);
  looped.set(data.subarray(0, loop));
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    looped[i] = data[i] * Math.sqrt(t) + data[loop + i] * Math.sqrt(1 - t);
  }
  const bed = new AudioBuffer({
    length: loop,
    sampleRate,
    numberOfChannels: 1,
  });
  bed.copyToChannel(looped, 0);
  return bed;
}

/** The live engine, made in the switch's click so the browser lets it
 *  sound: a master gain for the effects, and the bed under its own gain,
 *  which ducks under the voice. */
export function createSoundEngine(Context: typeof AudioContext = AudioContext) {
  const context = new Context();
  const master = context.createGain();
  master.gain.value = 0.7;
  master.connect(context.destination);
  const bedGain = context.createGain();
  bedGain.gain.value = 0;
  bedGain.connect(master);
  let bedSource: AudioBufferSourceNode | undefined;
  let ducked = false;
  let disposed = false;

  void renderBed().then((buffer) => {
    if (disposed) return;
    bedSource = context.createBufferSource();
    bedSource.buffer = buffer;
    bedSource.loop = true;
    bedSource.connect(bedGain);
    bedSource.start();
    const level = BED_LEVEL * (ducked ? dbToGain(DUCK_DB) : 1);
    bedGain.gain.setValueAtTime(0, context.currentTime);
    bedGain.gain.linearRampToValueAtTime(level, context.currentTime + 1.5);
  });

  return {
    context,
    play(name: SoundName) {
      if (context.state !== "running") return;
      const rate = name === "hop" ? hopRate(Math.random()) : 1;
      scheduleSound(context, name, master, context.currentTime + 0.005, rate);
    },
    /** Ducks the bed under the voice, or brings it back. */
    duck(on: boolean) {
      ducked = on;
      if (!bedSource) return;
      const now = context.currentTime;
      bedGain.gain.cancelScheduledValues(now);
      bedGain.gain.setValueAtTime(bedGain.gain.value, now);
      bedGain.gain.linearRampToValueAtTime(
        BED_LEVEL * (on ? dbToGain(DUCK_DB) : 1),
        now + DUCK_SECONDS,
      );
    },
    /** The bed's level now, for a spec of the ducking. */
    bedLevel() {
      return bedGain.gain.value;
    },
    resume() {
      return context.resume();
    },
    async dispose() {
      disposed = true;
      bedSource?.stop();
      await context.close();
    },
  };
}

export type SoundEngine = ReturnType<typeof createSoundEngine>;
