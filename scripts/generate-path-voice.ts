/* Generates the 3D path's voice clips (#150): one per step with a scene, read
   from the step's `voiceScript`, which is its text word for word (#141,
   decision 9). The clips are static files, made here and checked in; nothing
   is synthesised at runtime, and the browser's `speechSynthesis` is rejected.

   Next to them goes `manifest.json`, which records the script each clip was
   read from. The clip itself is opaque, so the manifest is what
   `tests/path-voice.spec.ts` checks against the step's text: a reworded step
   fails there until its clip is generated again.

   The provider is a parameter, `--provider say|elevenlabs`. Without one it is
   ElevenLabs when `ELEVENLABS_API_KEY` is set, and otherwise macOS `say` with
   a stock system voice, converted to AAC with `afconvert`. Either way the page
   labels the clips "synthetic voice", and never as Lorenzo's.

   Open item for stage 4's voice: Apple's licence allows output from the macOS
   system voices for personal, non-commercial use only. That is acceptable for
   the unmerged prototype; a shipped voice needs another provider. */

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { hasScene } from "../src/components/path/scene/build-plan";
import { PATH_STEPS } from "../src/data/path";
import type { PathStep } from "../src/data/path.types";
import {
  VOICE_DIRECTORY,
  type VoiceManifest,
  type VoiceProvider,
} from "../src/app/path/voice-manifest";

const run = promisify(execFile);

/** A clip is about 60 KB (storyboard §7.6); one well past it is reported. */
const TARGET_BYTES = 60 * 1024;
const WARN_BYTES = 90 * 1024;

const SAY_VOICE = "Samantha";
/* Mono AAC at 24 kbps, about 3 KB a second: the lowest rate at which
   `afconvert` keeps the voice's 22.05 kHz; below it, it resamples to 16 kHz
   or less and the sibilants go. A step with five sentences still runs past
   the target, so those clips are reported rather than squeezed. */
const SAY_BITRATE = 24000;

/* ElevenLabs' stock "Rachel" voice; `ELEVENLABS_VOICE_ID` picks another. */
const ELEVENLABS_VOICE =
  process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

function providerFromArgs(): VoiceProvider {
  const flag = process.argv.find((arg) => arg.startsWith("--provider"));
  const value = flag?.includes("=")
    ? flag.split("=")[1]
    : flag
      ? process.argv[process.argv.indexOf(flag) + 1]
      : undefined;
  if (value === undefined) {
    return process.env.ELEVENLABS_API_KEY ? "elevenlabs" : "say";
  }
  if (value !== "say" && value !== "elevenlabs") {
    throw new Error(`Unknown provider "${value}": use say or elevenlabs`);
  }
  return value;
}

/** Synthesises `script` and returns the clip's bytes and file extension. */
async function synthesise(
  provider: VoiceProvider,
  script: string,
  scratch: string,
): Promise<{ bytes: Buffer; extension: string }> {
  if (provider === "say") {
    const aiff = path.join(scratch, "clip.aiff");
    const m4a = path.join(scratch, "clip.m4a");
    /* The script goes in a file rather than argv, so nothing in it is read as
       a flag. */
    const text = path.join(scratch, "clip.txt");
    await writeFile(text, script);
    await run("say", ["-v", SAY_VOICE, "-f", text, "-o", aiff]);
    await run("afconvert", [
      "-f",
      "m4af",
      "-d",
      "aac",
      "-b",
      String(SAY_BITRATE),
      "-c",
      "1",
      aiff,
      m4a,
    ]);
    return { bytes: await readFile(m4a), extension: "m4a" };
  }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("The elevenlabs provider needs ELEVENLABS_API_KEY");
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE}?output_format=mp3_22050_32`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
      }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `ElevenLabs answered ${response.status}: ${await response.text()}`,
    );
  }
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    extension: "mp3",
  };
}

const PROVIDER_NAMES: Record<VoiceProvider, string> = {
  say: "macOS system voice",
  elevenlabs: "ElevenLabs",
};

const provider = providerFromArgs();
const steps: PathStep[] = PATH_STEPS.filter(hasScene);
const outDirectory = path.join(process.cwd(), "public", VOICE_DIRECTORY);
await mkdir(outDirectory, { recursive: true });
const scratch = await mkdtemp(path.join(tmpdir(), "path-voice-"));

const manifest: VoiceManifest = {
  provider,
  providerName: PROVIDER_NAMES[provider],
  voice: provider === "say" ? SAY_VOICE : ELEVENLABS_VOICE,
  clips: {},
};

for (const step of steps) {
  const { bytes, extension } = await synthesise(
    provider,
    step.voiceScript,
    scratch,
  );
  const file = `${step.slug}.${extension}`;
  await writeFile(path.join(outDirectory, file), bytes);
  const size = (await stat(path.join(outDirectory, file))).size;
  manifest.clips[step.slug] = {
    src: `/${VOICE_DIRECTORY}/${file}`,
    script: step.voiceScript,
    bytes: size,
  };
  const note = size > WARN_BYTES ? " (well past the ~60 KB target)" : "";
  console.log(`${file}: ${(size / 1024).toFixed(1)} KB${note}`);
}

await writeFile(
  path.join(outDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `${steps.length} clips by ${manifest.providerName} (${manifest.voice}); target about ${TARGET_BYTES / 1024} KB each.`,
);
