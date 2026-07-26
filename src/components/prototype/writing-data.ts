// PROTOTYPE — placeholder essay data for homepage direction prototypes (issue #7).
// Real data will come from the Substack RSS feed (see docs/research/substack-integration-options.md).
// Delete with the rest of src/components/prototype/ only when the Phase 2 §2.6
// homepage swap merges.

export type PrototypeEssay = {
  title: string;
  excerpt: string;
  date: string;
  lang: "EN" | "IT";
  tag: string;
  readingMinutes: number;
};

export const PROTOTYPE_ESSAYS: PrototypeEssay[] = [
  {
    title: "Compliance is a language problem",
    excerpt:
      "ISO audits run on documents nobody reads. What happens when the reader is a machine that never gets bored — and what that means for the SMEs drowning in paperwork.",
    date: "2026-07-02",
    lang: "EN",
    tag: "AI × Compliance",
    readingMinutes: 8,
  },
  {
    title: "Costruire con gli LLM in Italia",
    excerpt:
      "L'Italia è piena di aziende che potrebbero usare l'AI domani mattina — e quasi nessuno che gliela costruisce. Appunti da Torino su un mercato scoperto.",
    date: "2026-06-14",
    lang: "IT",
    tag: "Startup",
    readingMinutes: 6,
  },
  {
    title: "The demo-to-production gap",
    excerpt:
      "Every agentic RAG demo works. Almost none survive contact with real documents, real users, and real latency budgets. A field guide to the gap, from someone who lives in it.",
    date: "2026-05-28",
    lang: "EN",
    tag: "Engineering",
    readingMinutes: 11,
  },
];
