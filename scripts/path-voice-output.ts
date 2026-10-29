/* Where `generate-path-voice.ts` puts what it makes (#150): every clip and
   the manifest land together or not at all. Clips are written to a staging
   directory beside the clips' own, on the same volume so a rename moves
   them, and only once every clip has been made are they renamed into
   place, the clips no manifest lists removed, and the manifest renamed in
   last. A failure part-way leaves the shipped clips and manifest as they
   were. Its own module so a spec can drive it with a fake synthesiser. */

import {
  mkdir,
  mkdtemp,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import type { VoiceManifest } from "../src/app/path/voice-manifest";

export type VoiceClipJob = {
  slug: keyof VoiceManifest["clips"];
  script: string;
};

export type Synthesise = (
  script: string,
) => Promise<{ bytes: Buffer; extension: string }>;

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
  onClip?: (file: string, bytes: number) => void;
}): Promise<VoiceManifest> {
  await mkdir(outDirectory, { recursive: true });
  const staging = await mkdtemp(
    path.join(path.dirname(outDirectory), ".voice-staging-"),
  );
  const written: VoiceManifest = { ...manifest, clips: {} };
  try {
    for (const job of jobs) {
      const { bytes, extension } = await synthesise(job.script);
      const file = `${job.slug}.${extension}`;
      await writeFile(path.join(staging, file), bytes);
      written.clips[job.slug] = {
        src: `/${urlDirectory}/${file}`,
        script: job.script,
        bytes: bytes.byteLength,
      };
      onClip?.(file, bytes.byteLength);
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
       step that lost its scene — would ship with nothing pointing at it. */
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
