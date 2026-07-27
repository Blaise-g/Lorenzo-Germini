// PROTOTYPE Variant D — composition as the variable (issue #12).
//
// #8 built three "treatments" that turned out to hold composition constant and
// vary only hue and stroke weight, so the 240px sticky rail, the responsive
// break and the section-heading hierarchy were never actually under test.
// This file fixes that: palette is held constant at the settled Warm Print
// tokens (#8) and the *composition* is the parameter.
//
//   ?variant=d    → composition "single" — no rail, one ~660px measure
//   ?variant=b1a  → composition "rail"   — amended B1, rail at lg:
//
// Everything else is held identical between the two so the comparison is
// honest: same copy, same tokens, same type scale, same one-essay launch
// state, same footer, same technical proof. Fixes applied to BOTH (they are
// not the variable — they are #8/#9/#10 spec constraints the old prototype
// violated, and leaving them broken in one arm would rig the test):
//   - hero at clamp(2rem, 5.2vw, 3.75rem), not md:text-6xl
//   - t.faint is an explicit token, not opacity-55 (was 3.84:1, AA fail)
//   - section headings outrank the body they head (13px mono accent + rule)
//   - a real <footer>, ThemeToggle, skip link, BackToTop, CommandMenu,
//     StructuredData — variant-b.tsx rendered none of them
//   - exactly ONE essay (#10: day one is one post), no numbering, no archive
//   - reading time rendered; EN·IT chip dropped (#10)
//   - hand-written technically-led proof per role (#9 decision 5)
//   - no staggered animation-delay (the reduced-motion defect lives in the
//     stagger; fixing globals.css is out of scope for this ticket)

import React from "react";
import Image from "next/image";
import { RESUME_DATA } from "@/data/resume-data";
import { PROTOTYPE_ESSAYS } from "./writing-data";
import { FloatingActionCluster } from "@/components/floating-action-cluster";
import { ThemeToggle } from "@/components/theme-toggle";
import { StructuredData } from "@/components/structured-data";

export type Composition = "single" | "rail";

/* ─── Warm Print tokens (#8), held constant across both compositions ─── */
const t = {
  page: "bg-ground text-ink",
  /* metadata: JetBrains Mono, 12px, uppercase, wide tracking */
  meta: "font-mono text-xs uppercase tracking-[0.12em]",
  /* section heading: outranks body copy — 15px mono, semibold, accent, rule.
     At 13px the critique measured it at 0.81x the 16px body it heads and the
     lowest-contrast text on the page: legible up close, never the first
     fixation on a skim. 15px + wider tracking keeps the mono/caps/accent
     signal while actually outranking the body. */
  heading:
    "font-mono text-[15px] font-semibold uppercase tracking-[0.18em] text-accent",
  headingRule: "mt-2 border-t border-current/20",
  accent: "text-accent",
  accentBorder: "border-accent",
  body: "text-body",
  faint: "text-faint",
  masthead: "border-b-2 border-current pb-4",
  divide: "divide-y divide-current/15",
  projectRule: "border-t-2 border-current/70 pt-4",
  reveal: "animate-fade-in-up",
};

const HERO_SIZE = { fontSize: "clamp(2rem, 5.2vw, 3.75rem)" } as const;

const NAV = [
  { href: "#writing", label: "Writing" },
  { href: "#work", label: "Work" },
  { href: "#projects", label: "Projects" },
  { href: "#contact", label: "Contact" },
];

/* Hand-written, technically-led proof per role (#9 decision 5). The old
   prototype rendered description[0], which is the *business* sentence for
   Complaion and a sentence about teaching high-school maths for Self
   Employed — it stripped every technical noun off the homepage. */
const HOMEPAGE_PROOF: Record<string, string> = {
  Complaion:
    "Multi-provider LLM infrastructure (OpenAI, Anthropic, Gemini), agentic RAG over ISO documentation, and the evaluation harness that keeps both honest in production.",
  "Stealth GenAI Startup":
    "Backend and GenAI API layer from zero on AWS (Lambda, DynamoDB, Amplify); a pgai RAG stack with custom parsing for handwritten input, plus tracing and evals to tune retrieval.",
  GSK: "Time-series forecasting and anomaly detection on plant sensor data, semantic NLP for fault detection, and a water-rejection strategy projected at 10,000 m³/year.",
  "Self Employed":
    "A Stable Diffusion interior-design MVP with Dreambooth fine-tuning on a hand-curated dataset — then killed on the evidence after customer discovery.",
};

const SYSTEMS =
  "Python · TypeScript · Next.js · Postgres / pgvector · pgai · AWS · OpenAI / Anthropic / Gemini · agentic RAG · evals & tracing · time-series ML";

const EARLIER =
  "Burgeon Labs — fine-tuned LMs for abstractive summarisation of biomedical literature, deployed end-to-end. Roche — a gradient-boosted-tree model for fill-parameter tuning on a personalised-medicine prototype, 20% faster than manual. EPFL MSc, Life Sciences Engineering.";

const CV_HREF = "/cv";

/* ─── Shared section heading ─── */
function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className={t.heading}>{children}</h2>
      <div className={t.headingRule} />
    </div>
  );
}

/* ─── Content blocks: identical in both compositions ─── */

/* Avatar + role + CV, at the top of the page. The single-measure arm always
   uses this; the rail arm uses it below lg, where the rail does not exist. */
function IdentityBand() {
  return (
    <div className="flex items-center gap-4 pt-5">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-sm grayscale">
        <Image
          src={RESUME_DATA.avatarUrl}
          alt={RESUME_DATA.name}
          width={56}
          height={56}
          priority
          className="object-cover"
        />
      </div>
      <p className={`${t.meta} ${t.faint} leading-relaxed`}>
        AI Product Engineer · Turin, Italy
        <br />
        <a
          href={CV_HREF}
          className={`${t.accent} underline underline-offset-4 hover:opacity-70`}
        >
          CV →
        </a>
      </p>
    </div>
  );
}

function Hero() {
  return (
    <section className={t.reveal}>
      <h1
        className="font-display leading-[1.08] font-medium tracking-tight"
        style={HERO_SIZE}
      >
        Turning frontier AI into{" "}
        <em className={`italic ${t.accent}`}>shipped products</em> — and writing
        about tech, startups, and strategy along the way.
      </h1>
      {/* The subhead now names a system at the fold. The critique measured 3
          technical terms above the fold on the incumbent site and 0 in both
          prototype arms — a violation of the audit's one binding constraint
          ("never look less technical"). Wording is a recommendation for the
          copy rewrite, not a locked line. */}
      <p className={`mt-6 text-base leading-relaxed ${t.body}`}>
        Right now: the agentic RAG engine behind a compliance platform. Before
        that pharma manufacturing, digital health, and a founded GenAI startup —
        the through-line is that technical depth only matters when it connects
        to what&apos;s worth building.
      </p>
      <a
        href="#writing"
        className={`mt-7 inline-block border-b-2 pb-0.5 ${t.meta} ${t.accent} ${t.accentBorder} hover:opacity-70`}
      >
        Start with the essays ↓
      </a>
    </section>
  );
}

/* #10 decision 3: count-aware. Day one is exactly one post → lead treatment
   only, no numbered index, no archive link, nothing implying more exists. */
function Writing() {
  const essays = PROTOTYPE_ESSAYS.slice(0, 1);
  const lead = essays[0];
  return (
    <section id="writing" className={t.reveal}>
      <Heading>Writing</Heading>
      <a href="#" className="group block">
        <p className={`${t.meta} ${t.faint}`}>
          {new Date(lead.date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          · {lead.readingMinutes} min read
        </p>
        <h3 className="font-display mt-2 text-3xl leading-snug underline-offset-4 group-hover:underline">
          {lead.title}
        </h3>
        <p className={`mt-3 text-base leading-relaxed ${t.body}`}>
          {lead.excerpt}
        </p>
        <span
          className={`mt-4 inline-block ${t.meta} ${t.accent} border-b ${t.accentBorder} pb-0.5`}
        >
          Read the essay →
        </span>
      </a>
    </section>
  );
}

function Work() {
  return (
    <section id="work" className={t.reveal}>
      <Heading>Work</Heading>
      <div className="space-y-8">
        {RESUME_DATA.work.slice(0, 4).map((work) => (
          <div
            key={`${work.company}-${work.start}`}
            className="grid gap-1 sm:grid-cols-[7.5rem_1fr] sm:gap-6"
          >
            <p
              className={`${t.meta} ${t.faint} normal-case tabular-nums sm:pt-1.5`}
            >
              {work.start} – {work.end ?? "Present"}
            </p>
            <div>
              <h3 className="font-display text-xl">
                {work.title} · {work.company}
              </h3>
              <p className={`mt-1.5 text-sm leading-relaxed ${t.body}`}>
                {HOMEPAGE_PROOF[work.company] ??
                  (Array.isArray(work.description)
                    ? work.description[0]
                    : work.description)}
              </p>
            </div>
          </div>
        ))}
        <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr] sm:gap-6">
          <p className={`${t.meta} ${t.faint} normal-case sm:pt-1.5`}>
            2021 – 2022
          </p>
          <p className={`text-sm leading-relaxed ${t.faint}`}>{EARLIER}</p>
        </div>
      </div>
      <p className={`mt-8 ${t.meta}`}>
        <a
          href={CV_HREF}
          className={`border-b ${t.accent} ${t.accentBorder} pb-0.5 hover:opacity-70`}
        >
          Full CV →
        </a>
      </p>
    </section>
  );
}

function Projects({ twoUp }: { twoUp: boolean }) {
  return (
    <section id="projects" className={t.reveal}>
      <Heading>Projects</Heading>
      <div className={`grid gap-8 ${twoUp ? "lg:grid-cols-2" : ""}`}>
        {RESUME_DATA.projects.map((project) => (
          <a
            key={project.title}
            href={"link" in project ? project.link?.href : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`group ${t.projectRule}`}
          >
            <h3 className="font-display text-2xl group-hover:italic">
              {project.title}
            </h3>
            <p className={`mt-2 text-sm leading-relaxed ${t.body}`}>
              {project.description}
            </p>
            <p className={`mt-3 ${t.meta} ${t.faint}`}>
              {project.techStack.slice(0, 4).join(" · ")}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

/* #9 decision 5: the homepage keeps a body-contrast mono systems line — the
   technical nouns that make a founder believe he can build. */
function Systems() {
  return (
    <section className={t.reveal}>
      <Heading>Systems</Heading>
      {/* 12px, not 13px: at 13px this line and its own heading were the same
          size in the same family and read as one object. */}
      <p className={`font-mono text-[12px] leading-relaxed ${t.body}`}>
        {SYSTEMS}
      </p>
    </section>
  );
}

/* ─── The variable: composition ─── */

export function VariantD({ composition }: { composition: Composition }) {
  const rail = composition === "rail";

  return (
    <div className={`min-h-screen ${t.page}`}>
      <StructuredData />
      <ThemeToggle />

      {rail ? (
        /* ── Composition "rail": amended B1. The rail is a desktop-only
           device, so below lg it does not exist at all and the identity band
           carries its content — which makes the two arms *identical* below
           1024px and confines the fork to lg and up.
           Three defects the /impeccable critique measured, all fixed here:
           (1) CSS `order-*` gave the right visual order but left the aside
               first in the DOM, so at 375 the first five tab stops were rail
               links at y≈3184 — a WCAG 2.4.3 focus-order failure. Grid
               placement (col-start/row-start) does the job without touching
               DOM order, so the content div now comes first in the DOM.
           (2) Below lg the aside became an orphaned duplicate footer at 80%
               page depth, +288px of phone scroll for negative value.
           (3) Projects escaped the max-w wrapper to go 2-up at lg, so at
               1023px it rendered 943px wide and single-column — 105ch lines
               under a page of 672px ones. Now capped until lg. ── */
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <header className={`${t.masthead} pt-10 ${t.reveal}`}>
            <div className="flex items-baseline justify-between">
              <p className="font-display text-lg font-semibold tracking-tight">
                Lorenzo Germini
              </p>
              <p className={`${t.meta} ${t.faint}`}>AI Product Engineer</p>
            </div>
          </header>
          {/* Below lg the rail's content lives here instead. */}
          <div className="lg:hidden">
            <IdentityBand />
          </div>

          <div className="grid gap-10 pt-10 lg:grid-cols-[220px_1fr] lg:gap-14">
            <aside
              className={`hidden space-y-6 lg:sticky lg:top-10 lg:col-start-1 lg:row-start-1 lg:block lg:self-start ${t.reveal}`}
              aria-label="Profile"
            >
              <div className="relative size-20 overflow-hidden rounded-sm grayscale">
                <Image
                  src={RESUME_DATA.avatarUrl}
                  alt={RESUME_DATA.name}
                  width={80}
                  height={80}
                  priority
                  className="object-cover"
                />
              </div>
              <p className={`text-sm leading-relaxed ${t.body}`}>
                AI Product Engineer in Turin. Building the agentic RAG engine
                behind a compliance platform; before that pharma AI, digital
                health, and a GenAI startup.
              </p>
              <nav
                className={`flex flex-col gap-2 border-t border-current/15 pt-5 ${t.meta}`}
                aria-label="Sections"
              >
                {NAV.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </a>
                ))}
                <a
                  href={CV_HREF}
                  className={`${t.accent} underline-offset-4 hover:underline`}
                >
                  CV →
                </a>
              </nav>
            </aside>

            <div className="space-y-16 lg:col-start-2 lg:row-start-1">
              <div className="max-w-[42rem] space-y-16">
                <Hero />
                <Writing />
                <Work />
              </div>
              <div className="max-w-[42rem] lg:max-w-none">
                <Projects twoUp />
              </div>
              <div className="max-w-[42rem]">
                <Systems />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Composition "single": no rail. The rail's content moves into a
           masthead identity band, and everything below sets at one ~660px
           measure — so no column is stranded and no breakpoint fights the
           display scale. ── */
        <div className="mx-auto max-w-[46rem] px-6">
          <header className={`pt-10 ${t.reveal}`}>
            <div
              className={`flex items-baseline justify-between ${t.masthead}`}
            >
              <p className="font-display text-lg font-semibold tracking-tight">
                Lorenzo Germini
              </p>
              <nav
                className={`hidden gap-5 sm:flex ${t.meta}`}
                aria-label="Sections"
              >
                {NAV.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
            <IdentityBand />
          </header>

          <div className="space-y-16 pt-12">
            <Hero />
            <Writing />
            <Work />
            <Projects twoUp={false} />
            <Systems />
          </div>
        </div>
      )}

      <FloatingActionCluster
        commandLinks={[
          { url: RESUME_DATA.personalWebsiteUrl, title: "Personal Website" },
          { url: CV_HREF, title: "CV" },
          ...RESUME_DATA.contact.social.map((s) => ({
            url: s.url,
            title: s.name,
          })),
        ]}
      />
    </div>
  );
}
