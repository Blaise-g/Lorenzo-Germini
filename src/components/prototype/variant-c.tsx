// PROTOTYPE Variant C — "Agent-native index" (issue #7).
// Brutalist/terminal direction: the homepage presents itself as a structured,
// machine-readable manifest — sections keyed like routes, a visible frontmatter
// block, llms.txt surfaced as a first-class feature. Dark, mono-forward,
// hard borders, no rounded corners. "Readable by humans and agents alike."

import { RESUME_DATA } from "@/data/resume-data";
import { PROTOTYPE_ESSAYS } from "./writing-data";

function Key({ children }: { children: React.ReactNode }) {
  return <span className="text-emerald-400">{children}</span>;
}

function SectionLabel({ path, title }: { path: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-zinc-700 pb-2">
      <span className="font-bold text-emerald-400">{path}</span>
      <span className="text-xs uppercase tracking-[0.25em] text-zinc-500">{title}</span>
    </div>
  );
}

export function VariantC() {
  return (
    <div className="min-h-screen bg-zinc-950 font-mono text-sm text-zinc-300 selection:bg-emerald-400 selection:text-zinc-950">
      <div className="mx-auto max-w-4xl px-5 py-12 md:py-16">
        {/* Frontmatter hero */}
        <header className="border border-zinc-700">
          <div className="flex items-center gap-2 border-b border-zinc-700 bg-zinc-900 px-4 py-2 text-xs text-zinc-500">
            <span className="size-2 bg-emerald-400" aria-hidden />
            lorenzo-germini.dev — index · last_updated 2026-07
          </div>
          <div className="space-y-1.5 px-4 py-5 leading-relaxed">
            <p>
              <Key>name:</Key> <span className="text-lg font-bold text-zinc-50">{RESUME_DATA.name}</span>
            </p>
            <p>
              <Key>role:</Key> AI Product Engineer — turns frontier AI into shipped products
            </p>
            <p>
              <Key>writes_about:</Key> [tech, startups, strategy] <span className="text-zinc-500">· langs: [EN, IT] · focus: Italy</span>
            </p>
            <p>
              <Key>now:</Key> building the AI engine at{" "}
              <a href="https://www.complaion.com/" target="_blank" rel="noopener noreferrer" className="text-zinc-50 underline decoration-emerald-400 underline-offset-4">
                Complaion
              </a>{" "}
              (compliance automation, Turin)
            </p>
            <p>
              <Key>contact:</Key>{" "}
              <a href={`mailto:${RESUME_DATA.contact.email}`} className="underline decoration-emerald-400 underline-offset-4">
                {RESUME_DATA.contact.email}
              </a>
              {RESUME_DATA.contact.social.map((s) => (
                <span key={s.name}>
                  {" · "}
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-emerald-400 underline-offset-4">
                    {s.name.toLowerCase()}
                  </a>
                </span>
              ))}
            </p>
          </div>
          <div className="border-t border-zinc-700 bg-zinc-900/60 px-4 py-2 text-xs text-zinc-400">
            🤖 Agents welcome: this site ships{" "}
            <a href="/llms.txt" className="text-emerald-400 underline underline-offset-4">/llms.txt</a>,{" "}
            <a href="/llms-full.txt" className="text-emerald-400 underline underline-offset-4">/llms-full.txt</a>{" "}
            and JSON-LD. Humans: keep scrolling.
          </div>
        </header>

        {/* /writing */}
        <section className="mt-12 space-y-4">
          <SectionLabel path="/writing" title="essays — the primary path" />
          <ul className="space-y-3">
            {PROTOTYPE_ESSAYS.map((essay) => (
              <li key={essay.title}>
                <a href="#" className="group grid gap-x-4 gap-y-0.5 py-1 md:grid-cols-[7rem_1fr_auto]">
                  <span className="text-zinc-500 tabular-nums">{essay.date}</span>
                  <span>
                    <span className="text-zinc-50 group-hover:text-emerald-400">{essay.title}</span>
                    <span className="block text-xs leading-relaxed text-zinc-500">{essay.excerpt}</span>
                  </span>
                  <span className="text-xs text-zinc-500">
                    [{essay.lang}] {essay.readingMinutes}min
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p>
            <span className="text-zinc-600">$</span>{" "}
            <a href="#" className="text-emerald-400 underline underline-offset-4">
              subscribe --via substack
            </a>
          </p>
        </section>

        {/* /work */}
        <section className="mt-12 space-y-4">
          <SectionLabel path="/work" title="track record" />
          <table className="w-full border-collapse text-left">
            <tbody>
              {RESUME_DATA.work.map((work) => (
                <tr key={`${work.company}-${work.start}`} className="border-b border-zinc-800 align-top">
                  <td className="py-2.5 pr-4 text-zinc-500 tabular-nums whitespace-nowrap">
                    {work.start}–{work.end ?? "now"}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-zinc-50">{work.company}</span>
                    <span className="block text-xs text-zinc-500">{work.title}</span>
                  </td>
                  <td className="hidden py-2.5 text-xs leading-relaxed text-zinc-400 md:table-cell">
                    {Array.isArray(work.description) ? work.description[0] : work.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* /projects */}
        <section className="mt-12 space-y-4">
          <SectionLabel path="/projects" title="shipped on the side" />
          <div className="grid gap-4 md:grid-cols-2">
            {RESUME_DATA.projects.map((project) => (
              <a
                key={project.title}
                href={"link" in project ? project.link?.href : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="group border border-zinc-800 p-4 hover:border-emerald-400"
              >
                <h3 className="text-zinc-50 group-hover:text-emerald-400">{project.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">{project.description}</p>
                <p className="mt-3 text-xs text-zinc-600">{project.techStack.join(" · ")}</p>
              </a>
            ))}
          </div>
        </section>

        {/* /stack colophon */}
        <section aria-label="Stack and education" className="mt-12 space-y-2 border-t border-zinc-800 pt-6 text-xs text-zinc-500">
          <p>
            <Key>stack:</Key> {RESUME_DATA.skills.join(" · ")}
          </p>
          <p>
            <Key>education:</Key>{" "}
            {RESUME_DATA.education.map((e) => `${e.school.includes("EPFL") ? "EPFL" : e.school} (${e.degree.split(" in ")[0]})`).join(" · ")}
          </p>
          <p>
            <Key>location:</Key> {RESUME_DATA.location}
          </p>
        </section>
      </div>
    </div>
  );
}
