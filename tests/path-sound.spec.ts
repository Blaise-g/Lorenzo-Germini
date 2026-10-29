/* The board's sound on `/path` (v3; the benchmark's §4(e)): a Sound switch
   beside Voice, off by default, before which nothing about sound exists on
   the page; the six effects and the bed, all made in code, checked by
   rendering them on an `OfflineAudioContext` and measuring the result,
   never by playing them aloud (the browser is muted besides); and the bed
   ducking 9 dB under the voice. */

import { expect, test, type Page } from "@playwright/test";

import {
  BED_LEVEL,
  BED_SECONDS,
  dbToGain,
  DUCK_DB,
  DUCK_SECONDS,
  HOP_PITCH_SPREAD,
  hopRate,
  SOUND_SECONDS,
  type SoundName,
} from "@/app/path/sound-engine";

test.use({ launchOptions: { args: ["--mute-audio"] } });

const soundSwitch = (page: Page) => page.locator("[data-path-sound-switch]");

/** Counts every `AudioContext` the page makes. */
async function countContexts(page: Page) {
  await page.addInitScript(() => {
    const counts = { made: 0 };
    (window as unknown as { __contexts: typeof counts }).__contexts = counts;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        counts.made += 1;
      }
    };
  });
}

const contexts = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __contexts: { made: number } }).__contexts.made,
  );

test.describe("the numbers", () => {
  test("the bed ducks 9 dB in 150 ms, and loops every 20 s", () => {
    expect(DUCK_DB).toBe(-9);
    expect(dbToGain(DUCK_DB)).toBeCloseTo(0.3548, 3);
    expect(DUCK_SECONDS).toBe(0.15);
    expect(BED_SECONDS).toBe(20);
  });

  test("a hop's pitch varies within ±3%", () => {
    expect(HOP_PITCH_SPREAD).toBe(0.03);
    expect(hopRate(0)).toBeCloseTo(0.97, 6);
    expect(hopRate(0.5)).toBe(1);
    expect(hopRate(0.999999)).toBeCloseTo(1.03, 4);
    for (let i = 0; i < 100; i++) {
      const rate = hopRate(Math.random());
      expect(Math.abs(rate - 1)).toBeLessThanOrEqual(0.03);
    }
  });
});

test.describe("the switch", () => {
  test("is off by default, and nothing sounds or downloads before it is on", async ({
    page,
  }) => {
    await countContexts(page);
    const fetched: string[] = [];
    page.on("request", (request) => {
      const type = request.resourceType();
      if (
        type === "media" ||
        /\.(webm|opus|ogg|m4a|aac|mp3|wav)(\?|$)/.test(request.url()) ||
        /\/path\/sound\//.test(request.url())
      ) {
        fetched.push(request.url());
      }
    });
    await page.goto("/path#home");
    await expect(soundSwitch(page)).toHaveAttribute("aria-checked", "false");
    await expect(soundSwitch(page)).toHaveText("Sound");
    /* Beside the voice's own switch, which it leaves alone. */
    await expect(
      page.locator("[data-path-voice] [data-path-sound-switch]"),
    ).toHaveCount(1);
    await page.waitForTimeout(1500);
    expect(await contexts(page)).toBe(0);
    expect(fetched).toEqual([]);

    await soundSwitch(page).click();
    await expect(soundSwitch(page)).toHaveAttribute("aria-checked", "true");
    await expect.poll(() => contexts(page)).toBe(1);
    await expect(page.locator("[data-path-voice-switch]")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    /* Made in code: on, it still fetches nothing. */
    await page.waitForTimeout(1000);
    expect(fetched).toEqual([]);

    await soundSwitch(page).click();
    await expect(soundSwitch(page)).toHaveAttribute("aria-checked", "false");
    expect(
      await page.evaluate(() => window.__pathSound?.level() ?? null),
    ).toBeNull();
  });

  /* The bed ducks under anything the voice's element speaks, and comes
     back when it stops. A second silent element stands in for the voice:
     its clip is a second of silence, in a muted browser. */
  test("ducks the bed 9 dB under the voice, and brings it back", async ({
    page,
  }) => {
    await page.goto("/path#home");
    await soundSwitch(page).click();
    const level = () => page.evaluate(() => window.__pathSound!.level());
    /* Timed on the audio clock, which a loaded machine runs slow: the
       waits are generous, the levels exact. */
    await expect.poll(level, { timeout: 20_000 }).toBeCloseTo(BED_LEVEL, 3);

    await page.evaluate(async () => {
      const rate = 8000;
      const samples = rate;
      const bytes = new DataView(new ArrayBuffer(44 + samples * 2));
      const text = (at: number, value: string) =>
        [...value].forEach((c, i) => bytes.setUint8(at + i, c.charCodeAt(0)));
      text(0, "RIFF");
      bytes.setUint32(4, 36 + samples * 2, true);
      text(8, "WAVEfmt ");
      bytes.setUint32(16, 16, true);
      bytes.setUint16(20, 1, true);
      bytes.setUint16(22, 1, true);
      bytes.setUint32(24, rate, true);
      bytes.setUint32(28, rate * 2, true);
      bytes.setUint16(32, 2, true);
      bytes.setUint16(34, 16, true);
      text(36, "data");
      bytes.setUint32(40, samples * 2, true);
      const voice = document.createElement("audio");
      voice.setAttribute("data-path-voice-audio", "");
      voice.loop = true;
      voice.src = URL.createObjectURL(
        new Blob([bytes.buffer], { type: "audio/wav" }),
      );
      voice.id = "stand-in-voice";
      document.body.append(voice);
      await voice.play();
    });
    await expect
      .poll(level, { timeout: 10_000 })
      .toBeCloseTo(BED_LEVEL * dbToGain(DUCK_DB), 3);

    await page.evaluate(() =>
      (document.getElementById("stand-in-voice") as HTMLAudioElement).pause(),
    );
    await expect.poll(level, { timeout: 10_000 }).toBeCloseTo(BED_LEVEL, 3);
  });
});

test.describe("the sounds, rendered offline", () => {
  const NAMES = Object.keys(SOUND_SECONDS) as SoundName[];

  test("each is short, audible, unclipped, and silent by its end", async ({
    page,
  }) => {
    await page.goto("/path#home");
    await page.waitForFunction(() => !!window.__pathSound);
    for (const name of NAMES) {
      const render = await page.evaluate(
        (each) => window.__pathSound!.render(each),
        name,
      );
      const seconds = SOUND_SECONDS[name];
      expect(render.peak, name).toBeGreaterThan(0.08);
      expect(render.peak, name).toBeLessThan(1);
      expect(render.rms, name).toBeGreaterThan(0.004);
      /* Rings for most of its length, and is done by it. */
      expect(render.audibleUntil, name).toBeGreaterThan(seconds * 0.5);
      expect(render.audibleUntil, name).toBeLessThanOrEqual(seconds + 0.05);
    }
  });

  test("the end chord rings longest, and a hop is the shortest", () => {
    const longest = Math.max(...Object.values(SOUND_SECONDS));
    const shortest = Math.min(...Object.values(SOUND_SECONDS));
    expect(SOUND_SECONDS.end).toBe(longest);
    expect(SOUND_SECONDS.hop).toBe(shortest);
    expect(SOUND_SECONDS.hop).toBeLessThan(0.2);
    expect(SOUND_SECONDS.end).toBeLessThan(3);
  });

  test("the bed is 20 s of quiet wind and birds, and loops without a seam", async ({
    page,
  }) => {
    test.slow();
    await page.goto("/path#home");
    await page.waitForFunction(() => !!window.__pathSound);
    const bed = await page.evaluate(() => window.__pathSound!.bed());
    expect(bed.seconds).toBe(20);
    expect(bed.rms).toBeGreaterThan(0.005);
    expect(bed.peak).toBeLessThan(0.9);
    /* Audible to its last moment: a loop, not a clip with a tail. */
    expect(bed.audibleUntil).toBeGreaterThan(19.9);
    expect(bed.seam).toBeLessThan(0.05);
  });
});
