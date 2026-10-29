import type { PathStepSlug } from "./path.types";

/* What the voice says at each step of `/path`, and the caption line shows
   (owner, v3: no text panel; the voice tells each step). Spoken prose in the
   voice of the step's own lines, first person and plain, retold from facts
   `path.ts` and `RESUME_DATA` already carry: each cue names its source. Not
   word for word, as the step's text is, because a CV line read aloud runs
   long and a caption has to be short; but nothing here that the data does
   not say.

   Decision 10 binds here as on the page: only its four numbers, in the CV's
   own wording, and the water figure always "projected" in the same cue. So
   no years, and no counts the data's prose does not already allow.

   Each cue is one caption, and optionally the prop it is about, by the id
   the step names in `path.ts`, so the board can move that prop while its
   sentence is spoken. Its timing is measured from the clip and kept in the
   voice manifest (`src/app/path/narration.ts`). */

/** One spoken segment: its words, and the prop it is about. */
export type NarrationScriptCue = {
  text: string;
  /** A prop id from the step's `props` in `path.ts`. */
  prop?: string;
};

export const PATH_NARRATION: Record<
  PathStepSlug,
  readonly NarrationScriptCue[]
> = {
  home: [
    /* RESUME_DATA.homeLine, with the step's place. */
    { text: "This is Cuneo, where I grew up and went to school." },
    /* The plateau's inspiration. */
    {
      text: "The town sits on a wedge-shaped plateau between the Stura and the Gesso.",
      prop: "plateau",
    },
    /* The Bisalta's inspiration. */
    {
      text: "Behind it, the Bisalta, the mountain behind Cuneo.",
      prop: "bisalta",
    },
    /* The school's inspiration. */
    { text: "And here, my old high school.", prop: "school" },
    /* The illustration's label: "built up a little more on each return". */
    {
      text: "The path comes back here, and each time it builds up a little more.",
    },
  ],
  turin: [
    /* The Polytechnic's degree. */
    {
      text: "Then Turin, for a Bachelor's Degree in Electrical Engineering at the Polytechnic of Turin.",
    },
    /* The Mole's inspiration. */
    { text: "Its landmark is the Mole Antonelliana.", prop: "mole" },
    /* The coils' inspiration. */
    {
      text: "Beside it, Galileo Ferraris' coils, for his rotating magnetic field.",
      prop: "coils",
    },
    /* The illustration's label. */
    {
      text: "Together, an illustration for a degree in electrical engineering.",
    },
  ],
  switzerland: [
    /* EPFL's degree. */
    {
      text: "Next, Switzerland, for an MSc in Life Sciences Engineering at EPFL.",
    },
    { text: "It specialized in neuroscience and neuroengineering." },
    /* The Biomedical Paper Summarizer, the thesis; the lake's caption. */
    {
      text: "My thesis turned biomedical papers into a detailed analysis or a TL;DR.",
      prop: "lake",
    },
    /* Roche's bullet, split in two; the illustration puts Roche in Basel. */
    {
      text: "At Roche, in Basel, I took a filling prototype through integration testing.",
      prop: "roche-dial",
    },
    {
      text: "And built a model that tunes fill parameters 20% faster than manual tuning.",
      prop: "roche-dial",
    },
    /* Burgeon Labs' bullet; its badge is Geneva. */
    {
      text: "At Burgeon Labs, in Geneva, I fine-tuned language models to summarize biomedical literature.",
      prop: "jet-d-eau",
    },
  ],
  "cuneo-2022": [
    /* The self-employed role's first bullet. */
    {
      text: "Back in Cuneo, I taught math and physics at my old high school.",
      prop: "schoolroom",
    },
    /* Its second bullet, in four; the role is "Teacher and Digital
       Freelancer". */
    {
      text: "As a freelancer, I built an interior-design MVP with Stable Diffusion.",
      prop: "mvp-window",
    },
    {
      text: "I fine-tuned it with Dreambooth on a hand-curated dataset of room designs.",
      prop: "mvp-window",
    },
    {
      text: "I preprocessed the dataset myself.",
      prop: "mvp-window",
    },
    {
      text: "Then I killed it on the evidence, after customer discovery.",
      prop: "mvp-window",
    },
  ],
  lille: [
    /* GSK's role and badge, and the step's "near Lille". */
    {
      text: "Then France, as an AI Engineer at GSK, in Saint-Amand-les-Eaux, near Lille.",
    },
    /* GSK's first bullet, in two, its tools left to the flat site: the
       figure stays beside "projected". */
    {
      text: "I found inefficiencies across pharmaceutical utilities.",
      prop: "pipe-loop",
    },
    {
      text: "And designed water rejection strategies projected to save 10,000 m³ a year.",
      prop: "clock-face",
    },
    /* Its second bullet, in two. */
    {
      text: "I built anomaly detection and time-series forecasting for manufacturing.",
      prop: "belfry",
    },
    {
      text: "And semantic NLP for fault detection and maintenance decisions.",
      prop: "belfry",
    },
    /* Its third bullet. */
    {
      text: "And natural-language interfaces that made plant data usable on the floor.",
      prop: "courtyard",
    },
  ],
  now: [
    /* The startup's role and badge. */
    {
      text: "Home again, as founding AI engineer at a stealth GenAI startup.",
      prop: "startup-desk",
    },
    /* Its RAG bullet, in two. */
    {
      text: "I built a RAG stack with custom parsing for handwritten content.",
      prop: "startup-desk",
    },
    {
      text: "And tuned it with tracing and evaluation workflows.",
      prop: "startup-desk",
    },
    /* Its MVP bullet, a Decision 10 number in the CV's wording. */
    {
      text: "And led MVP engineering, managing two other developers.",
      prop: "startup-desk",
    },
    /* Complaion's role and its first bullet. */
    { text: "Now I'm an AI Product Engineer at Complaion.", prop: "office" },
    {
      text: "It helps European SMEs get real value from ISO certifications.",
      prop: "office",
    },
    /* Its second bullet, in two. */
    {
      text: "I'm building the agentic AI core of the product.",
      prop: "office",
    },
    {
      text: "Backed by evaluations that track reliability in production.",
      prop: "office",
    },
  ],
  next: [
    /* The step's place, "?". */
    { text: "And the last step is a question mark.", prop: "blank" },
    /* The illustration's label and inspiration. */
    { text: "A blank card with empty clue slots.", prop: "blank" },
    {
      text: "After La Ghigliottina, the quiz round that finds the word connecting five clues.",
      prop: "blank",
    },
    /* The step's line. */
    { text: "It's not yet written.", prop: "blank" },
    /* The step's links: the email and the newsletter. */
    {
      text: "The flat site has my email, and germinai, the newsletter, for what comes next.",
    },
  ],
};
