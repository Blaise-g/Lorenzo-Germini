/* Generates the 3D path's voice clips (#150): one per step, read from its
   narration in `src/data/path-narration.ts`, a cue at a time, so the
   manifest can record where each cue starts and ends and the captions and
   the board follow the voice. The clips are static files, made here and
   checked in; nothing is synthesised at runtime, and the browser's
   `speechSynthesis` is rejected.

   Each cue is synthesised alone, decoded to 16-bit PCM, trimmed of its
   silence and joined to the others with a short pause between
   (`path-voice-output.ts`), then the whole is encoded once. The timings are
   sample counts, not estimates. Once encoded, the clip is decoded again,
   silently, to check that its length is still the joined PCM's.

   Clips and manifest are published together, only once every clip is made.
   The manifest keeps each cue's words as they were spoken, so
   `tests/path-voice.spec.ts` fails on a reworded cue until its clip is
   generated again.

   The provider is a parameter, `--provider say|elevenlabs`. Without one it is
   ElevenLabs when `ELEVENLABS_API_KEY` is set, and otherwise macOS `say` with
   a stock system voice. Either way the cues are joined and encoded by
   `afconvert`, so this runs on macOS only, and the page labels the clips
   "synthetic voice", and never as Lorenzo's.

   Open item for stage 4's voice, recorded in `docs/path-assets.md`: Apple's
   licence allows output from the macOS system voices for personal,
   non-commercial use only, so a shipped voice needs another provider. */

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { PATH_STEPS } from "../src/data/path";
import { PATH_NARRATION } from "../src/data/path-narration";
import {
  VOICE_DIRECTORY,
  type VoiceManifest,
  type VoiceProvider,
} from "../src/app/path/voice-manifest";

import {
  joinCues,
  readWav,
  writeVoiceClips,
  writeWav,
  type SynthesisedClip,
} from "./path-voice-output";

const run = promisify(execFile);

/** A clip is about 60 KB (storyboard §7.6); one past it is reported. */
const TARGET_BYTES = 60 * 1024;
/** A step's narration runs about 14–30 s (v3, its floor approved at 14 s); one
 *  outside it is reported. */
const TARGET_SECONDS = [14, 30] as const;
/** The encoded clip may differ from the joined PCM by a frame or so; more,
 *  and the timings would not line up with what is heard. */
const MAX_DRIFT_MS = 60;

const SAY_VOICE = "Samantha";
/* Mono HE-AAC at 16 kbps, about 2 KB a second. Plain AAC below 24 kbps
   resamples the voice to 12 kHz or less and the sibilants go; HE-AAC codes
   the lower band at 11.025 kHz and rebuilds the top from it, so the voice
   keeps its 22.05 kHz. A step that reads for more than about half a minute
   still runs past the target, so its clip is reported rather than squeezed
   further. Safari, Chromium and Firefox all decode HE-AAC in MP4. */
const CODEC = "aach";
const BITRATE = 16000;

/* ElevenLabs' stock "Rachel" voice; `ELEVENLABS_VOICE_ID` picks another. */
const ELEVENLABS_VOICE =
  process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

/** `--provider say`, `--provider=say`, or the default without one. */
function providerFromArgs(): VoiceProvider {
  const args = process.argv.slice(2);
  const index = args.findIndex(
    (arg) => arg === "--provider" || arg.startsWith("--provider="),
  );
  if (index === -1) {
    return process.env.ELEVENLABS_API_KEY ? "elevenlabs" : "say";
  }
  const value = args[index].includes("=")
    ? args[index].slice("--provider=".length)
    : args[index + 1];
  if (value !== "say" && value !== "elevenlabs") {
    throw new Error(`Unknown provider "${value}": use say or elevenlabs`);
  }
  return value;
}

/** The PCM every cue is decoded to before joining. */
const PCM_FORMAT = "LEI16@22050";

/** Synthesises one cue into `scratch` and returns it as mono PCM. */
async function synthesiseCue(
  provider: VoiceProvider,
  cue: string,
  scratch: string,
  name: string,
) {
  const wav = path.join(scratch, `${name}.wav`);
  if (provider === "say") {
    /* The cue goes in a file rather than argv, so nothing in it is read as
       a flag. */
    const text = path.join(scratch, `${name}.txt`);
    await writeFile(text, cue);
    await run("say", [
      "-v",
      SAY_VOICE,
      "-f",
      text,
      `--data-format=${PCM_FORMAT}`,
      "-o",
      wav,
    ]);
    return readWav(await readFile(wav));
  }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("The elevenlabs provider needs ELEVENLABS_API_KEY");
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE}?output_format=mp3_22050_32`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text: cue, model_id: "eleven_multilingual_v2" }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `ElevenLabs answered ${response.status}: ${await response.text()}`,
    );
  }
  const mp3 = path.join(scratch, `${name}.mp3`);
  await writeFile(mp3, Buffer.from(await response.arrayBuffer()));
  await run("afconvert", ["-f", "WAVE", "-d", PCM_FORMAT, "-c", "1", mp3, wav]);
  return readWav(await readFile(wav));
}

/** A step's clip: each cue synthesised, joined with their timings, encoded,
 *  then decoded again, silently, to check the encoding kept its length. */
async function synthesise(
  provider: VoiceProvider,
  cues: readonly string[],
  scratch: string,
): Promise<SynthesisedClip> {
  const parts = [];
  for (const [index, cue] of cues.entries()) {
    parts.push(await synthesiseCue(provider, cue, scratch, `cue-${index}`));
  }
  const joined = joinCues(parts);
  const wav = path.join(scratch, "clip.wav");
  const m4a = path.join(scratch, "clip.m4a");
  await writeFile(wav, writeWav(joined.pcm));
  await run("afconvert", [
    "-f",
    "m4af",
    "-d",
    CODEC,
    "-b",
    String(BITRATE),
    "-c",
    "1",
    wav,
    m4a,
  ]);

  const decoded = path.join(scratch, "decoded.wav");
  await run("afconvert", [
    "-f",
    "WAVE",
    "-d",
    PCM_FORMAT,
    "-c",
    "1",
    m4a,
    decoded,
  ]);
  const { sampleRate, samples } = readWav(await readFile(decoded));
  const decodedMs = (samples.length / sampleRate) * 1000;
  const drift = Math.abs(decodedMs - joined.durationMs);
  if (drift > MAX_DRIFT_MS) {
    throw new Error(
      `The encoded clip is ${Math.round(drift)} ms off its PCM (${Math.round(decodedMs)} ms against ${joined.durationMs} ms)`,
    );
  }

  return {
    bytes: await readFile(m4a),
    extension: "m4a",
    durationMs: joined.durationMs,
    cues: joined.cues,
  };
}

const PROVIDER_NAMES: Record<VoiceProvider, string> = {
  say: "macOS system voice",
  elevenlabs: "ElevenLabs",
};

const provider = providerFromArgs();
const outDirectory = path.join(process.cwd(), "public", VOICE_DIRECTORY);
const scratch = await mkdtemp(path.join(tmpdir(), "path-voice-"));

let manifest: VoiceManifest;
try {
  manifest = await writeVoiceClips({
    jobs: PATH_STEPS.map((step) => ({
      slug: step.slug,
      cues: PATH_NARRATION[step.slug].map((cue) => cue.text),
    })),
    synthesise: (cues) => synthesise(provider, cues, scratch),
    outDirectory,
    urlDirectory: VOICE_DIRECTORY,
    manifest: {
      provider,
      providerName: PROVIDER_NAMES[provider],
      voice: provider === "say" ? SAY_VOICE : ELEVENLABS_VOICE,
    },
    onClip(file, bytes, durationMs) {
      const seconds = durationMs / 1000;
      const notes = [
        bytes > TARGET_BYTES ? "past the ~60 KB target" : "",
        seconds < TARGET_SECONDS[0] || seconds > TARGET_SECONDS[1]
          ? `outside ${TARGET_SECONDS[0]}–${TARGET_SECONDS[1]} s`
          : "",
      ].filter(Boolean);
      console.log(
        `${file}: ${seconds.toFixed(2)} s, ${(bytes / 1024).toFixed(1)} KB${notes.length ? ` (${notes.join("; ")})` : ""}`,
      );
    },
  });
} finally {
  await rm(scratch, { recursive: true, force: true });
}

console.log(
  `${PATH_STEPS.length} clips by ${manifest.providerName} (${manifest.voice}); target about ${TARGET_BYTES / 1024} KB each.`,
);
