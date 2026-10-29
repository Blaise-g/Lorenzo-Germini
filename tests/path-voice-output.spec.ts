/* How the voice generator publishes its clips (#150): together with their
   manifest, or not at all. Driven with a fake synthesiser in a scratch
   directory, so no voice is made and nothing under `public/` changes. */

import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  writeVoiceClips,
  type VoiceClipJob,
} from "../scripts/path-voice-output";

const jobs: VoiceClipJob[] = [
  { slug: "home", script: "Home's new script." },
  { slug: "lille", script: "Lille's new script." },
];
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
      synthesise: async (script) => {
        calls += 1;
        if (calls === 2) throw new Error("The provider failed");
        return { bytes: Buffer.from(`new ${script}`), extension: "m4a" };
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
    synthesise: async (script) => ({
      bytes: Buffer.from(`new ${script}`),
      extension: "m4a",
    }),
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
    expect(clip.script).toBe(job.script);
    expect(clip.src).toBe(`/path/voice/${job.slug}.m4a`);
    const bytes = await readFile(path.join(outDirectory, `${job.slug}.m4a`));
    expect(clip.bytes).toBe(bytes.byteLength);
  }
  expect(await readdir(root)).toEqual(["voice"]);
});
