import { expect, test } from "@playwright/test";

import { PATH_SIDE_PROPS, PATH_STEPS } from "@/data/path";
import { RESUME_DATA } from "@/data/resume-data";

/* The content rules of the path (GH-141, decisions 2, 3, 9 and 10), checked on
   the data module every surface of the path reads from. */

/** Every string a visitor reads or hears: dates, slugs and hrefs left out,
 *  because they are dates and addresses, not claims. */
function prose(): { where: string; value: string }[] {
  const steps = PATH_STEPS.flatMap((step) => [
    ...step.lines.map((value) => ({ where: `${step.slug} line`, value })),
    { where: `${step.slug} text`, value: step.text },
    { where: `${step.slug} voice script`, value: step.voiceScript },
    { where: `${step.slug} place`, value: step.place },
    ...step.roles.flatMap((role) =>
      [role.title, role.organisation, role.location].map((value) => ({
        where: `${step.slug} role`,
        value,
      })),
    ),
    ...step.links.map((link) => ({
      where: `${step.slug} link`,
      value: link.label,
    })),
    ...step.props.map((prop) => ({
      where: `${step.slug} prop`,
      value: prop.name,
    })),
    { where: `${step.slug} illustration`, value: step.illustration.label },
    ...step.illustration.inspirations.map((value) => ({
      where: `${step.slug} inspiration`,
      value,
    })),
  ]);
  const sideProps = PATH_SIDE_PROPS.flatMap((prop) =>
    [prop.title, prop.text, prop.link.label, ...prop.lines].map((value) => ({
      where: `side prop ${prop.slug}`,
      value,
    })),
  );
  return [...steps, ...sideProps];
}

test.describe("the path's steps", () => {
  test("are the seven of Decision 2, in time order", () => {
    expect(
      PATH_STEPS.map(({ place, period }) =>
        period ? `${place} · ${period}` : place,
      ),
    ).toEqual([
      "Cuneo",
      "Turin · 2017–20",
      "Switzerland · 2020–22",
      "Cuneo · 2022–23",
      "Lille · 2023–24",
      "Cuneo · 2024–now",
      "?",
    ]);
  });

  test("each have a fragment slug of their own", () => {
    const slugs = PATH_STEPS.map((step) => step.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  test("home's three steps share one scene and build it up in order", () => {
    const home = PATH_STEPS.filter((step) => step.place === "Cuneo");

    expect(home.map((step) => step.sceneId)).toEqual(["home", "home", "home"]);
    expect(home.map((step) => step.homeStage)).toEqual([1, 2, 3]);
    expect(
      PATH_STEPS.filter((step) => step.place !== "Cuneo").map(
        (step) => step.homeStage,
      ),
    ).toEqual([undefined, undefined, undefined, undefined]);
  });

  test("have a voice script equal to their text", () => {
    for (const step of PATH_STEPS) {
      expect(step.text, step.slug).toBe(step.lines.join(" "));
      expect(step.voiceScript, step.slug).toBe(step.text);
    }
  });

  test("caption each prop with one of the step's own lines", () => {
    for (const step of PATH_STEPS) {
      expect(step.props.length, step.slug).toBeGreaterThan(0);
      for (const prop of step.props) {
        expect(step.lines[prop.captionLine], `${step.slug}/${prop.id}`).toEqual(
          expect.any(String),
        );
      }
    }
  });

  test("label every blend as an illustration and name its inspirations", () => {
    for (const step of PATH_STEPS) {
      expect(step.illustration.label, step.slug).toMatch(/^Illustration: \S/);
      expect(step.illustration.inspirations.length, step.slug).toBeGreaterThan(
        0,
      );
    }
  });

  test("take their sentences from the resume data, not a copy", () => {
    const work = RESUME_DATA.work.flatMap((entry) => entry.description);
    const projects = RESUME_DATA.projects.map((entry) => entry.description);
    const degrees = RESUME_DATA.education.map(
      (entry) => `${entry.degree}, ${entry.school}.`,
    );
    const sources = [RESUME_DATA.homeOrigin, ...work, ...projects, ...degrees];

    for (const step of PATH_STEPS.filter((step) => step.place !== "?")) {
      for (const line of step.lines) {
        expect(sources, `${step.slug}: ${line}`).toContain(line);
      }
    }
  });

  test("name Saint-Amand-les-Eaux as near Lille", () => {
    const lille = PATH_STEPS.find((step) => step.place === "Lille");

    expect(lille?.roles.map((role) => role.location)).toEqual([
      "Saint-Amand-les-Eaux (near Lille)",
    ]);
  });
});

test.describe("the path's side props", () => {
  test("are Quadrell and the Ghigliottina oracle", () => {
    expect(PATH_SIDE_PROPS.map((prop) => prop.title)).toEqual([
      "Quadrell",
      "L'Oracolo della Ghigliottina",
    ]);
  });

  test("carry no dates", () => {
    for (const prop of PATH_SIDE_PROPS) {
      expect(Object.keys(prop), prop.slug).not.toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^(period|start|end|dates?)$/),
        ]),
      );
      expect(JSON.stringify(prop), prop.slug).not.toMatch(/\b(19|20)\d{2}\b/);
    }
  });

  test("have slugs that no step uses", () => {
    const steps = new Set(PATH_STEPS.map((step) => step.slug));

    for (const prop of PATH_SIDE_PROPS)
      expect(steps.has(prop.slug)).toBe(false);
  });
});

test.describe("the path's numbers", () => {
  /* Decision 10's four, in the CV's own wording: the startup bullet says "two
     other developers", and the oracle's clue count reads "five clues". */
  const allowed = [
    /10,000 m³ a year/g,
    /20% faster than manual tuning/g,
    /\btwo (other )?developers\b/g,
    /\bfive clues\b/g,
  ];
  /* Cardinals only. Ordinals ("the company's first product") are not counts. */
  const numberWords =
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|hundred|thousand|million|billion|dozen|percent)\b/i;

  test("are only the four Decision 10 allows", () => {
    const strays = prose()
      .map(({ where, value }) => ({
        where,
        rest: allowed.reduce((text, phrase) => text.replace(phrase, ""), value),
      }))
      .filter(({ rest }) => /\p{N}/u.test(rest) || numberWords.test(rest));

    expect(strays).toEqual([]);
  });

  test("put 10,000 m³ a year only beside the word projected", () => {
    const water = prose().filter(({ value }) => /10,000|m³/.test(value));

    expect(water.length).toBeGreaterThan(0);
    for (const { where, value } of water) {
      expect(value, where).toMatch(/projected/);
    }
  });
});
