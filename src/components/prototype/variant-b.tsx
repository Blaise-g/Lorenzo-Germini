// PROTOTYPE Variant B — "Editorial" (issue #7), now parameterized with three
// visual treatments (issue #8): same layout (masthead, sticky rail, numbered
// essay index, prose timeline), different typography, density, rule weight,
// and motion. All treatments now inherit the signed Warm Print palette.
// Switch via ?variant=b1|b2|b3 (b = b1).

import Image from "next/image";
import { RESUME_DATA } from "@/data/resume-data";
import { PROTOTYPE_ESSAYS } from "./writing-data";

const NAV = [
  { href: "#writing", label: "Writing" },
  { href: "#work", label: "Work" },
  { href: "#projects", label: "Projects" },
  { href: "#contact", label: "Contact" },
];

export type TreatmentKey = "warm" | "slate" | "broadsheet";

type Treatment = {
  /* page background + ink */
  page: string;
  /* metadata/labels: dates, tags, nav, section headings */
  meta: string;
  metaHeading: string;
  /* accent for links, essay numbers, CTA */
  accent: string;
  accentBorder: string;
  /* rules and dividers */
  masthead: string;
  divide: string;
  projectRule: string;
  /* display type scale */
  heroClass: string;
  essayTitle: string;
  /* vertical rhythm */
  flow: string;
  essayPad: string;
  workGap: string;
  /* body copy opacity/color */
  body: string;
  faint: string;
  /* motion: per-section reveal class ("" = none) */
  reveal: string;
  stagger: boolean;
};

const TREATMENTS: Record<TreatmentKey, Treatment> = {
  /* B1 — Warm Print: paper + terracotta ink, mono metadata, staggered reveal. */
  warm: {
    page: "bg-ground text-ink",
    meta: "font-mono text-xs uppercase tracking-[0.12em]",
    metaHeading: "font-mono text-xs uppercase tracking-[0.2em] text-accent",
    accent: "text-accent",
    accentBorder: "border-accent",
    masthead: "border-b-2 border-current pb-4",
    divide: "divide-y divide-current/15",
    projectRule: "border-t-2 border-current/70 pt-4",
    heroClass: "text-4xl font-medium leading-[1.08] tracking-tight md:text-6xl",
    essayTitle: "text-2xl leading-snug",
    flow: "space-y-20",
    essayPad: "py-6",
    workGap: "space-y-8",
    body: "text-body",
    faint: "text-faint",
    reveal: "animate-fade-in-up",
    stagger: true,
  },

  /* B2 — a quieter editorial scale and rhythm on Warm Print. */
  slate: {
    page: "bg-ground text-ink",
    meta: "font-mono text-xs uppercase tracking-[0.15em] text-faint",
    metaHeading: "font-mono text-xs uppercase tracking-[0.2em] text-accent",
    accent: "text-accent",
    accentBorder: "border-accent",
    masthead: "border-b border-border pb-4",
    divide: "divide-y divide-border",
    projectRule: "border-t border-border pt-4",
    heroClass: "text-4xl font-medium leading-[1.1] tracking-tight md:text-6xl",
    essayTitle: "text-2xl leading-snug",
    flow: "space-y-20",
    essayPad: "py-6",
    workGap: "space-y-8",
    body: "text-body",
    faint: "text-faint",
    reveal: "animate-fade-in",
    stagger: false,
  },

  /* B3 — dense, mono-forward, heavy rules, and zero motion. */
  broadsheet: {
    page: "bg-ground text-ink",
    meta: "font-mono text-xs uppercase tracking-[0.08em]",
    metaHeading:
      "font-mono text-xs font-bold uppercase tracking-[0.08em] text-accent",
    accent: "text-accent",
    accentBorder: "border-accent",
    masthead: "border-b-4 border-current pb-3",
    divide: "divide-y-2 divide-current/25",
    projectRule: "border-t-[3px] border-current pt-3",
    heroClass:
      "text-4xl font-black leading-[1.02] tracking-tight md:text-[4.25rem]",
    essayTitle: "text-2xl font-semibold leading-tight",
    flow: "space-y-14",
    essayPad: "py-5",
    workGap: "space-y-5",
    body: "text-body",
    faint: "text-faint",
    reveal: "",
    stagger: false,
  },
};

export function VariantB({ treatment = "warm" }: { treatment?: TreatmentKey }) {
  const t = TREATMENTS[treatment];
  const delay = (i: number) =>
    t.stagger ? { animationDelay: `${i * 90}ms` } : undefined;

  return (
    <div className={`min-h-screen ${t.page}`}>
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        {/* Masthead */}
        <header
          className={`flex items-baseline justify-between ${t.masthead} ${t.reveal}`}
        >
          <p className="font-display text-lg font-semibold tracking-tight">
            Lorenzo Germini
          </p>
          <nav className={`flex gap-5 ${t.meta}`}>
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
        </header>

        <div className="grid gap-10 pt-10 md:grid-cols-[240px_1fr] md:gap-16">
          {/* Sticky rail */}
          <aside
            className={`space-y-6 md:sticky md:top-10 md:self-start ${t.reveal}`}
            style={delay(1)}
          >
            <div className="relative size-24 overflow-hidden rounded-sm grayscale">
              <Image
                src={RESUME_DATA.avatarUrl}
                alt={RESUME_DATA.name}
                width={96}
                height={96}
                priority
                className="object-cover"
              />
            </div>
            <p className={`text-sm leading-relaxed ${t.body}`}>
              AI Product Engineer in Turin. Building the AI engine behind a
              compliance platform; before that pharma AI, digital health, and a
              GenAI startup.
            </p>
            <div id="contact" className="space-y-1 text-sm">
              <a
                href={`mailto:${RESUME_DATA.contact.email}`}
                className="block underline underline-offset-4"
              >
                {RESUME_DATA.contact.email}
              </a>
              {RESUME_DATA.contact.social.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block underline underline-offset-4"
                >
                  {s.name}
                </a>
              ))}
            </div>
            <p className={`${t.meta} ${t.faint}`}>EN · IT</p>
            <p className={`${t.meta} ${t.faint}`}>
              agents welcome →{" "}
              <a
                href="/llms.txt"
                className={`underline underline-offset-4 ${t.accent}`}
              >
                /llms.txt
              </a>
            </p>
          </aside>

          {/* Editorial flow */}
          <div className={t.flow}>
            {/* Statement hero */}
            <section className={t.reveal} style={delay(2)}>
              <h1 className={`font-display ${t.heroClass}`}>
                Turning frontier AI into{" "}
                <em className={`italic ${t.accent}`}>shipped products</em> — and
                writing about tech, startups, and strategy along the way.
              </h1>
              <p
                className={`mt-6 max-w-xl text-base leading-relaxed ${t.body}`}
              >
                Pharma manufacturing, digital health, a founded GenAI startup,
                compliance AI: the through-line is that technical depth only
                matters when it connects to what&apos;s worth building.
              </p>
              <a
                href="#writing"
                className={`mt-6 inline-block border-b-2 pb-0.5 ${t.meta} ${t.accent} ${t.accentBorder} hover:opacity-70`}
              >
                Start with the essays ↓
              </a>
            </section>

            {/* Essays — numbered index, lead feature */}
            <section id="writing" className={t.reveal} style={delay(3)}>
              <h2 className={`mb-6 ${t.metaHeading}`}>Writing</h2>
              <div className={t.divide}>
                {PROTOTYPE_ESSAYS.map((essay, i) => (
                  <a
                    key={essay.title}
                    href="#"
                    className={`group grid gap-2 ${t.essayPad} md:grid-cols-[3rem_1fr_auto] md:gap-6`}
                  >
                    <span
                      className={`font-display text-2xl italic ${t.accent}`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span
                        className={`font-display block ${t.essayTitle} underline-offset-4 group-hover:underline`}
                      >
                        {essay.title}
                      </span>
                      <span
                        className={`mt-2 block max-w-xl text-sm leading-relaxed ${t.body}`}
                      >
                        {essay.excerpt}
                      </span>
                    </span>
                    <span className={`${t.meta} ${t.faint} md:text-right`}>
                      {essay.lang} · {essay.tag}
                      <br />
                      {essay.date}
                    </span>
                  </a>
                ))}
              </div>
              <a
                href="#"
                className={`mt-4 inline-block text-sm underline underline-offset-4 ${t.accent} hover:opacity-70`}
              >
                Archive &amp; subscribe →
              </a>
            </section>

            {/* Work — prose timeline */}
            <section id="work" className={t.reveal} style={delay(4)}>
              <h2 className={`mb-6 ${t.metaHeading}`}>Work</h2>
              <div className={t.workGap}>
                {RESUME_DATA.work.slice(0, 4).map((work) => (
                  <div
                    key={`${work.company}-${work.start}`}
                    className="grid gap-1 md:grid-cols-[10rem_1fr] md:gap-6"
                  >
                    <p
                      className={`${t.meta} ${t.faint} pt-1 normal-case tabular-nums`}
                    >
                      {work.start} – {work.end ?? "Present"}
                    </p>
                    <div>
                      <h3 className="font-display text-xl">
                        {work.title} · {work.company}
                      </h3>
                      <p
                        className={`mt-1 max-w-xl text-sm leading-relaxed ${t.body}`}
                      >
                        {Array.isArray(work.description)
                          ? work.description[0]
                          : work.description}
                      </p>
                    </div>
                  </div>
                ))}
                <p className={`text-sm ${t.faint} md:pl-[10rem]`}>
                  Earlier:{" "}
                  {RESUME_DATA.work
                    .slice(4)
                    .map((w) => w.company)
                    .join(", ")}{" "}
                  · EPFL MSc in Life Sciences Engineering.
                </p>
              </div>
            </section>

            {/* Projects */}
            <section
              id="projects"
              className={`pb-16 ${t.reveal}`}
              style={delay(5)}
            >
              <h2 className={`mb-6 ${t.metaHeading}`}>Projects</h2>
              <div className="grid gap-8 md:grid-cols-2">
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
          </div>
        </div>
      </div>
    </div>
  );
}
