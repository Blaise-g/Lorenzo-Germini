/* How the voice generator publishes its clips (#150): together with their
   manifest, or not at all; and how it joins a step's cues into one clip with
   their timings (v3). Driven with a fake synthesiser and synthetic PCM in a
   scratch directory, so no voice is made and nothing under `public/`
   changes. */

import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  checkTimings,
  GAP_MS,
  joinCues,
  readWav,
  writeVoiceClips,
  writeWav,
  type Pcm,
  type SynthesisedClip,
  type VoiceClipJob,
} from "../scripts/path-voice-output";

const jobs: VoiceClipJob[] = [
  { slug: "home", cues: ["Home's new cue.", "And another."] },
  { slug: "lille", cues: ["Lille's new cue."] },
];

/** A clip whose cues each take a second, a second apart. */
function fakeClip(cues: readonly string[]): SynthesisedClip {
  return {
    bytes: Buffer.from(`new ${cues.join(" ")}`),
    extension: "m4a",
    durationMs: cues.length * 2000,
    cues: cues.map((_, index) => ({
      startMs: index * 2000,
      endMs: index * 2000 + 1000,
    })),
  };
}
const header = {
  provider: "say",
  providerName: "Test",
  voice: "Test",
} as const;

/** A scratch tree holding a published voice directory: one clip and its
 *  manifest from an earlier run, and a stale clip of another format. */
async function published() {
  const root = await mkdtemp(path.join(tmpdir(), "path-voice-output-"));
  const outDirectory = path.join(root, "voice");
  await mkdir(outDirectory);
  await writeFile(path.join(outDirectory, "home.m4a"), "old home");
  await writeFile(path.join(outDirectory, "turin.mp3"), "stale");
  await writeFile(path.join(outDirectory, "manifest.json"), "old manifest");
  return { root, outDirectory };
}

async function snapshot(directory: string) {
  const files = (await readdir(directory)).sort();
  return Promise.all(
    files.map(async (file) => [
      file,
      await readFile(path.join(directory, file), "utf8"),
    ]),
  );
}

test("a failure part-way leaves the clips and manifest as they were", async () => {
  const { root, outDirectory } = await published();
  const before = await snapshot(outDirectory);
  let calls = 0;
  await expect(
    writeVoiceClips({
      jobs,
      outDirectory,
      urlDirectory: "path/voice",
      manifest: header,
      synthesise: async (cues) => {
        calls += 1;
        if (calls === 2) throw new Error("The provider failed");
        return fakeClip(cues);
      },
    }),
  ).rejects.toThrow("The provider failed");
  expect(await snapshot(outDirectory)).toEqual(before);
  /* The staging directory is gone too. */
  expect(await readdir(root)).toEqual(["voice"]);
});

test("a full run publishes every clip with a manifest that matches", async () => {
  const { root, outDirectory } = await published();
  await writeVoiceClips({
    jobs,
    outDirectory,
    urlDirectory: "path/voice",
    manifest: header,
    synthesise: async (cues) => fakeClip(cues),
  });
  expect(await readdir(outDirectory).then((files) => files.sort())).toEqual([
    "home.m4a",
    "lille.m4a",
    "manifest.json",
  ]);
  const manifest = JSON.parse(
    await readFile(path.join(outDirectory, "manifest.json"), "utf8"),
  );
  for (const job of jobs) {
    const clip = manifest.clips[job.slug];
    expect(clip.cues).toEqual(
      job.cues.map((text, index) => ({
        text,
        startMs: index * 2000,
        endMs: index * 2000 + 1000,
      })),
    );
    expect(clip.durationMs).toBe(job.cues.length * 2000);
    expect(clip.src).toBe(`/path/voice/${job.slug}.m4a`);
    const bytes = await readFile(path.join(outDirectory, `${job.slug}.m4a`));
    expect(clip.bytes).toBe(bytes.byteLength);
  }
  expect(await readdir(root)).toEqual(["voice"]);
});

test("timings that overlap, run backwards or past the clip publish nothing", async () => {
  const bad: [string, Partial<SynthesisedClip>][] = [
    [
      "out of order",
      {
        cues: [
          { startMs: 0, endMs: 1500 },
          { startMs: 1000, endMs: 2000 },
        ],
      },
    ],
    [
      "cue 0 has no length",
      {
        cues: [
          { startMs: 500, endMs: 500 },
          { startMs: 600, endMs: 900 },
        ],
      },
    ],
    ["past the clip", { durationMs: 1500 }],
    [
      "2 timings for 1 cues",
      {
        cues: [
          { startMs: 0, endMs: 1 },
          { startMs: 2, endMs: 3 },
        ],
      },
    ],
  ];
  for (const [message, change] of bad) {
    const cues = message.startsWith("2 timings") ? ["Only one."] : ["A.", "B."];
    expect(() =>
      checkTimings("home", cues, { ...fakeClip(cues), ...change }),
    ).toThrow(message);
  }

  const { root, outDirectory } = await published();
  const before = await snapshot(outDirectory);
  await expect(
    writeVoiceClips({
      jobs,
      outDirectory,
      urlDirectory: "path/voice",
      manifest: header,
      synthesise: async (cues) => ({ ...fakeClip(cues), durationMs: 10 }),
    }),
  ).rejects.toThrow("past the clip");
  expect(await snapshot(outDirectory)).toEqual(before);
  expect(await readdir(root)).toEqual(["voice"]);
});

/** `speech` samples of a tone between `silence` samples of quiet each
 *  side, at 1 kHz so a sample is a millisecond. */
function cue(silence: number, speech: number): Pcm {
  const samples = new Int16Array(silence * 2 + speech);
  for (let i = 0; i < speech; i += 1) {
    samples[silence + i] = i % 2 ? 4000 : -4000;
  }
  /* Quiet that is not zero, as a synthesiser's tail is not. */
  if (silence > 0) {
    samples[0] = 30;
    samples[samples.length - 1] = -30;
  }
  return { sampleRate: 1000, samples };
}

test("cues are trimmed of their silence and joined a gap apart, each timed by its speech", () => {
  const joined = joinCues([cue(100, 400), cue(50, 300), cue(0, 200)]);

  expect(joined.cues).toEqual([
    { startMs: 0, endMs: 400 },
    { startMs: 400 + GAP_MS, endMs: 400 + GAP_MS + 300 },
    { startMs: 700 + 2 * GAP_MS, endMs: 700 + 2 * GAP_MS + 200 },
  ]);
  expect(joined.durationMs).toBe(900 + 2 * GAP_MS);
  expect(joined.pcm.samples.length).toBe(900 + 2 * GAP_MS);
  /* The gap is silence; the speech is where its timing says. */
  const { samples } = joined.pcm;
  expect(samples.subarray(400, 400 + GAP_MS).every((s) => s === 0)).toBe(true);
  expect(Math.abs(samples[400 + GAP_MS])).toBe(4000);
  expect(() => checkTimings("home", ["A.", "B.", "C."], joined)).not.toThrow();
});

test("a cue synthesised to silence is named as silent, not as a timing out of order", () => {
  expect(() => joinCues([cue(0, 10), cue(40, 0), cue(0, 10)])).toThrow(
    "Cue 1 synthesised to silence",
  );
});

test("cues of different sample rates are refused", () => {
  expect(() =>
    joinCues([cue(0, 10), { ...cue(0, 10), sampleRate: 2000 }]),
  ).toThrow("sample rates");
});

test("a WAV round-trips, and one with chunks before its fmt is read past them", () => {
  const pcm = cue(5, 20);
  const plain = writeWav(pcm);
  expect(readWav(plain)).toEqual(pcm);

  /* As `say` writes it: a JUNK chunk of odd size, padded, before fmt. */
  const junk = Buffer.alloc(8 + 7 + 1);
  junk.write("JUNK", 0, "ascii");
  junk.writeUInt32LE(7, 4);
  const padded = Buffer.concat([
    plain.subarray(0, 12),
    junk,
    plain.subarray(12),
  ]);
  padded.writeUInt32LE(padded.length - 8, 4);
  expect(readWav(padded)).toEqual(pcm);

  const stereo = Buffer.from(plain);
  stereo.writeUInt16LE(2, 22);
  expect(() => readWav(stereo)).toThrow("mono 16-bit");

  /* A data chunk cut mid-sample says so, rather than a bare RangeError. */
  const odd = Buffer.concat([plain, Buffer.alloc(1)]);
  odd.writeUInt32LE(pcm.samples.length * 2 + 1, 40);
  expect(() => readWav(odd)).toThrow("not whole samples");
});
