/* The narration's data (v3): a script for every step, cues about props the
   step names, and timings that run forward inside the clip. The four-numbers
   rule and "projected" beside the water figure are checked with every other
   string a visitor reads or hears, in `tests/path-steps.spec.ts`'s
   "the path's numbers", which takes in the narration's cues. Whether the
   clips say the cues as the data has them now is `path-voice.spec.ts`'s. */

import { expect, test } from "@playwright/test";

import {
  cueIndexAt,
  cueProgress,
  narrationFor,
  timeNarration,
  type TimedCue,
} from "@/app/path/narration";
import { PATH_STEPS } from "@/data/path";
import { PATH_NARRATION } from "@/data/path-narration";

test("every step has a script, and the narration names no other step", () => {
  expect(Object.keys(PATH_NARRATION).sort()).toEqual(
    PATH_STEPS.map((step) => step.slug).sort(),
  );
  for (const step of PATH_STEPS) {
    expect(PATH_NARRATION[step.slug].length, step.slug).toBeGreaterThan(1);
  }
});

test("every cue is a short spoken sentence, and every prop it names is one of its step's", () => {
  for (const step of PATH_STEPS) {
    const props = new Set(step.props.map((prop) => prop.id));
    for (const cue of PATH_NARRATION[step.slug]) {
      expect(cue.text, step.slug).toMatch(/^\S.*[.?!]$/);
      /* One caption line: two lines at the narrowest wide layout. */
      expect(cue.text.length, cue.text).toBeLessThanOrEqual(95);
      if (cue.prop !== undefined) {
        expect(props.has(cue.prop), `${step.slug}: ${cue.prop}`).toBe(true);
      }
    }
    /* The board has something to move in every step. */
    expect(
      PATH_NARRATION[step.slug].some((cue) => cue.prop !== undefined),
      step.slug,
    ).toBe(true);
  }
});

test("the cue timings run forward, without overlap, inside the clip", () => {
  for (const step of PATH_STEPS) {
    const { cues, durationMs } = narrationFor(step.slug);
    expect(cues.map((cue) => cue.text)).toEqual(
      PATH_NARRATION[step.slug].map((cue) => cue.text),
    );
    expect(cues[0].startMs, step.slug).toBeGreaterThanOrEqual(0);
    for (const [index, cue] of cues.entries()) {
      expect(cue.endMs, `${step.slug} ${index}`).toBeGreaterThan(cue.startMs);
      if (index > 0) {
        expect(cue.startMs, `${step.slug} ${index}`).toBeGreaterThanOrEqual(
          cues[index - 1].endMs,
        );
      }
    }
    expect(cues[cues.length - 1].endMs, step.slug).toBeLessThanOrEqual(
      durationMs,
    );
  }
});

test("every step's narration runs about 15–30 s", () => {
  for (const step of PATH_STEPS) {
    const { durationMs } = narrationFor(step.slug);
    expect(durationMs, step.slug).toBeGreaterThanOrEqual(15_000);
    expect(durationMs, step.slug).toBeLessThanOrEqual(30_000);
  }
});

test("a clip that says other words is not played, and the cues are timed without it", () => {
  const script = [{ text: "One cue here." }, { text: "And the next." }];
  const clip = {
    src: "/path/voice/home.m4a",
    bytes: 1,
    durationMs: 4000,
    cues: [
      { text: "One cue here.", startMs: 0, endMs: 1500 },
      { text: "And the last.", startMs: 2000, endMs: 3500 },
    ],
  };

  const stale = timeNarration(script, clip);
  expect(stale.clip.src).toBeUndefined();
  expect(stale.cues[1].startMs).toBeGreaterThan(stale.cues[0].endMs);
  expect(stale.durationMs).toBe(stale.cues[1].endMs);
  expect(timeNarration(script, undefined)).toEqual(stale);

  const matching = timeNarration(script, {
    ...clip,
    cues: [clip.cues[0], { ...clip.cues[1], text: "And the next." }],
  });
  expect(matching.clip.src).toBe(clip.src);
  expect(matching.cues.map(({ startMs, endMs }) => [startMs, endMs])).toEqual([
    [0, 1500],
    [2000, 3500],
  ]);
  expect(matching.durationMs).toBe(4000);
});

test("the cue playing is the last started, and holds through the pause after it", () => {
  const cues: TimedCue[] = [
    { text: "A.", startMs: 0, endMs: 1000 },
    { text: "B.", startMs: 1400, endMs: 2000 },
    { text: "C.", startMs: 2400, endMs: 3000 },
  ];
  expect(cueIndexAt(cues, 0)).toBe(0);
  expect(cueIndexAt(cues, 1200)).toBe(0);
  expect(cueIndexAt(cues, 1400)).toBe(1);
  expect(cueIndexAt(cues, 2399)).toBe(1);
  expect(cueIndexAt(cues, 2400)).toBe(2);
  expect(cueIndexAt(cues, 99_999)).toBe(2);

  expect(cueProgress(cues[1], 1000)).toBe(0);
  expect(cueProgress(cues[1], 1700)).toBe(0.5);
  /* Full through the pause after its speech. */
  expect(cueProgress(cues[1], 2200)).toBe(1);
});
