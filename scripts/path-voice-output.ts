/* Where `generate-path-voice.ts` puts what it makes (#150), and how it joins
   a step's cues into one clip with their timings.

   Clips are written to a staging directory beside the clips' own, on the
   same volume so a rename moves them, and only once every clip has been made
   are they renamed into place, the clips no manifest lists removed, and the
   manifest renamed in last. So a failed synthesis, the long and fallible
   part, leaves the shipped clips and manifest as they were; only a
   filesystem error in the few renames that follow could leave them apart.
   Its own module so a spec can drive it with a fake synthesiser. */

import {
  mkdir,
  mkdtemp,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import type { VoiceCue, VoiceManifest } from "../src/app/path/voice-manifest";

export type VoiceClipJob = {
  slug: keyof VoiceManifest["clips"];
  /** The step's cues, in order: what each says. */
  cues: readonly string[];
};

/** A step's clip, made from its cues: the encoded bytes, and where each cue
 *  starts and ends in it. */
export type SynthesisedClip = {
  bytes: Buffer;
  extension: string;
  durationMs: number;
  cues: readonly Pick<VoiceCue, "startMs" | "endMs">[];
};

export type Synthesise = (cues: readonly string[]) => Promise<SynthesisedClip>;

/** Throws unless `clip` has a timing per cue, in order, without overlap, and
 *  inside the clip. */
export function checkTimings(
  slug: string,
  cues: readonly string[],
  clip: Pick<SynthesisedClip, "durationMs" | "cues">,
) {
  if (clip.cues.length !== cues.length) {
    throw new Error(
      `${slug}: ${clip.cues.length} timings for ${cues.length} cues`,
    );
  }
  let previousEnd = 0;
  for (const [index, { startMs, endMs }] of clip.cues.entries()) {
    if (!(startMs >= previousEnd && endMs > startMs)) {
      throw new Error(`${slug}: cue ${index} is out of order`);
    }
    previousEnd = endMs;
  }
  if (previousEnd > clip.durationMs) {
    throw new Error(`${slug}: its cues run past the clip`);
  }
}

/** Makes every job's clip with `synthesise`, then publishes them with
 *  `manifest` into `outDirectory`, served from `urlDirectory`. Returns the
 *  manifest as written. */
export async function writeVoiceClips({
  jobs,
  synthesise,
  outDirectory,
  urlDirectory,
  manifest,
  onClip,
}: {
  jobs: readonly VoiceClipJob[];
  synthesise: Synthesise;
  outDirectory: string;
  urlDirectory: string;
  manifest: Omit<VoiceManifest, "clips">;
  onClip?: (file: string, bytes: number, durationMs: number) => void;
}): Promise<VoiceManifest> {
  await mkdir(outDirectory, { recursive: true });
  const staging = await mkdtemp(
    path.join(path.dirname(outDirectory), ".voice-staging-"),
  );
  const written: VoiceManifest = { ...manifest, clips: {} };
  try {
    for (const job of jobs) {
      const clip = await synthesise(job.cues);
      checkTimings(job.slug, job.cues, clip);
      const file = `${job.slug}.${clip.extension}`;
      await writeFile(path.join(staging, file), clip.bytes);
      written.clips[job.slug] = {
        src: `/${urlDirectory}/${file}`,
        bytes: clip.bytes.byteLength,
        durationMs: clip.durationMs,
        cues: job.cues.map((text, index) => ({
          text,
          startMs: clip.cues[index].startMs,
          endMs: clip.cues[index].endMs,
        })),
      };
      onClip?.(file, clip.bytes.byteLength, clip.durationMs);
    }
    await writeFile(
      path.join(staging, "manifest.json"),
      `${JSON.stringify(written, null, 2)}\n`,
    );

    const kept = new Set(
      Object.values(written.clips).map((clip) => path.basename(clip.src)),
    );
    for (const file of kept) {
      await rename(path.join(staging, file), path.join(outDirectory, file));
    }
    /* A clip the manifest no longer lists — another provider's format, a
       step that lost its narration — would ship with nothing pointing at
       it. */
    for (const file of await readdir(outDirectory)) {
      if (/\.(m4a|mp3)$/.test(file) && !kept.has(file)) {
        await rm(path.join(outDirectory, file));
      }
    }
    await rename(
      path.join(staging, "manifest.json"),
      path.join(outDirectory, "manifest.json"),
    );
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return written;
}

/* Joining cues. Each cue is synthesised on its own as 16-bit PCM WAV, so its
   length is a count of samples rather than a guess; its silence at either
   end is trimmed, and the cues are laid end to end with `GAP_MS` of silence
   between them, the pause between two sentences. What a cue's timing spans
   is then its speech, not the synthesiser's padding. */

/** The pause between two cues. */
export const GAP_MS = 350;
/** Quieter than this, a sample counts as silence when trimming: about
 *  -42 dBFS, under the voice's breath but over dither. */
const SILENCE = 256;

export type Pcm = { sampleRate: number; samples: Int16Array };

/** The mono 16-bit PCM in a WAV file. Its chunks are walked rather than
 *  assumed: `say` writes a JUNK chunk before `fmt `. */
export function readWav(bytes: Buffer): Pcm {
  if (
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error("Not a WAV file");
  }
  let sampleRate = 0;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      const format = bytes.readUInt16LE(body);
      const channels = bytes.readUInt16LE(body + 2);
      const bits = bytes.readUInt16LE(body + 14);
      /* 0xfffe is WAVE_FORMAT_EXTENSIBLE, which `afconvert` writes for the
         same PCM. */
      const pcm = format === 1 || format === 0xfffe;
      if (!pcm || channels !== 1 || bits !== 16) {
        throw new Error("Expected mono 16-bit PCM");
      }
      sampleRate = bytes.readUInt32LE(body + 4);
    }
    if (id === "data") {
      if (!sampleRate) throw new Error("The WAV's data comes before its fmt");
      const data = bytes.subarray(body, body + size);
      const samples = new Int16Array(data.length / 2);
      for (let i = 0; i < samples.length; i += 1) {
        samples[i] = data.readInt16LE(i * 2);
      }
      return { sampleRate, samples };
    }
    offset = body + size + (size % 2);
  }
  throw new Error("The WAV has no data");
}

/** `pcm` as a plain WAV file. */
export function writeWav({ sampleRate, samples }: Pcm): Buffer {
  const data = samples.length * 2;
  const bytes = Buffer.alloc(44 + data);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(36 + data, 4);
  bytes.write("WAVE", 8, "ascii");
  bytes.write("fmt ", 12, "ascii");
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36, "ascii");
  bytes.writeUInt32LE(data, 40);
  for (let i = 0; i < samples.length; i += 1) {
    bytes.writeInt16LE(samples[i], 44 + i * 2);
  }
  return bytes;
}

function trimSilence(samples: Int16Array): Int16Array {
  let start = 0;
  while (start < samples.length && Math.abs(samples[start]) < SILENCE) {
    start += 1;
  }
  let end = samples.length;
  while (end > start && Math.abs(samples[end - 1]) < SILENCE) end -= 1;
  return samples.subarray(start, end);
}

/** The cues' PCM, trimmed and laid end to end `gapMs` apart, and each cue's
 *  span in the result, in whole milliseconds. Rounded outward, so a span
 *  always covers its speech. */
export function joinCues(
  cues: readonly Pcm[],
  gapMs = GAP_MS,
): {
  pcm: Pcm;
  durationMs: number;
  cues: { startMs: number; endMs: number }[];
} {
  const [first] = cues;
  if (!first) throw new Error("No cues to join");
  const { sampleRate } = first;
  if (cues.some((cue) => cue.sampleRate !== sampleRate)) {
    throw new Error("The cues' sample rates differ");
  }
  const gap = Math.round((gapMs / 1000) * sampleRate);
  const trimmed = cues.map((cue) => trimSilence(cue.samples));
  const total =
    trimmed.reduce((sum, part) => sum + part.length, 0) +
    gap * (trimmed.length - 1);
  const samples = new Int16Array(total);
  const spans: { startMs: number; endMs: number }[] = [];
  const ms = (count: number) => (count / sampleRate) * 1000;
  let at = 0;
  for (const [index, part] of trimmed.entries()) {
    if (index > 0) at += gap;
    samples.set(part, at);
    spans.push({
      startMs: Math.floor(ms(at)),
      endMs: Math.ceil(ms(at + part.length)),
    });
    at += part.length;
  }
  return {
    pcm: { sampleRate, samples },
    durationMs: Math.ceil(ms(total)),
    cues: spans,
  };
}
