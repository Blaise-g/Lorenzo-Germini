// PROTOTYPE Variant A — "Refined dossier" (issue #7).
// Conservative evolution of the current single-column CV: same visual language
// (Inter, existing theme tokens, cards), but the positioning brief applied:
// AI Product Engineer identity, writing in the hero + a Writing section second,
// older roles condensed into a compact timeline, essays as the primary CTA.

import React from "react";
import Image from "next/image";
import { ArrowRightIcon, MailIcon } from "lucide-react";
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
      <h2 className="text-accent font-mono text-[15px] font-semibold tracking-[0.18em] uppercase">
        {children}
      </h2>
      <div className="bg-accent/30 h-px w-12" />
    </div>
  );
}

export function VariantA() {
  const featured = RESUME_DATA.work.slice(0, FEATURED_ROLES);
  const earlier = RESUME_DATA.work.slice(FEATURED_ROLES);

  return (
    <div className="relative container mx-auto overflow-auto p-4 md:p-16">
      <section className="mx-auto w-full max-w-3xl space-y-14">
        {/* Hero */}
        <header className="flex items-start justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <p className="text-faint font-mono text-xs tracking-[0.2em] uppercase">
                AI Product Engineer · Turin, Italy
              </p>
              <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                {RESUME_DATA.name}
              </h1>
            </div>
            <p className="max-w-lg text-base leading-relaxed text-pretty">
              I turn frontier AI into shipped products — currently the AI engine
              behind a compliance platform — and{" "}
              <a
                href="#writing"
                className="text-accent font-medium underline underline-offset-4"
              >
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
                <Button
                  key={social.name}
                  className="size-8"
                  variant="ghost"
                  size="icon"
                  asChild
                >
                  <a
                    href={social.url}
                    aria-label={social.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {React.createElement(
                      social.icon as React.ComponentType<{ className: string }>,
                      { className: "h-4 w-4" },
                    )}
                  </a>
                </Button>
              ))}
            </div>
          </div>
          <div className="border-accent/20 relative hidden size-28 shrink-0 overflow-hidden rounded-full border-2 sm:block">
            <Image
              src={RESUME_DATA.avatarUrl}
              alt={RESUME_DATA.name}
              width={112}
              height={112}
              priority
              className="object-cover"
            />
          </div>
        </header>

        {/* Writing — second position, per positioning brief */}
        <section id="writing" className="space-y-4">
          <div className="flex items-end justify-between">
            <SectionHeading>Writing</SectionHeading>
            <a
              href="#"
              className="text-faint hover:text-accent text-sm hover:underline"
            >
              All essays →
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {PROTOTYPE_ESSAYS.map((essay) => (
              <a
                key={essay.title}
                href="#"
                className="group bg-ground hover:border-accent/50 flex flex-col justify-between rounded-lg border p-4 transition-colors"
              >
                <div className="space-y-2">
                  <div className="text-faint flex items-center gap-2 font-mono text-xs tracking-wider uppercase">
                    <span>{essay.tag}</span>
                    <span className="rounded-sm border px-1">{essay.lang}</span>
                  </div>
                  <h3 className="font-display group-hover:text-accent text-sm leading-snug font-semibold">
                    {essay.title}
                  </h3>
                  <p className="text-faint line-clamp-3 text-xs leading-relaxed">
                    {essay.excerpt}
                  </p>
                </div>
                <p className="text-faint mt-3 font-mono text-xs">
                  {essay.date} · {essay.readingMinutes} min
                </p>
              </a>
            ))}
          </div>
        </section>

        {/* About — arc → belief, compressed */}
        <section className="space-y-4">
          <SectionHeading>About</SectionHeading>
          <p className="text-body max-w-2xl text-base leading-relaxed text-pretty">
            Pharma manufacturing AI at GSK, AI R&amp;D in digital health,
            founding engineer at a GenAI startup, now building compliance AI at
            Complaion. Each step reinforced one belief: technical depth only
            matters when it connects to what&apos;s worth building.
          </p>
        </section>

        {/* Work — recent roles full, earlier ones condensed */}
        <section className="space-y-4">
          <SectionHeading>Work</SectionHeading>
          {featured.map((work) => (
            <Card
              key={`${work.company}-${work.start}`}
              className="card-hover border-l-border hover:border-l-accent border-l px-6 py-4"
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-x-2 text-base">
                  <h3 className="font-display inline-flex items-center gap-x-2 leading-none font-semibold">
                    {work.link ? (
                      <a
                        className="hover:underline"
                        href={work.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {work.company}
                      </a>
                    ) : (
                      <span>{work.company}</span>
                    )}
                    {work.badges.map((badge) => (
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        key={badge}
                      >
                        {badge}
                      </Badge>
                    ))}
                  </h3>
                  <div className="text-faint font-mono text-xs tabular-nums">
                    {work.start} – {work.end ?? "Present"}
                  </div>
                </div>
                <h4 className="text-faint font-mono text-xs leading-none">
                  {work.title}
                </h4>
              </CardHeader>
              <CardContent className="mt-2 text-sm">
                {(Array.isArray(work.description)
                  ? work.description
                  : [work.description]
                ).map((desc) => (
                  <p key={String(desc)} className="mb-1">
                    <span className="mr-2">•</span>
                    {desc}
                  </p>
                ))}
              </CardContent>
            </Card>
          ))}
          <div className="space-y-1 border-l pt-1 pl-6">
            {earlier.map((work) => (
              <p
                key={`${work.company}-${work.start}`}
                className="text-faint font-mono text-xs"
              >
                <span className="text-ink font-medium">{work.company}</span> —{" "}
                {work.title}{" "}
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
          <p className="text-faint pt-2 font-mono text-xs">
            Stack: {RESUME_DATA.skills.join(" · ")} — EPFL MSc, Life Sciences
            Engineering.
          </p>
        </section>
      </section>
    </div>
  );
}
