// PROTOTYPE Variant A — "Refined dossier" (issue #7).
// Conservative evolution of the current single-column CV: same visual language
// (Inter, existing theme tokens, cards), but the positioning brief applied:
// AI Product Engineer identity, writing in the hero + a Writing section second,
// older roles condensed into a compact timeline, essays as the primary CTA.

import React from "react";
import Image from "next/image";
import { ArrowRightIcon, GlobeIcon, MailIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RESUME_DATA } from "@/data/resume-data";
import { ProjectCard } from "@/components/project-card";
import { PROTOTYPE_ESSAYS } from "./writing-data";

const FEATURED_ROLES = 3; // full cards; the rest collapse into a one-line timeline

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h2 className="text-xl font-bold tracking-tight text-primary">{children}</h2>
      <div className="h-px w-12 bg-primary/30" />
    </div>
  );
}

export function VariantA() {
  const featured = RESUME_DATA.work.slice(0, FEATURED_ROLES);
  const earlier = RESUME_DATA.work.slice(FEATURED_ROLES);

  return (
    <main className="container relative mx-auto scroll-my-12 overflow-auto p-4 md:p-16">
      <section className="mx-auto w-full max-w-3xl space-y-14">
        {/* Hero */}
        <header className="flex items-start justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                AI Product Engineer · Turin, Italy
              </p>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {RESUME_DATA.name}
              </h1>
            </div>
            <p className="max-w-lg text-pretty text-base leading-relaxed">
              I turn frontier AI into shipped products — currently the AI engine
              behind a compliance platform — and{" "}
              <a href="#writing" className="font-medium text-primary underline underline-offset-4">
                write about tech, startups, and strategy
              </a>
              , in English and Italian.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button asChild size="sm">
                <a href="#writing">
                  Read the writing <ArrowRightIcon className="size-3.5" />
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`mailto:${RESUME_DATA.contact.email}`}>
                  <MailIcon className="size-3.5" /> Get in touch
                </a>
              </Button>
              {RESUME_DATA.contact.social.map((social) => (
                <Button key={social.name} className="size-8" variant="ghost" size="icon" asChild>
                  <a href={social.url} aria-label={social.name} target="_blank" rel="noopener noreferrer">
                    {React.createElement(
                      social.icon as React.ComponentType<{ className: string }>,
                      { className: "h-4 w-4" },
                    )}
                  </a>
                </Button>
              ))}
            </div>
          </div>
          <div className="relative hidden size-28 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 sm:block">
            <Image src={RESUME_DATA.avatarUrl} alt={RESUME_DATA.name} width={112} height={112} priority className="object-cover" />
          </div>
        </header>

        {/* Writing — second position, per positioning brief */}
        <section id="writing" className="space-y-4">
          <div className="flex items-end justify-between">
            <SectionHeading>Writing</SectionHeading>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline">
              All essays →
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {PROTOTYPE_ESSAYS.map((essay) => (
              <a
                key={essay.title}
                href="#"
                className="group flex flex-col justify-between rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>{essay.tag}</span>
                    <span className="rounded-sm border px-1">{essay.lang}</span>
                  </div>
                  <h3 className="text-sm font-semibold leading-snug group-hover:text-primary">
                    {essay.title}
                  </h3>
                  <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {essay.excerpt}
                  </p>
                </div>
                <p className="mt-3 font-mono text-[10px] text-muted-foreground">
                  {essay.date} · {essay.readingMinutes} min
                </p>
              </a>
            ))}
          </div>
        </section>

        {/* About — arc → belief, compressed */}
        <section className="space-y-4">
          <SectionHeading>About</SectionHeading>
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
            Pharma manufacturing AI at GSK, AI R&amp;D in digital health, founding
            engineer at a GenAI startup, now building compliance AI at Complaion.
            Each step reinforced one belief: technical depth only matters when it
            connects to what&apos;s worth building.
          </p>
        </section>

        {/* Work — recent roles full, earlier ones condensed */}
        <section className="space-y-4">
          <SectionHeading>Work</SectionHeading>
          {featured.map((work) => (
            <Card
              key={`${work.company}-${work.start}`}
              className="card-hover border-l border-l-border px-6 py-4 hover:border-l-[3px] hover:border-l-primary"
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-x-2 text-base">
                  <h3 className="inline-flex items-center gap-x-2 font-semibold leading-none">
                    {work.link ? (
                      <a className="hover:underline" href={work.link} target="_blank" rel="noopener noreferrer">
                        {work.company}
                      </a>
                    ) : (
                      <span>{work.company}</span>
                    )}
                    {work.badges.map((badge) => (
                      <Badge variant="secondary" className="text-xs" key={badge}>
                        {badge}
                      </Badge>
                    ))}
                  </h3>
                  <div className="text-sm tabular-nums text-muted-foreground">
                    {work.start} – {work.end ?? "Present"}
                  </div>
                </div>
                <h4 className="text-sm leading-none text-muted-foreground">{work.title}</h4>
              </CardHeader>
              <CardContent className="mt-2 text-sm">
                {(Array.isArray(work.description) ? work.description : [work.description]).map(
                  (desc) => (
                    <p key={String(desc)} className="mb-1">
                      <span className="mr-2">•</span>
                      {desc}
                    </p>
                  ),
                )}
              </CardContent>
            </Card>
          ))}
          <div className="space-y-1 border-l pl-6 pt-1">
            {earlier.map((work) => (
              <p key={`${work.company}-${work.start}`} className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{work.company}</span> — {work.title}{" "}
                <span className="tabular-nums">
                  ({work.start}–{work.end ?? "Present"})
                </span>
              </p>
            ))}
          </div>
        </section>

        {/* Projects + technical credibility */}
        <section className="space-y-4">
          <SectionHeading>Projects</SectionHeading>
          <div className="-mx-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {RESUME_DATA.projects.map((project) => (
              <ProjectCard
                key={project.title}
                title={project.title}
                description={project.description}
                tags={project.techStack}
                link={"link" in project ? project.link?.href : undefined}
              />
            ))}
          </div>
          <p className="pt-2 font-mono text-xs text-muted-foreground">
            Stack: {RESUME_DATA.skills.join(" · ")} — EPFL MSc, Life Sciences Engineering.
          </p>
        </section>

        <footer className="border-t pt-6 text-sm text-muted-foreground">
          <a href={RESUME_DATA.locationLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
            <GlobeIcon className="size-3" /> {RESUME_DATA.location}
          </a>
        </footer>
      </section>
    </main>
  );
}
