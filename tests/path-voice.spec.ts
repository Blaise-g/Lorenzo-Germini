/* The narration on `/path` (#150; v3): the voice and the caption line. The
   contract is #141 — decision 9 (optional, off by default, a remembered
   Voice switch, labelled synthetic), decision 13 (a refresh never starts a
   voice) and implementation decision 9 (pre-generated clips) — and the v3
   ticket: every step narrated, the tour's clock leading and the voice
   following it, the voice joining at the current step on the first press,
   a pause pausing both, and captions on by default whenever the voice cannot
   be heard. The browser is launched with `--mute-audio`
   (playwright.config.ts). `/` requesting no audio is
   `tests/flat-site.spec.ts`'s "/ loads no 3D code and plays no sound". */

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { narrationFor } from "@/app/path/narration";
import {
  CAPTIONS_STORAGE_KEY,
  VOICE_STORAGE_KEY,
  type VoiceManifest,
} from "@/app/path/voice-manifest";
import { PATH_STEPS } from "@/data/path";
import { PATH_NARRATION } from "@/data/path-narration";
import type { PathStepSlug } from "@/data/path.types";

const manifest = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "public/path/voice/manifest.json"),
    "utf8",
  ),
) as VoiceManifest;

const voice = (page: Page) => page.locator("[data-path-voice]");
const caption = (page: Page) => page.locator("[data-path-caption]");
const message = (page: Page) => page.locator("[data-path-voice-message]");
const voiceSwitch = (page: Page) => page.getByRole("switch", { name: "Voice" });
const captionsSwitch = (page: Page) =>
  page.getByRole("switch", { name: "Captions" });
const playTab = (page: Page) => page.locator("[data-path-tour-play]");
const stepLink = (page: Page, slug: PathStepSlug) =>
  page.locator(`[data-path-step-link="${slug}"]`);

/** Every audio request the page makes, by URL. */
function audioRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (
      request.resourceType() === "media" ||
      /\.(mp3|m4a|aac|ogg|opus|wav)(\?|$)/i.test(new URL(url).pathname)
    ) {
      urls.push(new URL(url).pathname);
    }
  });
  return urls;
}

/** The piece mounts on hydration, so waiting for it waits for the handlers. */
async function hydrated(page: Page) {
  await expect(page.locator("[data-path-piece]")).toHaveCount(1);
}

/** The narration is playing its step: settled, dwelling, the tour running. */
async function narrating(page: Page) {
  await expect(page.locator("[data-path-narration]")).toHaveAttribute(
    "data-path-cue-running",
    "",
  );
}

async function audioState(page: Page) {
  return page
    .locator("[data-path-voice-audio]")
    .evaluate((audio: HTMLAudioElement) => ({
      paused: audio.paused,
      currentTime: audio.currentTime,
      src: audio.src ? new URL(audio.src).pathname : "",
    }));
}

function remember(page: Page, key: string, value: string) {
  return page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [key, value] as const,
  );
}

test.describe("the clips", () => {
  test("narrate every step, each saying its cues as the data has them now", () => {
    expect(Object.keys(manifest.clips).sort()).toEqual(
      PATH_STEPS.map((step) => step.slug).sort(),
    );
    for (const step of PATH_STEPS) {
      const clip = manifest.clips[step.slug]!;
      /* A cue reworded since the clip was made fails here until
         `bun run generate:path-voice` is run again. */
      expect(
        clip.cues.map((cue) => cue.text),
        step.slug,
      ).toEqual(PATH_NARRATION[step.slug].map((cue) => cue.text));
      const file = path.join(process.cwd(), "public", clip.src);
      expect(existsSync(file), clip.src).toBe(true);
      expect(statSync(file).size, clip.src).toBe(clip.bytes);
      /* About 15–30 s a step (v3). */
      expect(clip.durationMs, step.slug).toBeGreaterThan(14_000);
      expect(clip.durationMs, step.slug).toBeLessThan(31_000);
      /* What the page plays is this clip, timed by it. */
      expect(narrationFor(step.slug).clip.src, step.slug).toBe(clip.src);
      expect(narrationFor(step.slug).durationMs, step.slug).toBe(
        clip.durationMs,
      );
    }
  });
});

test.describe("/path's voice", () => {
  test("is labelled a synthetic voice and is off by default, with captions on", async ({
    page,
  }) => {
    await page.goto("/path#lille");
    await hydrated(page);
    await expect(page.locator("[data-path-voice-label]")).toHaveText(
      `Narration: synthetic voice, ${manifest.providerName}.`,
    );
    await expect(voiceSwitch(page)).toHaveAttribute("aria-checked", "false");
    await expect(voice(page)).toHaveAttribute("data-voice-state", "off");
    await expect(captionsSwitch(page)).toHaveAttribute("aria-checked", "true");
    /* Under reduced motion the tour waits, and the caption shows the step's
       first cue. */
    await expect(caption(page)).toHaveText(narrationFor("lille").cues[0].text);
  });

  /* #141's testing decision for fragments: goto, Back, Forward and reload
     request no audio. */
  test("requests no audio across fragments, Back, Forward and reload", async ({
    page,
  }) => {
    const requested = audioRequests(page);

    await page.goto("/path#lille", { waitUntil: "networkidle" });
    await hydrated(page);
    await page.goto("/path#home", { waitUntil: "networkidle" });
    await page.goBack({ waitUntil: "networkidle" });
    await page.goForward({ waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    await hydrated(page);

    await expect(voice(page)).toHaveAttribute("data-voice-state", "off");
    expect(requested).toEqual([]);
  });
});

/* The tour plays, so the narration runs. WebGL is refused, so the stage
   shows its stills and settles each step at once. Real time: the audio
   element keeps its own. */
test.describe("with the tour playing", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
    });
  });

  /* Decision 13: a refresh or a shared link never starts a voice, whatever
     the remembered switch says. Until a press the tour runs on captions. */
  test("a remembered voice requests no audio on load or refresh, and the captions stand in", async ({
    page,
  }) => {
    await remember(page, VOICE_STORAGE_KEY, "on");
    const requested = audioRequests(page);

    await page.goto("/path#lille", { waitUntil: "networkidle" });
    await hydrated(page);
    await narrating(page);
    await expect(voiceSwitch(page)).toHaveAttribute("aria-checked", "true");
    await page.reload({ waitUntil: "networkidle" });
    await hydrated(page);
    await narrating(page);

    await expect(voice(page)).toHaveAttribute("data-voice-state", "waiting");
    await expect(message(page)).not.toBeEmpty();
    await expect(captionsSwitch(page)).toHaveAttribute("aria-checked", "true");
    await expect(caption(page)).not.toBeEmpty();
    expect(requested).toEqual([]);
    expect((await audioState(page)).src).toBe("");
  });

  test("the first press lets the voice join at the current step, where the tour is", async ({
    page,
  }) => {
    await remember(page, VOICE_STORAGE_KEY, "on");
    const requested = audioRequests(page);
    await page.goto("/path#lille");
    await hydrated(page);
    await narrating(page);
    await page.waitForTimeout(1500);

    /* Pause, then Play: the press, and the tour carries on from where it
       stopped, the voice with it. */
    await playTab(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "paused");
    expect(requested).toEqual([]);
    await playTab(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");
    expect(requested).toEqual([manifest.clips.lille!.src]);
    const joined = await audioState(page);
    expect(joined.src).toBe(manifest.clips.lille!.src);
    expect(joined.currentTime).toBeGreaterThan(1);
    /* Heard now, so the captions step aside unless asked for. */
    await expect(captionsSwitch(page)).toHaveAttribute("aria-checked", "false");
    await expect(caption(page)).toBeEmpty();
  });

  test("a first press held down on Pause starts no voice before it lands", async ({
    page,
  }) => {
    await remember(page, VOICE_STORAGE_KEY, "on");
    const requested = audioRequests(page);
    await page.goto("/path#lille");
    await hydrated(page);
    await narrating(page);

    /* A finger or a mouse: the button goes down well before the click. */
    const box = (await playTab(page).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(300);
    expect(requested).toEqual([]);
    await page.mouse.up();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "paused");
    await page.waitForTimeout(300);
    expect(requested).toEqual([]);
  });

  test("a modifier key or Escape alone, which the browser does not count, lets no voice in", async ({
    page,
  }) => {
    await remember(page, VOICE_STORAGE_KEY, "on");
    const requested = audioRequests(page);
    await page.goto("/path#lille");
    await hydrated(page);
    await narrating(page);

    await page.keyboard.press("Shift");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(voice(page)).toHaveAttribute("data-voice-state", "waiting");
    expect(requested).toEqual([]);
  });

  test("pausing the tour pauses the voice, and playing resumes both together", async ({
    page,
  }) => {
    await page.goto("/path#lille");
    await hydrated(page);
    await narrating(page);
    await voiceSwitch(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");

    await playTab(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "paused");
    const paused = await audioState(page);
    expect(paused.paused).toBe(true);
    await page.waitForTimeout(1000);
    expect((await audioState(page)).currentTime).toBe(paused.currentTime);

    await playTab(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");
    const resumed = await audioState(page);
    /* From where the tour is, which a pause did not move. */
    expect(Math.abs(resumed.currentTime - paused.currentTime)).toBeLessThan(
      0.5,
    );
  });

  test("turning the voice on mid-step joins there, and off stops it", async ({
    page,
  }) => {
    await page.goto("/path#lille");
    await hydrated(page);
    await narrating(page);
    await page.waitForTimeout(2000);

    await voiceSwitch(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");
    expect((await audioState(page)).currentTime).toBeGreaterThan(1.5);

    await voiceSwitch(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "off");
    expect((await audioState(page)).paused).toBe(true);
    /* Remembered across a reload. */
    await page.reload();
    await hydrated(page);
    await expect(voiceSwitch(page)).toHaveAttribute("aria-checked", "false");
  });

  test("a new step stops the clip, and its own plays once the step settles", async ({
    page,
  }) => {
    await page.goto("/path#lille");
    await hydrated(page);
    await narrating(page);
    await voiceSwitch(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");

    await stepLink(page, "now").click();
    await expect
      .poll(async () => (await audioState(page)).src)
      .toBe(manifest.clips.now!.src);
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");
    /* From the start of its narration. */
    expect((await audioState(page)).currentTime).toBeLessThan(1);

    await page.goBack();
    await expect
      .poll(async () => (await audioState(page)).src)
      .toBe(manifest.clips.lille!.src);
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");
  });

  test("a play the browser holds back falls back to captions until the next press", async ({
    page,
  }) => {
    /* The browser refuses the first play, as autoplay policy can. */
    await page.addInitScript(() => {
      const play = HTMLMediaElement.prototype.play;
      let refused = false;
      HTMLMediaElement.prototype.play = function () {
        if (refused) return play.call(this);
        refused = true;
        return Promise.reject(new DOMException("held", "NotAllowedError"));
      };
    });
    await page.goto("/path#lille");
    await hydrated(page);
    await narrating(page);

    await voiceSwitch(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "blocked");
    await expect(message(page)).not.toBeEmpty();
    await expect(caption(page)).not.toBeEmpty();

    await caption(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");
    await expect(message(page)).toBeEmpty();
  });

  test("a clip that failed to load is fetched again on the next press", async ({
    page,
  }) => {
    let requests = 0;
    await page.route(`**${manifest.clips.lille!.src}`, async (route) => {
      requests += 1;
      if (requests === 1) await route.fulfill({ status: 404 });
      else await route.continue();
    });
    await page.goto("/path#lille");
    await hydrated(page);
    await narrating(page);

    await voiceSwitch(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "blocked");
    await expect(caption(page)).not.toBeEmpty();

    await caption(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");
    expect(requests).toBeGreaterThan(1);
  });
});

test.describe("the captions", () => {
  test("turned off, the line is empty and its space held; the choice is remembered", async ({
    page,
  }) => {
    await page.goto("/path#lille");
    await hydrated(page);
    await expect(caption(page)).not.toBeEmpty();
    const height = (await caption(page).boundingBox())!.height;

    await captionsSwitch(page).click();
    await expect(captionsSwitch(page)).toHaveAttribute("aria-checked", "false");
    await expect(caption(page)).toBeEmpty();
    expect((await caption(page).boundingBox())!.height).toBe(height);

    await page.reload();
    await hydrated(page);
    await expect(captionsSwitch(page)).toHaveAttribute("aria-checked", "false");
    await expect(caption(page)).toBeEmpty();
  });

  test("a remembered choice to show them holds with the voice on", async ({
    page,
  }) => {
    await remember(page, CAPTIONS_STORAGE_KEY, "on");
    await remember(page, VOICE_STORAGE_KEY, "on");
    await page.goto("/path#lille");
    await hydrated(page);
    /* The press that lets the voice be heard. */
    await caption(page).click();
    await expect(captionsSwitch(page)).toHaveAttribute("aria-checked", "true");
    await expect(caption(page)).toHaveText(narrationFor("lille").cues[0].text);
  });
});
