import { RESUME_DATA } from "./resume-data";
import type {
  PathIllustration,
  PathLink,
  PathRole,
  PathSideProp,
  PathStep,
  PathStepBase,
  PathStepScene,
} from "./path.types";

/* The path (GH-141): seven steps in time order and two side props, and the only
   source of their text, captions and voice scripts. Every sentence a step
   shows is a RESUME_DATA field, or a CV bullet picked by its opening words, so
   a reworded bullet fails loudly here instead of leaving a stale copy on the
   path. The exceptions have no CV counterpart and live here: "?"'s line, and
   the scene copy — illustration labels, inspirations, prop names.

   Decision 10's closed list of numbers outranks the wording elsewhere in
   GH-141: home's "two peaks" and "?"'s "five empty clue slots" lose their
   counts here, and so do the CV sentences that carry another number. */

type Work = (typeof RESUME_DATA.work)[number];
type Project = (typeof RESUME_DATA.projects)[number];
type Education = (typeof RESUME_DATA.education)[number];

function job(company: string): Work {
  const entry = RESUME_DATA.work.find((work) => work.company === company);
  if (!entry) throw new Error(`The path needs a work entry for ${company}`);
  return entry;
}

function project(title: string): Project {
  const entry = RESUME_DATA.projects.find((item) => item.title === title);
  if (!entry) throw new Error(`The path needs a project called ${title}`);
  return entry;
}

function degree(school: string): Education {
  const entry = RESUME_DATA.education.find((item) => item.school === school);
  if (!entry)
    throw new Error(`The path needs an education entry for ${school}`);
  return entry;
}

function sentences(text: string): string[] {
  return text.split(/(?<=\.)\s+/);
}

function bullets(work: Work): readonly string[] {
  return typeof work.description === "string"
    ? sentences(work.description)
    : work.description;
}

/** The one sentence of `source` that opens with `opening`. */
function pick(source: readonly string[], opening: string): string {
  const found = source.filter((line) => line.startsWith(opening));
  if (found.length !== 1) {
    throw new Error(
      `The path expected one sentence opening "${opening}", found ${found.length}`,
    );
  }
  return found[0];
}

function workRole(work: Work, location = work.badges[0]): PathRole {
  return {
    title: work.title,
    organisation: work.company,
    location,
    start: work.start,
    end: work.end,
  };
}

function degreeRole(school: string, location: string): PathRole {
  const entry = degree(school);
  return {
    title: entry.degree,
    organisation: entry.school,
    location,
    start: entry.start,
    end: entry.end,
  };
}

function year(date: string): number | "now" {
  if (date === "Present") return "now";
  const match = date.match(/\d{4}$/);
  if (!match) throw new Error(`The path cannot read a year from "${date}"`);
  return Number(match[0]);
}

/** "2017–20" or "2024–now", spanning every role in the step. */
function period(roles: readonly PathRole[]): string {
  const starts = roles.map((role) => year(role.start));
  const ends = roles.map((role) => year(role.end));
  const first = Math.min(...starts.filter((y) => y !== "now"));
  if (ends.includes("now")) return `${first}–now`;
  const last = Math.max(...ends.filter((y) => y !== "now"));
  return last === first ? String(first) : `${first}–${String(last).slice(2)}`;
}

function employer(work: Work): PathLink[] {
  return work.link ? [{ label: work.company, href: work.link }] : [];
}

const inTheCv = {
  experience: { label: "In the CV", href: "/cv#cv-experience" },
  education: { label: "In the CV", href: "/cv#cv-education" },
} satisfies Record<string, PathLink>;

type StepSource = Omit<PathStepBase, "period" | "text" | "voiceScript"> &
  PathStepScene;

function step(source: StepSource): PathStep {
  const text = source.lines.join(" ");
  return {
    ...source,
    ...(source.roles.length > 0 && { period: period(source.roles) }),
    text,
    voiceScript: text,
  };
}

const homeIllustration: PathIllustration = {
  label:
    "Illustration: the Bisalta behind the plateau between Cuneo's rivers, built up a little more on each return. Reading its peaks as the returns home is my own.",
  inspirations: [
    "The Bisalta, the mountain behind Cuneo",
    "Cuneo's wedge-shaped plateau between the Stura and the Gesso",
    "My old high school",
  ],
};

const epfl = "Swiss Federal Institute of Technology Lausanne (EPFL)";
const politecnico = "Polytechnic of Turin";
const roche = job("Roche");
const burgeon = job("Burgeon Labs");
const teaching = job("Self Employed");
const gsk = job("GSK");
if (!gsk.badges[0]?.startsWith("Saint-Amand-les-Eaux")) {
  throw new Error("The Lille step expects GSK in Saint-Amand-les-Eaux");
}
const gskLocation = "Saint-Amand-les-Eaux (near Lille)";
const stealth = job("Stealth GenAI Startup");
const complaion = job("Complaion");
const summariser = project("Biomedical Paper Summarizer");

export const PATH_STEPS: readonly PathStep[] = [
  step({
    slug: "home",
    place: "Cuneo",
    roles: [],
    lines: [RESUME_DATA.homeLine],
    links: [],
    props: [
      { id: "plateau", name: "The plateau between the rivers", captionLine: 0 },
      { id: "bisalta", name: "The Bisalta", captionLine: 0 },
      { id: "school", name: "The high school", captionLine: 0 },
    ],
    illustration: homeIllustration,
    sceneId: "home",
    homeStage: 1,
  }),
  step({
    slug: "turin",
    place: "Turin",
    roles: [degreeRole(politecnico, "Turin, Italy")],
    lines: [`${degree(politecnico).degree}, ${politecnico}.`],
    links: [inTheCv.education],
    props: [
      { id: "mole", name: "The Mole Antonelliana", captionLine: 0 },
      { id: "coils", name: "Ferraris' coils", captionLine: 0 },
    ],
    illustration: {
      label:
        "Illustration: the Mole Antonelliana with Galileo Ferraris' coils, for a degree in electrical engineering.",
      inspirations: [
        "The Mole Antonelliana, Turin",
        "Galileo Ferraris' rotating magnetic field",
      ],
    },
    sceneId: "turin",
  }),
  step({
    slug: "switzerland",
    place: "Switzerland",
    roles: [
      degreeRole(epfl, "Lausanne, Switzerland"),
      workRole(roche),
      workRole(burgeon),
    ],
    lines: [
      `${degree(epfl).degree}, ${epfl}.`,
      summariser.description,
      pick(bullets(roche), "Took a personalized-medicine"),
      pick(bullets(burgeon), "Fine-tuned language models"),
    ],
    links: [
      inTheCv.education,
      inTheCv.experience,
      ...(summariser.link ? [summariser.link] : []),
      ...employer(roche),
      ...employer(burgeon),
    ],
    props: [
      { id: "lake", name: "The lake from above Lausanne", captionLine: 1 },
      { id: "roche-dial", name: "Roche's dial", captionLine: 2 },
      { id: "jet-d-eau", name: "The Jet d'Eau", captionLine: 3 },
    ],
    illustration: {
      label:
        "Illustration: the lake from above Lausanne, its reflection the thesis summariser's TL;DR, with the Jet d'Eau for Burgeon Labs and a dial of its own for Roche, which is in Basel, on the Rhine.",
      inspirations: [
        "Lake Geneva from above Lausanne",
        "The Jet d'Eau, Geneva",
        "The thesis summariser's Detailed and TL;DR modes",
      ],
    },
    sceneId: "switzerland",
  }),
  step({
    slug: "cuneo-2022",
    place: "Cuneo",
    roles: [workRole(teaching)],
    lines: [
      pick(bullets(teaching), "Taught math and physics"),
      pick(bullets(teaching), "Built an interior-design MVP"),
    ],
    links: [inTheCv.experience],
    props: [
      { id: "schoolroom", name: "The schoolroom", captionLine: 0 },
      { id: "mvp-window", name: "The dimmed MVP window", captionLine: 1 },
    ],
    illustration: homeIllustration,
    sceneId: "home",
    homeStage: 2,
  }),
  step({
    slug: "lille",
    place: "Lille",
    /* The step is labelled Lille; the plant is in Saint-Amand-les-Eaux, and the
       role says so. */
    roles: [workRole(gsk, gskLocation)],
    lines: [
      pick(bullets(gsk), "Found inefficiencies"),
      pick(bullets(gsk), "Built anomaly detection"),
      pick(bullets(gsk), "Built natural-language interfaces"),
    ],
    links: [inTheCv.experience, ...employer(gsk)],
    props: [
      { id: "belfry", name: "The Chamber of Commerce belfry", captionLine: 1 },
      { id: "courtyard", name: "The Vieille Bourse courtyard", captionLine: 2 },
      { id: "pipe-loop", name: "The pipe loop", captionLine: 0 },
      { id: "clock-face", name: "The clock face", captionLine: 0 },
    ],
    illustration: {
      label:
        "Illustration: the Chamber of Commerce belfry and the Vieille Bourse courtyard, ringed with a pipe loop for the water work at GSK in Saint-Amand-les-Eaux, near Lille.",
      inspirations: [
        "The belfry of the Chamber of Commerce, Lille",
        "The Vieille Bourse courtyard, Lille",
        "A pharmaceutical plant's water utilities",
      ],
    },
    sceneId: "lille",
  }),
  step({
    slug: "now",
    place: "Cuneo",
    roles: [workRole(stealth), workRole(complaion)],
    /* The startup's first bullet, the AWS backend and the EdTech product, says
       "from zero", a number Decision 10 does not allow. */
    lines: [
      pick(bullets(stealth), "Built a RAG stack"),
      pick(bullets(stealth), "Led MVP engineering"),
      pick(bullets(complaion), "Complaion helps"),
      pick(bullets(complaion), "Building the agentic AI core"),
      pick(bullets(complaion), "Shaping product decisions"),
    ],
    links: [inTheCv.experience, ...employer(stealth), ...employer(complaion)],
    props: [
      { id: "startup-desk", name: "The startup's desk", captionLine: 0 },
      { id: "office", name: "The office", captionLine: 3 },
    ],
    illustration: homeIllustration,
    sceneId: "home",
    homeStage: 3,
  }),
  step({
    slug: "next",
    place: "?",
    roles: [],
    lines: ["Not yet written."],
    links: [
      { label: "Email", href: `mailto:${RESUME_DATA.contact.email}` },
      { label: RESUME_DATA.newsletter.name, href: RESUME_DATA.newsletter.url },
    ],
    props: [{ id: "blank", name: "The blank prop", captionLine: 0 }],
    illustration: {
      label:
        "Illustration: a blank prop with empty clue slots, for a step not yet written.",
      inspirations: [
        "La Ghigliottina, the quiz round that finds the word connecting five clues",
      ],
    },
    sceneId: "open",
  }),
];

function sideProp(
  slug: string,
  title: string,
  pickLines: (all: string[]) => string[],
): PathSideProp {
  const source = project(title);
  if (!source.link) throw new Error(`The path needs a link for ${title}`);
  const lines = pickLines(sentences(source.description));
  return { slug, title, lines, link: source.link, text: lines.join(" ") };
}

export const PATH_SIDE_PROPS: readonly PathSideProp[] = [
  sideProp("quadrell", "Quadrell", (all) => all),
  /* Its opening sentence names the channel, "Rai 1": a number Decision 10 does
     not allow, so the prop starts at what the oracle did. */
  sideProp("oracolo", "L'Oracolo della Ghigliottina", (all) => [
    pick(all, "It found the word"),
    pick(all, "The service is closed"),
    pick(all, "Past results"),
  ]),
];
