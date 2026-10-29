/* The voice on `/path` (#150). The contract is #141 — decision 9 (optional,
   off by default, Listen or a remembered Voice switch, the step's text word
   for word, labelled synthetic), decision 13 (a refresh never starts a voice)
   and implementation decision 9 (pre-generated clips) — with storyboard §7.6
   of docs/research/experience-rethink.md: a blocked play falls back to Play,
   pause and stop are always there, and a clip loads only when first played.
   The browser is launched with `--mute-audio` (playwright.config.ts). `/`
   requesting no audio is `tests/flat-site.spec.ts`'s "/ loads no 3D code and
   plays no sound". */

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  VOICE_STORAGE_KEY,
  type VoiceManifest,
} from "@/app/path/voice-manifest";
import { PATH_STEPS } from "@/data/path";
import type { PathStepSlug } from "@/data/path.types";

const manifest = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "public/path/voice/manifest.json"),
    "utf8",
  ),
) as VoiceManifest;

const stepNamed = (slug: PathStepSlug) =>
  PATH_STEPS.find((step) => step.slug === slug)!;

/* The prototype's steps (#150): home's three, steps 1, 4 and 6, and Lille. */
const PROTOTYPE_STEPS: readonly PathStepSlug[] = [
  "home",
  "cuneo-2022",
  "lille",
  "now",
];

const voice = (page: Page) => page.locator("[data-path-voice]");
const primary = (page: Page) => page.locator("[data-path-voice-primary]");
const stopButton = (page: Page) => page.locator("[data-path-voice-stop]");
const voiceSwitch = (page: Page) => page.getByRole("switch", { name: "Voice" });
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

async function audioState(page: Page) {
  return page
    .locator("[data-path-voice-audio]")
    .evaluate((audio: HTMLAudioElement) => ({
      paused: audio.paused,
      currentTime: audio.currentTime,
      src: audio.src ? new URL(audio.src).pathname : "",
    }));
}

test.describe("the clips", () => {
  test("cover the prototype's steps, each reading its step's text word for word", () => {
    expect(Object.keys(manifest.clips).sort()).toEqual(
      [...PROTOTYPE_STEPS].sort(),
    );
    for (const slug of PROTOTYPE_STEPS) {
      const clip = manifest.clips[slug]!;
      expect(clip.script, slug).toBe(stepNamed(slug).text);
      expect(clip.script, slug).toBe(stepNamed(slug).voiceScript);
      const file = path.join(process.cwd(), "public", clip.src);
      expect(existsSync(file), clip.src).toBe(true);
      expect(statSync(file).size, clip.src).toBe(clip.bytes);
    }
  });
});

test.describe("/path's voice", () => {
  test("is labelled a synthetic voice and is off by default", async ({
    page,
  }) => {
    await page.goto("/path#lille");
    await hydrated(page);
    await expect(page.locator("[data-path-voice-label]")).toContainText(
      "synthetic voice",
    );
    await expect(voiceSwitch(page)).toHaveAttribute("aria-checked", "false");
    await expect(primary(page)).toHaveText("Listen");
  });

  /* Decision 13: a refresh or a shared link never starts a voice, whatever
     the remembered switch says. */
  test("requests no audio on load or refresh, even with the switch on", async ({
    page,
  }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, "on");
    }, VOICE_STORAGE_KEY);
    const requested = audioRequests(page);

    await page.goto("/path#lille", { waitUntil: "networkidle" });
    await hydrated(page);
    await expect(voiceSwitch(page)).toHaveAttribute("aria-checked", "true");
    await page.reload({ waitUntil: "networkidle" });
    await hydrated(page);

    await expect(voice(page)).toHaveAttribute("data-voice-state", "idle");
    expect(requested).toEqual([]);
    expect((await audioState(page)).src).toBe("");
  });

  /* #141's testing decision for fragments: goto, Back, Forward and reload
     request no audio. Off by default, so Back and Forward play nothing; with
     the switch on they are selections like any other. */
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

    await expect(voice(page)).toHaveAttribute("data-voice-state", "idle");
    expect(requested).toEqual([]);
  });

  test("Listen loads and plays the selected step's clip; Pause, Resume and Stop work", async ({
    page,
  }) => {
    const requested = audioRequests(page);
    await page.goto("/path#lille");
    await hydrated(page);
    await expect(stopButton(page)).toBeDisabled();

    await primary(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");
    expect(requested).toContain(manifest.clips.lille!.src);
    expect(requested.every((url) => url === manifest.clips.lille!.src)).toBe(
      true,
    );
    expect((await audioState(page)).paused).toBe(false);

    await primary(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "paused");
    await expect(primary(page)).toHaveText("Resume");
    expect((await audioState(page)).paused).toBe(true);

    await primary(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");

    await stopButton(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "idle");
    await expect(primary(page)).toHaveText("Listen");
    const stopped = await audioState(page);
    expect(stopped.paused).toBe(true);
    expect(stopped.currentTime).toBe(0);
  });

  test("Stop works from paused too", async ({ page }) => {
    await page.goto("/path#lille");
    await hydrated(page);
    await primary(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");
    await primary(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "paused");

    await stopButton(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "idle");
    expect((await audioState(page)).currentTime).toBe(0);
  });

  test("selecting another step stops the clip when the switch is off", async ({
    page,
  }) => {
    const requested = audioRequests(page);
    await page.goto("/path#lille");
    await hydrated(page);
    await primary(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");

    await stepLink(page, "home").click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "idle");
    expect((await audioState(page)).paused).toBe(true);
    expect(requested).not.toContain(manifest.clips.home!.src);
  });

  test("the Voice switch is remembered and plays each later selection's clip", async ({
    page,
  }) => {
    const requested = audioRequests(page);
    await page.goto("/path#lille");
    await hydrated(page);
    await voiceSwitch(page).click();
    await expect(voiceSwitch(page)).toHaveAttribute("aria-checked", "true");
    /* Turning it on plays nothing: it is for the selections after it. */
    await expect(voice(page)).toHaveAttribute("data-voice-state", "idle");
    expect(requested).toEqual([]);

    await stepLink(page, "home").click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");
    expect((await audioState(page)).src).toBe(manifest.clips.home!.src);

    /* A step with no clip stops the last one and starts nothing. */
    await stepLink(page, "turin").click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "idle");
    expect((await audioState(page)).paused).toBe(true);
    await expect(primary(page)).toBeDisabled();

    await page.reload();
    await hydrated(page);
    await expect(voiceSwitch(page)).toHaveAttribute("aria-checked", "true");

    await voiceSwitch(page).click();
    await expect(voiceSwitch(page)).toHaveAttribute("aria-checked", "false");
    await stepLink(page, "lille").click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "idle");
    expect(requested).not.toContain(manifest.clips.lille!.src);
  });

  test("a blocked play shows a Play button that plays the clip", async ({
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

    await primary(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "blocked");
    await expect(primary(page)).toHaveText("Play");
    await expect(page.locator("[data-path-voice-message]")).not.toBeEmpty();

    await primary(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");
  });

  test("with the switch on, the next selection's clip replaces the playing one, and Back is a selection", async ({
    page,
  }) => {
    await page.goto("/path#lille");
    await hydrated(page);
    await voiceSwitch(page).click();
    await primary(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");

    await stepLink(page, "home").click();
    await expect
      .poll(async () => (await audioState(page)).src)
      .toBe(manifest.clips.home!.src);
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");

    await page.goBack();
    await expect
      .poll(async () => (await audioState(page)).src)
      .toBe(manifest.clips.lille!.src);
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");
  });

  test("Stop cancels a clip still loading", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(`**${manifest.clips.lille!.src}`, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto("/path#lille");
    await hydrated(page);

    await primary(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "loading");
    await expect(stopButton(page)).toBeEnabled();
    await stopButton(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "idle");

    release();
    await page.waitForTimeout(500);
    await expect(voice(page)).toHaveAttribute("data-voice-state", "idle");
    expect((await audioState(page)).paused).toBe(true);
  });

  test("a clip that failed to load is fetched again on the next Listen", async ({
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

    await primary(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "failed");
    await expect(page.locator("[data-path-voice-message]")).not.toBeEmpty();

    await primary(page).click();
    await expect(voice(page)).toHaveAttribute("data-voice-state", "playing");
    expect(requests).toBeGreaterThan(1);
  });
});
